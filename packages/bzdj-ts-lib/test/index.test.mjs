import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  foldText, getBook, getBooks, getCatalog, getDocMarkdown, getDocsManifest, getEntries, getEntry, getEntryMeta, searchEntries,
} from '../dist/index.js';

test('总表、书目与篇数', () => {
  const catalog = getCatalog();
  assert.equal(catalog.corpus, 'bzdj');
  assert.equal(catalog.system, 'bazi');
  assert.match(catalog.origin.revision, /^[a-f0-9]{40}$/);
  const books = getBooks();
  assert.deepEqual(books.map((b) => b.id), ['dts', 'dtscw', 'zpzq', 'yhzp', 'smth', 'smth-rishi', 'smth-siku']);
  assert.equal(books.length, catalog.totals.books);
  assert.equal(books.reduce((sum, b) => sum + b.entryCount, 0), catalog.totals.entries);
  assert.equal(getBook('dts')?.entryCount, 42);
  assert.equal(getBook('zpzq')?.entryCount, 47);
  assert.equal(getBook('smth-rishi')?.entryCount, 120);
  assert.equal(getBook('dtscw')?.entryCount, 63);
  assert.equal(getBook('missing'), undefined);
  // 定时辰古诀出自紫微斗数全书，归 zwdj-ts-lib，不在本库
  assert.ok(catalog.excluded.some((e) => e.file.startsWith('08-')));
  assert.ok(!('file' in books[0]) && !('entries' in books[0]));
});

test('篇目与正文一一对应，来源地址齐全', async () => {
  const manifest = getDocsManifest();
  assert.equal(manifest.length, getCatalog().totals.entries);
  assert.equal(new Set(manifest.map((d) => d.path)).size, manifest.length);
  for (const book of getBooks()) {
    for (const meta of getEntries(book.id)) {
      const entry = await getEntry(book.id, meta.id);
      assert.ok(entry && entry.content.length > 0, `${book.id}/${meta.id}`);
      assert.equal(Array.from(entry.content).length, meta.chars);
      assert.match(meta.sourceUrl, /^https:\/\/(zh\.wikisource\.org|archive\.org)\/\S+$/, `${book.id}/${meta.id}`);
      assert.ok(!/[（）]/.test(meta.sourceUrl), '来源地址不应带括注');
      assert.ok(!/^>\s*源：/m.test(entry.content), '来源行应已从正文剔除');
    }
  }
  assert.equal(await getEntry('dts', '99'), undefined);
  assert.equal(await getDocMarkdown('__unknown__/01'), undefined);
});

test('各书要目：滴天髓性情论、阐微分卷、日时断、四库本', async () => {
  const xingqing = getEntries('dts').find((e) => e.title === '性情論');
  assert.ok(xingqing);
  assert.match((await getEntry('dts', xingqing.id)).content, /\*\*五行不戾，惟正清和，濁亂偏枯，性情乖逆。\*\*/);
  assert.deepEqual([...new Set(getEntries('dtscw').map((e) => e.group))], ['通神论', '六亲论']);
  const rishi = getEntries('smth-rishi').find((e) => e.title === '六己日丁卯时断');
  assert.match((await getEntry('smth-rishi', rishi.id)).content, /己巳日丁卯时，无冲破，富贵/);
  assert.deepEqual([...new Set(getEntries('smth-siku').map((e) => e.group))], ['卷十', '卷十一', '卷十二']);
  assert.equal(getBook('smth-siku')?.script, '繁');
  assert.ok(getBook('zpzq')?.notes.some((n) => n.startsWith('校记：')));
  const md = await getDocMarkdown(`dts/${xingqing.id}`);
  assert.match(md, /^# 性情論\n\n> 《滴天髓》/);
  assert.match(md, /来源：https:\/\/zh\.wikisource\.org\/wiki\/滴天髓\/34/);
});

test('检索：关键词 AND、简繁等价、篇名命中在前', async () => {
  assert.equal(foldText('傷官見官ABC'), '伤官见官abc');
  // 简体关键词能命中繁体底本（輯要本、四库本），繁体关键词也能命中简体整理本
  const simp = await searchEntries('阳刃局', { book: 'dts' });
  assert.ok(simp.total > 0 && simp.items[0].excerpt.includes('陽刃局'));
  const trad = await searchEntries('傷官見官', { book: 'yhzp' });
  assert.ok(trad.total > 0 && trad.items.some((h) => h.excerpt.includes('伤官见官')));
  const titled = await searchEntries('性情');
  assert.ok(titled.total > 3);
  assert.equal(titled.items[0].matchedIn, 'title');
  const and = await searchEntries('枭印 使心机', { book: 'yhzp', scope: 'text' });
  assert.equal(and.total, 1);
  assert.equal(getEntryMeta('yhzp', and.items[0].entryId)?.title, '相心赋');
  const paged = await searchEntries('日', { book: 'smth-rishi', limit: 5, offset: 5 });
  assert.equal(paged.items.length, 5);
  assert.equal(paged.nextOffset, 10);
  assert.deepEqual(await searchEntries('   '), { items: [], total: 0, offset: 0, nextOffset: null, match: 'keyword-and-folded' });
  await assert.rejects(() => searchEntries('性情', { book: 'nope' }), /未知书目/);
});
