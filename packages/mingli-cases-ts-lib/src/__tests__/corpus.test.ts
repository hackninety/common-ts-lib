import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  buildCasePrompt, getCaseIndex, getCollections, getSources, getStats,
  loadCase, loadCaseAnswers, loadReferenceCharts,
} from '../index.js';
import type { CaseAnswers } from '../types.js';

const upstream = fileURLToPath(new URL('../../docs/upstream/baziqa/', import.meta.url));
const readJson = (path: string) => JSON.parse(readFileSync(`${upstream}${path}`, 'utf8'));
const forbiddenPracticeFields = /"(?:answer|answers|primaryAnswer|acceptedAnswers|accepted_answers|knownEvents|notes|categories)"\s*:/;

describe('pinned source and normalized corpus', () => {
  it('verifies every original file against the frozen blob hashes', () => {
    const snapshot = readJson('snapshot.json');
    expect(snapshot.revision).toBe('3bad3deaa5aa3a191c9c68b4d8b17f46decff45e');
    expect(snapshot.files).toHaveLength(156);
    for (const file of snapshot.files) {
      const bytes = readFileSync(`${upstream}${file.path}`);
      expect(bytes.length, file.path).toBe(file.bytes);
      expect(createHash('sha256').update(bytes).digest('hex'), file.path).toBe(file.sha256);
    }
    expect(getSources()[0].license.notice).toContain('Commercial use');
  });

  it('preserves all 167 people and 1043 questions with collision-safe IDs and exact source text', async () => {
    const ids = new Set<string>(), questionIds = new Set<string>();
    let questionCount = 0;
    for (const collection of getCollections().filter((item) => item.sourceId === 'baziqa')) {
      const rows = readJson(collection.rawPath);
      const persons = rows[0].person_id ? rows : rows.slice(1);
      expect(persons).toHaveLength(collection.caseCount);
      for (const person of persons) {
        const id = `baziqa/${collection.id}/${person.person_id}`;
        expect(ids.has(id)).toBe(false); ids.add(id);
        const study = await loadCase(id);
        const answers = await loadCaseAnswers(id);
        expect(study?.answerVisibility).toBe('hidden');
        expect(answers?.answerVisibility).toBe('included');
        expect(study?.profile.birth.raw).toBe(person.profile.birth.raw ?? null);
        expect(study?.context).toEqual(person.context ?? []);
        expect(study?.meta.methodRaw).toBe(person.setter?.method ?? null);
        expect(JSON.stringify(study)).not.toMatch(forbiddenPracticeFields);
        expect(study?.questions).toHaveLength(person.questions.length);
        for (const [position, original] of person.questions.entries()) {
          const question = study!.questions[position];
          expect(questionIds.has(question.id)).toBe(false); questionIds.add(question.id);
          expect(question.prompt).toBe(original.question);
          expect(question.options.map((option) => option.raw)).toEqual(original.options);
          expect(answers!.answers[position].acceptedAnswers).toEqual(original.accepted_answers ?? [original.answer]);
          questionCount++;
        }
      }
    }
    expect(ids.size).toBe(167);
    expect(questionIds.size).toBe(1043);
    expect(questionCount).toBe(1043);
    expect(getCollections().filter((item) => item.sourceId === 'baziqa')).toHaveLength(18);
    expect(getCaseIndex({ sourceId: 'baziqa' })).toHaveLength(167);
    expect(getStats().questions).toBeGreaterThanOrEqual(1043);
  });

  it('keeps original methods and unknown provenance distinct from available reference charts', async () => {
    const baziqa = getCaseIndex({ sourceId: 'baziqa' });
    const totals = (field: 'method' | 'answerSource') => baziqa.reduce<Record<string, number>>((counts, item) => {
      counts[item[field]] = (counts[item[field]] ?? 0) + item.questionCount; return counts;
    }, {});
    expect(totals('method')).toEqual({ bazi: 290, ziwei: 130, qimen: 11, unknown: 612 });
    expect(totals('answerSource')).toEqual({ official: 365, secondary: 190, unspecified: 488 });
    expect(getCaseIndex({ sourceId: 'baziqa', collectionId: 'celebrity50_zh', method: 'unknown' })).toHaveLength(50);
    const unknown = getCaseIndex({ sourceId: 'baziqa', year: 2022, method: 'unknown' });
    expect(unknown).toHaveLength(7);
    expect((await loadReferenceCharts(unknown[0].id))?.status).toBe('upstream-reference');
    let charts = 0;
    for (const item of baziqa) {
      const reference = await loadReferenceCharts(item.id);
      if (reference) {
        expect(reference.engine).toEqual({ bazi: 'lunar-python 1.4.8', ziwei: 'iztro 2.5.8' });
        expect(reference.conventions.dayRollover).toBe('23:00');
        expect(reference.defaultTimeConvention).toBe('stated');
        const original = readJson(`charts/bazi/${item.collectionId}.json`);
        expect(reference.bazi).toEqual(original.charts[item.personId]);
        charts++;
      }
    }
    expect(charts).toBe(117);
  });

  it('preserves accepted multi-answers and unknown/approximate birth data', async () => {
    const multi = await loadCaseAnswers('baziqa/hkjfma_2015/2015_C4_male_19740813');
    expect(multi?.answers.find((answer) => answer.questionId.endsWith('-Q18'))?.acceptedAnswers).toEqual(['B', 'D']);
    const unknownHour = await loadCase('baziqa/hkjfma_2013/2013_C4_female_19700814');
    expect(unknownHour?.profile.birth).toMatchObject({ hour: null, minute: null, approximate: null, timePrecision: 'unknown', utcOffset: null });
    const us = await loadCase('baziqa/contest8_2022/male_19740428_P017');
    expect(us?.profile.birth).toMatchObject({ hour: 16, minute: 40, timezone: null, utcOffset: null, dst: null });
    const branch = await loadCase('baziqa/hkjfma_2010/2010_C1_female_19820927');
    expect(branch?.profile.birth).toMatchObject({ hour: 16, timeRaw: '申时', timePrecision: 'branch', approximate: true });
    let unknownTimezones = 0;
    for (const item of getCaseIndex({ sourceId: 'baziqa' })) if ((await loadCase(item.id))?.profile.birth.timezone === null) unknownTimezones++;
    expect(unknownTimezones).toBe(58);
  });
});

