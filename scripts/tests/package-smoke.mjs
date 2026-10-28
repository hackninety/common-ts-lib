// Copied into an OS-temp consumer project; never imports source/workspace files.
import assert from 'node:assert/strict';
import { lstat, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(await readFile('artifact.json', 'utf8'));
const directory = join(process.cwd(), 'node_modules', pkg.name);
assert(!(await lstat(directory)).isSymbolicLink(), 'Package must be extracted, not workspace-linked');
assert((await realpath(directory)).startsWith(`${await realpath(process.cwd())}${sep}`));
const installed = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
const lockfile = JSON.parse(await readFile('package-lock.json', 'utf8'));
const runtimeDependencies = Object.fromEntries(Object.keys(installed.dependencies ?? {}).map((name) => {
  const version = lockfile.packages[`node_modules/${name}`]?.version;
  assert(version, `Runtime dependency missing from isolated installation: ${name}`);
  return [name, version];
}));
assert.equal(installed.name, pkg.name);
assert.equal(installed.version, pkg.version);
assert.deepEqual(installed.exports, pkg.exports);
for (const file of pkg.files) {
  const target = resolve(directory, file.path);
  assert(target.startsWith(`${directory}${sep}`), `Invalid packed path: ${file.path}`);
  assert.equal((await stat(target)).size, file.size, `Missing or truncated file: ${file.path}`);
}

const modules = {};
for (const subpath of Object.keys(pkg.exports)) {
  const specifier = subpath === '.' ? pkg.name : `${pkg.name}/${subpath.slice(2)}`;
  const resolved = fileURLToPath(import.meta.resolve(specifier));
  assert(resolved.startsWith(`${directory}${sep}`), `${specifier} resolved outside the installed package`);
  modules[subpath] = await import(specifier);
  assert(Object.keys(modules[subpath]).length > 0, `${specifier} has no runtime exports`);
}
const entry = modules['.'];
const counts = {};

async function checkDocs(api) {
  const manifest = api.getDocsManifest();
  assert(manifest.length > 0, 'Document manifest is empty');
  // All documents are checked: this also exercises every lazy book chunk.
  for (const doc of manifest) {
    const body = await api.getDocMarkdown(doc.path);
    assert(typeof body === 'string' && body.trim().length > 0, `Document payload missing: ${doc.path}`);
  }
  assert.equal(await api.getDocMarkdown('__unknown__/missing.md'), undefined);
  counts.documents = manifest.length;
}

switch (pkg.name) {
  case 'mingli-cases-react': {
    assert.equal(typeof entry.MingliCaseLibrary, 'function');
    const code = await readFile(join(directory, 'dist/index.js'), 'utf8');
    assert(!/from\s*['"]mingli-cases-ts-lib/.test(code), 'UI package must not eagerly import the corpus');
    counts.sharedReactPanels = 1;
    break;
  }
  case 'mingli-cases-ts-lib': {
    const index = entry.getCaseIndex();
    assert.equal(index.length, entry.getStats().cases);
    assert.equal(new Set(index.map(item => item.id)).size, index.length);
    const baziqa = index.filter(item => item.sourceId === 'baziqa');
    assert.equal(baziqa.length, 167);
    assert.equal(baziqa.reduce((sum, item) => sum + item.questionCount, 0), 1043);
    assert.equal(baziqa.filter(item => item.timePrecision === 'unverified-clock').length, 44);
    assert.equal(baziqa.filter(item => item.timePrecision === 'interval-midpoint').length, 4);
    let questionCount = 0;
    let chartsCount = 0;
    let baziCharts = 0;
    let ziweiCharts = 0;
    let baziqaCharts = 0;
    for (const item of index) {
      const study = await entry.loadCase(item.id);
      assert(study && study.meta.id === item.id);
      assert(!('answers' in study) && !('knownEvents' in study));
      assert(study.questions.every(question => !('answer' in question) && !('acceptedAnswers' in question)));
      const answers = await entry.loadCaseAnswers(item.id);
      if (answers) {
        assert.equal(answers.caseId, item.id);
        assert(answers.answers.every(answer => study.questions.some(question => question.id === answer.questionId)));
      }
      if (item.sourceId === 'baziqa') assert.equal(answers?.answers.length, study.questions.length);
      const practice = entry.buildCasePrompt(study);
      if (['unverified-clock', 'interval-midpoint'].includes(item.timePrecision)) {
        assert(study.profile.birth.birthNotes.length > 0, 'Birth uncertainty must be public before reveal');
        assert(practice.includes(item.timePrecision === 'unverified-clock' ? '不能当作准确出生时刻' : '不能当作精确出生分钟'));
      }
      assert(!entry.buildCasePrompt(study, {mode:'reference'}).includes('显式揭晓的原资料答案'), 'Default reference omits answers');
      assert.equal(entry.buildCasePrompt(study, {mode:'practice', answers}), practice, 'Practice ignores supplied answers');
      assert(entry.buildCasePrompt(study, {mode:'reference', answers}).length > 0);
      if (item.hasReferenceCharts) {
        const charts = await entry.loadReferenceCharts(item.id);
        assert(charts?.bazi || charts?.ziwei);
        if (item.sourceId === 'baziqa') {
          baziqaCharts++;
          if (charts.bazi) baziCharts++;
          if (charts.ziwei) ziweiCharts++;
          if (study.profile.birth.hour === null) assert.equal(charts.ziwei, null, 'Missing birth hour must not become a fabricated Zi Wei chart');
        }
        chartsCount++;
      }
      questionCount += study.questions.length;
    }
    assert.equal(questionCount, entry.getStats().questions);
    assert.equal(baziqaCharts, 117);
    assert.equal(baziCharts, 117);
    assert.equal(ziweiCharts, 116);
    assert.equal(await entry.loadCase('missing/source/case'), undefined);
    counts.cases = index.length;
    counts.questions = questionCount;
    counts.referenceCharts = chartsCount;
    break;
  }
  case 'lrdq-ts-lib': {
    assert.equal(entry.bifa.entries.length, 100);
    assert.equal(entry.getBifaEntry(1).no, 1);
    assert(modules['./cases'].getZhanLi().length > 0);
    counts.bifa = entry.bifa.entries.length;
    await checkDocs(modules['./docs']);
    break;
  }
  case 'qmdj-ts-lib': {
    const books = entry.getBooks();
    assert(books.length > 0);
    await checkDocs(modules['./docs']);
    assert.equal(books.reduce((sum, book) => sum + book.docCount, 0), counts.documents);
    assert.equal(books.reduce((sum, book) => sum + book.sectionCount, 0), modules['./docs'].getSections().length);
    assert(modules['./keying'].keying.shiGan.length > 0);
    assert(modules['./zhanmu'].listTopics().length > 0);
    counts.books = books.length;
    break;
  }
  case 'nhx-ts-lib': {
    await checkDocs(modules['./docs']);
    for (const [subpath, listName, getName] of [
      ['./herbs', 'getHerbs', 'getHerb'],
      ['./acupoints', 'getAcupoints', 'getAcupoint'],
      ['./formulas', 'getFormulas', 'getFormula'],
    ]) {
      const api = modules[subpath];
      const items = api[listName]();
      assert(items.length > 0);
      for (const item of items) {
        const body = await api[getName](item.id);
        assert.equal(body?.id, item.id);
        assert.equal(typeof body.md, 'string');
      }
      counts[subpath.slice(2)] = items.length;
    }
    const cases = modules['./cases'];
    const caseIndex = cases.getCaseIndex();
    assert.equal(caseIndex.length, cases.getCaseGroups().reduce((sum, group) => sum + group.count, 0));
    for (const item of caseIndex) assert((await cases.getCaseMarkdown(item.id))?.length > 0, item.id);
    counts.cases = caseIndex.length;
    const transcripts = modules['./transcripts'];
    let paragraphs = 0;
    for (const book of transcripts.getTranscriptBooks()) {
      const loaded = await transcripts.loadTranscriptBook(book.book);
      assert.equal(loaded?.chapters.length, book.chapters.length);
      const count = loaded.chapters.reduce((sum, chapter) => sum + chapter.paras.length, 0);
      assert.equal(count, book.paraCount);
      paragraphs += count;
    }
    counts.transcriptParagraphs = paragraphs;
    assert(paragraphs > 0);
    assert.equal((await modules['./gua'].getGua64()).length, 64);
    assert(modules['./videos'].getVideoSeries().length > 0);
    break;
  }
  case 'shj-ts-lib': {
    const expected = entry.getCorpusStats();
    const text = modules['./text'];
    assert.equal(text.getChapters().length, 18);
    let entries = 0;
    for (const chapter of text.getChapters()) {
      const loaded = await text.getChapterEntries(chapter.id);
      assert.equal(loaded.length, chapter.entryCount);
      assert(loaded.every((item) => item.t.length > 0 && item.s.length > 0));
      assert.strictEqual(await text.getChapterEntries(chapter.id), loaded, 'Chapter cache is broken');
      entries += loaded.length;
    }
    assert.equal(entries, expected.entries);
    counts.textEntries = entries;
    const entities = modules['./entities'];
    assert.equal(entities.getEntitiesIndex().length, expected.entities);
    for (const entity of entities.getEntitiesIndex()) assert.equal((await entities.getEntity(entity.id))?.id, entity.id);
    const images = modules['./images'].getImages();
    assert.equal(images.length, expected.images);
    assert.equal(new Set(images.map((image) => image.id)).size, images.length, 'Duplicate image metadata IDs');
    const imageFiles = images.map((image) => `assets/images/${image.file}`);
    assert.equal(new Set(imageFiles).size, images.length, 'Multiple image records map to the same file');
    assert.deepEqual(
      imageFiles.toSorted(),
      pkg.files.filter((file) => file.path.startsWith('assets/images/')).map((file) => file.path).toSorted(),
      'Every packaged image must have exactly one metadata record',
    );
    for (const image of images) {
      const path = resolve(directory, 'assets/images', image.file);
      assert(path.startsWith(`${resolve(directory, 'assets/images')}${sep}`));
      const actualBytes = (await stat(path)).size;
      assert(actualBytes > 0, `Image missing: ${image.file}`);
      assert.equal(actualBytes, image.bytes, `Image metadata bytes differ from installed asset: ${image.file}`);
    }
    counts.images = images.length;
    counts.assetFiles = pkg.files.filter((file) => file.path.startsWith('assets/')).length;
    assert.equal(modules['./locations'].getLocations().length, expected.locations);
    assert.equal(modules['./rivers'].getRivers().length, expected.rivers);
    assert.equal(modules['./geo'].locationsToGeoJSON().type, 'FeatureCollection');
    break;
  }
  case 'tbss-ts-lib': {
    const verses = modules['./verses'];
    assert.equal(verses.getVolumes().length, 12);
    let count = 0;
    for (const volume of verses.getVolumes()) {
      const loaded = await verses.getVolumeVerses(volume.slug);
      assert.equal(loaded.length, volume.count);
      assert.equal((await verses.getVerse(volume.start))?.n, volume.start);
      assert.equal((await verses.getVerse(volume.end))?.n, volume.end);
      count += loaded.length;
    }
    assert.equal(count, 12000);
    counts.verses = count;
    assert(Array.isArray(await verses.getVerseNumbersByAge(30)));
    const docs = modules['./docs'];
    for (const doc of docs.getMethodDocs()) {
      assert(typeof doc.summary === 'string' && doc.summary.trim().length > 0, `Method document summary is empty: ${doc.slug}`);
      const markdown = await docs.getDocMarkdown(doc.slug);
      assert(markdown?.trim().length > 0, `Method document body is empty: ${doc.slug}`);
      assert(markdown.replace(/\r?\n/g, '').includes(doc.summary), `Method document summary no longer matches its source paragraph: ${doc.slug}`);
    }
    assert(modules['./tables'].getTables().length > 0);
    assert(modules['./annotated'].getAnnotated().length > 0);
    break;
  }
  case 'zslj-ts-lib': {
    await checkDocs(entry);
    const chart = entry.cast({ dayGan: '甲', dayZhi: '子', hourZhi: '寅', yueJiang: '亥', monthZhi: '寅', monthNo: 1 });
    assert.deepEqual([chart.sanchuan.chu.zhi, chart.sanchuan.zhong.zhi, chart.sanchuan.mo.zhi], ['午', '卯', '子']);
    assert.equal(chart.gong.length, 12);
    assert.equal(chart.sike.length, 4);
    // Exercise the external tyme4ts runtime dependency after a standalone install.
    const dated = entry.castByDate(new Date('2026-10-28T12:00:00+09:00'));
    assert.equal(dated.gong.length, 12);
    assert(entry.getBookEntry('senji01')?.text.length > 0);
    counts.goldenChartCases = 1;
    counts.calendarChartCases = 1;
    break;
  }
  default: throw new Error(`Add a package smoke check for ${pkg.name}`);
}

const result = { name: pkg.name, version: pkg.version, integrity: pkg.integrity, publicEntrypoints: Object.keys(modules).length, files: pkg.files.length, runtimeDependencies, counts };
await writeFile('result.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(`${pkg.name}: ${result.publicEntrypoints} public entrypoints, ${result.files} packaged files, ${JSON.stringify(counts)}, dependencies ${JSON.stringify(runtimeDependencies)}`);
