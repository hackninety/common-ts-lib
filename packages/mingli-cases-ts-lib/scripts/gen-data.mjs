import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeCanonical } from './canonical.mjs';
import { verifyCanonicalSnapshot } from './snapshot.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const upstream = join(root, 'docs/upstream/baziqa');
// Test/ingestion tooling can compile candidate collections without changing the real corpus.
const generated = resolve(process.env.MINGLI_CASES_OUTPUT_DIR ?? join(root, 'src/generated'));
const snapshot = JSON.parse(readFileSync(join(upstream, 'snapshot.json'), 'utf8'));
for (const file of snapshot.files) {
  const bytes = readFileSync(join(upstream, file.path));
  assert.equal(bytes.length, file.bytes, `Upstream byte length changed: ${file.path}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, `Upstream snapshot changed: ${file.path}`);
}
mkdirSync(generated, { recursive: true });
for (const file of readdirSync(generated)) {
  if (/^(?:(?:cases|answers|charts)-.+|index|loaders)\.ts$/.test(file)) unlinkSync(join(generated, file));
}
const json = (path) => JSON.parse(readFileSync(join(upstream, path), 'utf8'));
const moduleFile = (name, data) => writeFileSync(join(generated, `${name}.ts`), `// Generated from the pinned, verified upstream snapshot.\nexport const data: unknown = ${JSON.stringify(data)};\n`);
const urls = (text) => [...new Set((text ?? '').match(/https?:\/\/[^\s<>「」（）\u3000-\u303f\u4e00-\u9fff]+/g) ?? [])];
const methodRules = new Map([
  ['八字', 'bazi'], ['子平八字', 'bazi'], ['盲派八字', 'bazi'], ['四柱八字', 'bazi'],
  ['紫微斗数', 'ziwei'], ['紫微斗数（紫微玄机）', 'ziwei'], ['紫微斗数（陆斌兆派）', 'ziwei'], ['紫微斗数（天盘计算）', 'ziwei'],
  ['奇门遁甲', 'qimen'],
]);
const topicRules = [
  ['relationship', /婚|恋|感情|配偶|姻缘|姻緣|男朋友|女朋友|伴侣|伴侶/],
  ['wealth', /财|財|富|钱|錢|资产|資產|投资|投資|破产|破產|收入|保险|保險|楼|樓/],
  ['family', /父|母|祖|兄|弟|姐|妹|儿子|兒子|女儿|女兒|子女|六亲|六親|家境|家庭/],
  ['career', /事业|事業|职业|職業|工作|升职|升職|任职|任職|创业|創業|失业|失業|退休|公司|仕途/],
  ['health', /健康|病|手术|手術|伤|傷|事故|意外|死亡|过世|過世|仙逝|身故|失明|残|殘/],
  ['education', /学历|學歷|学业|學業|学校|學校|毕业|畢業|读书|讀書|考试|考試|留学|留學|中学|中學|大学|大學|教育/],
  ['timing', /出生.*(?:时辰|時辰|时间|時間)|(?:时辰|時辰).*(?:出生|正确|正確)|定盘|定盤/],
];
const topicsFor = (stems) => {
  const topics = topicRules.filter(([, pattern]) => pattern.test(stems)).map(([id]) => id);
  return topics.length ? topics : ['unknown'];
};
const timePrecision = (birth) => birth.hour == null ? 'unknown'
  : /[子丑寅卯辰巳午未申酉戌亥][时時]/.test(birth.time_raw ?? '') ? 'branch'
    : birth.approximate === true ? 'approximate-clock' : 'minute';
const sources = [{
  id: snapshot.sourceId, title: 'BaziQA 命理推理题库', url: snapshot.sourceUrl, revision: snapshot.revision,
  license: {
    code: 'MIT', content: 'Contest questions remain copyrighted by HKJFMA and individual setters; upstream includes them for research use.',
    notice: 'MIT applies to upstream transcription, metadata and code. Commercial use of contest question text requires contacting the organizer. Celebrity claims lack per-event source citations.',
  },
  attribution: 'BaziQA: Jiangxi Chen and Qian Liu; contest questions: 香港青年術數家協會及各出题老师',
  snapshotPath: 'docs/upstream/baziqa/snapshot.json',
}];
const collections = [], index = [], search = {};
const caseLoaders = [], answerLoaders = [], chartLoaders = [];
const ids = new Set(), questionIds = new Set();
for (const file of readdirSync(join(upstream, 'data')).filter((name) => name.endsWith('.json')).sort()) {
  const rows = json(`data/${file}`);
  const originalMeta = rows[0].person_id ? null : rows.shift();
  const collectionId = file.replace(/\.json$/, '');
  const answerSource = originalMeta?.answer_source ?? 'unspecified';
  const year = originalMeta ? Number(originalMeta.current_year) : null;
  const questionSources = urls(originalMeta?.sources?.questions);
  const collection = {
    id: collectionId, sourceId: 'baziqa', title: originalMeta?.title ?? 'Celebrity50 名人案例',
    kind: originalMeta ? 'contest' : 'celebrity', year, caseCount: rows.length,
    questionCount: rows.reduce((sum, person) => sum + person.questions.length, 0), answerSource,
    rawPath: `data/${file}`, questionSources, answerSources: urls(originalMeta?.sources?.answers),
    scoring: originalMeta?.scoring ?? null,
  };
  if (originalMeta) assert.equal(collection.questionCount, originalMeta.total_questions, `Question count mismatch: ${file}`);
  collections.push(collection);
  const baziFile = `charts/bazi/${file}`, ziweiFile = `charts/ziwei/${file}`;
  const bazi = existsSync(join(upstream, baziFile)) ? json(baziFile) : null;
  const ziwei = existsSync(join(upstream, ziweiFile)) ? json(ziweiFile) : null;
  const cases = [], answers = [], charts = [];
  for (const person of rows) {
    const id = `baziqa/${collectionId}/${person.person_id}`;
    assert(!ids.has(id), `Duplicate case ID: ${id}`); ids.add(id);
    const stems = person.questions.map((question) => question.question).join('\n');
    const topics = topicsFor(stems);
    const birth = person.profile.birth;
    const precision = timePrecision(birth);
    const meta = {
      id, sourceId: 'baziqa', collectionId, personId: person.person_id, title: person.name, year,
      gender: person.profile.gender ?? 'unknown', method: methodRules.get(person.setter?.method) ?? 'unknown',
      methodRaw: person.setter?.method ?? null, topics,
      topicOrigin: topics[0] === 'unknown' ? 'unclassified' : 'derived-question-keywords',
      questionCount: person.questions.length, answerSource, timePrecision: precision,
      timezoneKnown: Boolean(birth.timezone), hasReferenceCharts: Boolean(bazi?.charts[person.person_id] || ziwei?.charts[person.person_id]),
    };
    index.push(meta);
    search[id] = `${person.name}\n${birth.place ?? ''}\n${stems}`.toLocaleLowerCase();
    const provenance = { sourceUrl: snapshot.sourceUrl, documentUrl: `${snapshot.sourceUrl}/blob/${snapshot.revision}/data/${file}`, revision: snapshot.revision, rawPath: `data/${file}`, questionSources };
    const caseAnswers = [];
    const questions = person.questions.map((question) => {
      const questionId = `${id}/${question.question_id}`;
      assert(!questionIds.has(questionId), `Duplicate question ID: ${questionId}`); questionIds.add(questionId);
      const options = question.options.map((raw) => {
        const match = raw.match(/^([A-Z])[.、．。:：)]\s*([\s\S]*)$/);
        assert(match, `Unrecognized option label: ${questionId}: ${raw}`);
        return { label: match[1], text: match[2], raw };
      });
      const acceptedAnswers = question.accepted_answers ?? [question.answer];
      assert(acceptedAnswers.length > 0 && acceptedAnswers.every((answer) => options.some((option) => option.label === answer)), `Invalid answer: ${questionId}`);
      assert(acceptedAnswers.includes(question.answer), `Primary answer not accepted: ${questionId}`);
      caseAnswers.push({ questionId, primaryAnswer: question.answer, acceptedAnswers, note: question.answer_note ?? null });
      return { id: questionId, sourceQuestionId: question.question_id, number: question.question_no ?? null, prompt: question.question, options, topics: topicsFor(question.question) };
    });
    cases.push({ answerVisibility: 'hidden', meta, profile: { gender: meta.gender, birth: {
      year: birth.year, month: birth.month, day: birth.day, hour: birth.hour ?? null, minute: birth.minute ?? null,
      place: birth.place ?? null, approximate: birth.approximate ?? null, timeRaw: birth.time_raw ?? null,
      raw: birth.raw ?? null, timePrecision: precision, timezone: birth.timezone ?? null,
      utcOffset: birth.utc_offset ?? null, dst: birth.dst ?? null,
    } }, context: person.context ?? [], questions, provenance });
    answers.push({ answerVisibility: 'included', caseId: id, answerSource, answers: caseAnswers, knownEvents: person.categories ?? {}, notes: person.notes ?? [], provenance });
    if (meta.hasReferenceCharts) charts.push({
      caseId: id, status: 'upstream-reference', engine: bazi?.engine ?? ziwei.engine,
      defaultTimeConvention: bazi?.default_time_convention ?? ziwei.default_time_convention,
      bazi: bazi?.charts[person.person_id] ?? null, ziwei: ziwei?.charts[person.person_id] ?? null,
      conventions: { dayRollover: '23:00', note: '上游 v2.3.0 使用 stated 口径；原时辰保留，钟点扣夏令时；clock/true_solar 和晚子时差异在原始参考盘内保留。不是宿主重新排盘的结果。' },
      provenance,
    });
  }
  moduleFile(`cases-${collectionId}`, cases);
  moduleFile(`answers-${collectionId}`, answers);
  caseLoaders.push(`  'baziqa/${collectionId}': () => import('./cases-${collectionId}.js'),`);
  answerLoaders.push(`  'baziqa/${collectionId}': () => import('./answers-${collectionId}.js'),`);
  if (charts.length) {
    moduleFile(`charts-${collectionId}`, charts);
    chartLoaders.push(`  'baziqa/${collectionId}': () => import('./charts-${collectionId}.js'),`);
  }
}
// This pinned upstream snapshot has its own anchors; additional sources do not change them.
assert.equal(index.length, 167, 'Pinned BaziQA snapshot case count changed');
assert.equal(index.reduce((sum, item) => sum + item.questionCount, 0), 1043, 'Pinned BaziQA snapshot question count changed');
const canonicalDirectory = resolve(process.env.MINGLI_CASES_INPUT_DIR ?? join(root, 'data/collections'));
for (const file of existsSync(canonicalDirectory) ? readdirSync(canonicalDirectory).filter((name) => name.endsWith('.json')).sort() : []) {
  const normalized = normalizeCanonical(JSON.parse(readFileSync(join(canonicalDirectory, file), 'utf8')));
  const { source, collection } = normalized;
  verifyCanonicalSnapshot(root, source, collection);
  const existingSource = sources.find((item) => item.id === source.id);
  if (existingSource) assert.deepEqual(existingSource, source, `Conflicting source metadata: ${source.id}`);
  else sources.push(source);
  assert(!collections.some((item) => item.sourceId === source.id && item.id === collection.id), `Duplicate collection: ${source.id}/${collection.id}`);
  collections.push(collection);
  for (const item of normalized.index) { assert(!ids.has(item.id), `Duplicate case ID: ${item.id}`); ids.add(item.id); index.push(item); }
  for (const study of normalized.cases) for (const question of study.questions) { assert(!questionIds.has(question.id), `Duplicate question ID: ${question.id}`); questionIds.add(question.id); }
  Object.assign(search, normalized.search);
  // Prefix canonical filenames with source ID; different sources can reuse collection names.
  // A length-prefixed source ID keeps a--b/c distinct from a/b--c.
  const key = `${source.id}/${collection.id}`, filename = `canonical-${source.id.length}-${source.id}--${collection.id}`;
  for (const [kind, records, loaders] of [['cases', normalized.cases, caseLoaders], ['answers', normalized.answers, answerLoaders], ['charts', normalized.charts, chartLoaders]]) {
    if (kind === 'charts' && !records.length) continue;
    moduleFile(`${kind}-${filename}`, records);
    loaders.push(`  '${key}': () => import('./${kind}-${filename}.js'),`);
  }
}
const stats = {
  sources: sources.length, collections: collections.length, cases: index.length,
  questions: index.reduce((sum, item) => sum + item.questionCount, 0),
  casesByMethod: Object.fromEntries(['bazi', 'ziwei', 'qimen', 'unknown'].map((method) => [method, index.filter((item) => item.method === method).length])),
  questionsByMethod: Object.fromEntries(['bazi', 'ziwei', 'qimen', 'unknown'].map((method) => [method, index.filter((item) => item.method === method).reduce((sum, item) => sum + item.questionCount, 0)])),
  questionsByAnswerSource: Object.fromEntries(['official', 'secondary', 'unspecified'].map((source) => [source, index.filter((item) => item.answerSource === source).reduce((sum, item) => sum + item.questionCount, 0)])),
};
moduleFile('index', { sources, collections, index, search, stats });
writeFileSync(join(generated, 'loaders.ts'), [
  '// Generated lazy imports. Answers and reference charts are never loaded by loadCase.',
  'type Loaders = Record<string, () => Promise<{ data: unknown }>>;',
  `export const caseLoaders: Loaders = {\n${caseLoaders.join('\n')}\n};`,
  `export const answerLoaders: Loaders = {\n${answerLoaders.join('\n')}\n};`,
  `export const chartLoaders: Loaders = {\n${chartLoaders.join('\n')}\n};`,
].join('\n') + '\n');
console.log(`Generated ${stats.collections} collections, ${stats.cases} cases, ${stats.questions} questions; raw snapshots verified.`);