describe('practice/reveal boundary', () => {
  it('does not derive topics or searches from known events, curator notes or answer payloads', async () => {
    const id = 'baziqa/celebrity50_zh/bill_gates_P008';
    const study = await loadCase(id);
    const answers = await loadCaseAnswers(id);
    expect(answers!.knownEvents['健康'].length).toBeGreaterThan(0);
    expect(study!.meta.topics).not.toContain('health');
    expect(study!.meta.topicOrigin).toBe('derived-question-keywords');
    const onlyInEvents = answers!.knownEvents['健康'][0];
    expect(getCaseIndex({ query: onlyInEvents }).some((item) => item.id === id)).toBe(false);
    expect(getCaseIndex({ query: study!.questions[0].prompt }).some((item) => item.id === id)).toBe(true);
  });

  it('never serializes answer-only fields into default practice input, even if a host supplies them', async () => {
    const study = (await loadCase(getCaseIndex()[0].id))!;
    const answers: CaseAnswers = { ...(await loadCaseAnswers(study.meta.id))!, notes: ['ANSWER-ONLY-SENTINEL'], knownEvents: { 健康: ['EVENT-ONLY-SENTINEL'] } };
    const augmented = { ...study, answer: 'ANSWER-ONLY-SENTINEL', notes: ['NOTE-ONLY-SENTINEL'], knownEvents: { 健康: ['EVENT-ONLY-SENTINEL'] } };
    const plain = buildCasePrompt(study);
    const accidental = buildCasePrompt(augmented, { answers });
    expect(accidental).toBe(plain);
    expect(accidental).not.toMatch(/ANSWER-ONLY-SENTINEL|EVENT-ONLY-SENTINEL|NOTE-ONLY-SENTINEL|显式揭晓/);
    const reference = buildCasePrompt(study, { mode: 'reference', answers });
    expect(reference).toContain('ANSWER-ONLY-SENTINEL');
    expect(reference).toContain('EVENT-ONLY-SENTINEL');
    expect(reference).toContain('不得把该命主');
    expect(reference).toContain('当前求测人的事实或预测');
    const short = buildCasePrompt(study, { mode: 'reference', answers, maxChars: 512 });
    expect(short.length).toBeLessThanOrEqual(512);
    expect(short).toContain('不得把该命主');
    expect(short).toContain('已截断');
    expect(() => buildCasePrompt(study, { mode: 'reference', answers: { ...answers, caseId: 'different' } })).toThrow('different case');
  });

  it('keeps answer-bearing fields out of every generated practice and index chunk', () => {
    const generated = fileURLToPath(new URL('../generated/', import.meta.url));
    const files = readdirSync(generated).filter((file) => file.startsWith('cases-') || file === 'index.ts');
    expect(files.length).toBeGreaterThanOrEqual(19);
    for (const file of files) expect(readFileSync(`${generated}${file}`, 'utf8'), file).not.toMatch(forbiddenPracticeFields);
    const main = readFileSync(fileURLToPath(new URL('../index.ts', import.meta.url)), 'utf8');
    expect(main).not.toMatch(/from ['"].*answers-/);
  });

  it('shows precision and timezone uncertainty, keeps caller mutations isolated and rejects unknown IDs', async () => {
    const id = 'baziqa/contest8_2022/male_19740428_P017';
    const study = (await loadCase(id))!;
    const prompt = buildCasePrompt(study, { mode: 'reference' });
    expect(prompt).toContain('时区：未知');
    expect(prompt).toContain('精度：minute');
    study.questions[0].prompt = 'MUTATION';
    expect((await loadCase(id))!.questions[0].prompt).not.toBe('MUTATION');
    const branch = (await loadCase('baziqa/hkjfma_2010/2010_C1_female_19820927'))!;
    expect(buildCasePrompt(branch)).toContain('不应当作精确出生分钟');
    expect(await loadCase('unknown')).toBeUndefined();
    expect(await loadCaseAnswers('unknown')).toBeUndefined();
    expect(await loadReferenceCharts('unknown')).toBeUndefined();
  });

  it('compiles a second canonical source with manual topics, duplicate names/birthdays and a narrative-only raw chart', () => {
    const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
    const fixture = mkdtempSync(join(tmpdir(), 'mingli-cases-fixture-'));
    const liveIndexPath = join(packageRoot, 'src/generated/index.ts');
    const originalIndex = readFileSync(liveIndexPath, 'utf8');
    try {
      const inputs = join(fixture, 'inputs'), generated = join(fixture, 'src/generated');
      mkdirSync(inputs, { recursive: true }); mkdirSync(generated, { recursive: true });
      writeFileSync(join(fixture, 'package.json'), '{"type":"module"}\n');
      const document = JSON.parse(readFileSync(join(packageRoot, 'docs/templates/canonical-collection.json'), 'utf8'));
      const twin = structuredClone(document.cases[0]);
      twin.personId = 'person-002'; twin.title = '同名且同生日的案例';
      Object.assign(twin.birth, { year: 1980, month: 1, day: 1 });
      const otherTwin = structuredClone(twin); otherTwin.personId = 'person-003';
      document.cases.push(twin, otherTwin);
      writeFileSync(join(inputs, 'example-source--example-collection.json'), JSON.stringify(document));
      for (const [sourceId, collectionId, title] of [['a--b', 'c', '第一份独立命例'], ['a', 'b--c', '第二份独立命例']]) {
        const collision = structuredClone(document);
        collision.source.id = sourceId;
        collision.source.snapshotPath = `docs/upstream/${sourceId}/snapshot.json`;
        collision.collection.id = collectionId;
        collision.cases = [structuredClone(document.cases[0])];
        collision.cases[0].title = title;
        delete collision.cases[0].answerData;
        // Unknown source metadata must not enter the eager index.
        collision.source.knownEvents = { health: ['INDEX-LEAK-SENTINEL'] };
        writeFileSync(join(inputs, `${sourceId.length}-${sourceId}-${collectionId}.json`), JSON.stringify(collision));
      }
      execFileSync(process.execPath, ['scripts/gen-data.mjs'], {
        cwd: packageRoot, windowsHide: true,
        env: { ...process.env, MINGLI_CASES_INPUT_DIR: inputs, MINGLI_CASES_OUTPUT_DIR: generated },
      });
      for (const file of ['index.ts', 'types.ts', 'prompt.ts']) copyFileSync(join(packageRoot, 'src', file), join(fixture, 'src', file));
      const compiler = createRequire(import.meta.url).resolve('typescript/bin/tsc');
      execFileSync(process.execPath, [compiler, '--target', 'ES2020', '--module', 'ESNext', '--moduleResolution', 'bundler', '--skipLibCheck',
        '--outDir', join(fixture, 'dist'), '--rootDir', join(fixture, 'src'), join(fixture, 'src/index.ts')], { cwd: packageRoot, windowsHide: true });
      const moduleUrl = pathToFileURL(join(fixture, 'dist/index.js')).href;
      const outcome = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `
        import * as api from ${JSON.stringify(moduleUrl)};
        const index=api.getCaseIndex({sourceId:'example-source'});
        const study=await api.loadCase('example-source/example-collection/person-001');
        const answers=await api.loadCaseAnswers(study.meta.id);
        const prompt=api.buildCasePrompt(study);
        const collisionStudies=await Promise.all(['a--b/c/person-001','a/b--c/person-001'].map(id=>api.loadCase(id)));
        console.log(JSON.stringify({stats:api.getStats(),baziqa:api.getCaseIndex({sourceId:'baziqa'}).length,
          index,study,answers,prompt,collisionStudies,withoutAnswers:await api.loadCaseAnswers(collisionStudies[0].meta.id),
          noAnswerReference:api.buildCasePrompt(collisionStudies[0],{mode:'reference'}),
          reference:api.buildCasePrompt(study,{mode:'reference',answers,maxChars:512})}));
      `], { cwd: fixture, encoding: 'utf8', windowsHide: true }));
      expect(outcome.stats).toMatchObject({ sources: 4, collections: 21, cases: 172, questions: 1043 });
      expect(outcome.collisionStudies.map((study: {meta: {title: string}}) => study.meta.title)).toEqual(['第一份独立命例', '第二份独立命例']);
      expect(outcome.withoutAnswers).toBeUndefined();
      expect(outcome.noAnswerReference).toContain('第一份独立命例');
      expect(outcome.noAnswerReference).toContain('不得把该命主');
      expect(readFileSync(join(generated, 'index.ts'), 'utf8')).not.toContain('INDEX-LEAK-SENTINEL');
      expect(outcome.baziqa).toBe(167);
      expect(outcome.index).toHaveLength(3);
      expect(new Set(outcome.index.map((item: { id: string }) => item.id)).size).toBe(3);
      expect(outcome.index.every((item: { topicOrigin: string }) => item.topicOrigin === 'manual')).toBe(true);
      expect(outcome.study.questions).toEqual([]);
      expect(outcome.study.profile.birth.year).toBeNull();
      expect(outcome.prompt).toContain('未记载公历日期');
      expect(outcome.prompt).toContain('甲子年 丙寅月 戊辰日 庚申时');
      expect(outcome.prompt).not.toContain('null');
      expect(outcome.prompt).not.toContain('虚构事验示例');
      expect(outcome.answers.knownEvents['事业'][0]).toContain('虚构事验示例');
      expect(outcome.reference).toContain('不得把该命主');
      expect(outcome.reference).toContain('https://example.invalid/cases/person-001');
      expect(outcome.reference).toContain('example-v1');
      expect(readFileSync(liveIndexPath, 'utf8')).toBe(originalIndex);
    } finally {
      expect(resolve(fixture).startsWith(`${resolve(tmpdir())}${sep}`)).toBe(true);
      rmSync(fixture, { recursive: true, force: true });
    }
  }, 20000);
});
