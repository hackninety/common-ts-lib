import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  foldText, getBook, getBooks, getCatalog, getDocMarkdown, getDocsManifest, getEntries, getEntry, searchEntries,
} from '../dist/index.js';

test('总表、书目与篇数', () => {
  const catalog = getCatalog();
  assert.equal(catalog.corpus, 'zwdj');
  assert.equal(catalog.system, 'ziwei');
  assert.match(catalog.origin.revision, /^[a-f0-9]{40}$/);
  const books = getBooks();
  assert.deepEqual(books.map((b) => b.id), ['qs1', 'qs2', 'qs3']);
  assert.equal(books.reduce((sum, b) => sum + b.entryCount, 0), catalog.totals.entries);
  assert.equal(getBook('qs1')?.entryCount, 56);
  assert.equal(getBook('qs2')?.entryCount, 13);
  assert.equal(getBook('qs3')?.entryCount, 20);
  assert.equal(getBook('qs1')?.script, '繁');
  assert.equal(getBook('qs2')?.script, '简');
  // 续道藏本是十八飞星体系，有意不收
  assert.ok(catalog.excluded.some((e) => e.file.startsWith('23-')));
  assert.ok(!getDocsManifest().some((d) => /續道藏|续道藏|飞星/.test(d.title + d.book)));
});

test('篇目与正文一一对应', async () => {
  const manifest = getDocsManifest();
  assert.equal(manifest.length, getCatalog().totals.entries);
  assert.equal(new Set(manifest.map((d) => d.path)).size, manifest.length);
  for (const book of getBooks()) {
    for (const meta of getEntries(book.id)) {
      const entry = await getEntry(book.id, meta.id);
      assert.ok(entry && entry.content.length > 0, `${book.id}/${meta.id}`);
      assert.equal(Array.from(entry.content).length, meta.chars);
      // 卷一前十四篇整理自 ncc.com.tw 汇编，没有可逐篇引用的网页地址，留空；其余指向维基文库
      if (meta.sourceUrl) assert.match(meta.sourceUrl, /^https:\/\/zh\.wikisource\.org\/wiki\/紫微斗數全書\/卷[一二三]$/);
      else assert.ok(book.id === 'qs1' && Number(meta.id) <= 14, `${book.id}/${meta.id} 缺来源地址`);
    }
  }
  assert.equal(await getEntry('qs1', '99'), undefined);
  assert.equal(await getDocMarkdown('__unknown__/01'), undefined);
});

test('卷一：一文一篇，诸星问答论逐星成篇', async () => {
  const qs1 = getEntries('qs1');
  assert.equal(qs1[1].title, '骨髓賦');
  assert.equal(qs1[1].group, '');
  const wenda = qs1.filter((e) => e.group === '諸星問答論');
  assert.equal(wenda.length, 37);
  assert.equal(wenda[0].title, '問紫微所主若何？');
  // 文内小标题留在正文里，没有被拆散或丢掉
  const shideng = qs1.find((e) => e.title.startsWith('定富貴貧賤十等論'));
  assert.match((await getEntry('qs1', shideng.id)).content, /^## /m);
  const gusui = await getEntry('qs1', '02');
  assert.match(gusui.content, /命無正曜，夭折孤貧/);
  assert.match(await getDocMarkdown('qs1/02'), /^# 骨髓賦\n\n> 《紫微斗數全書》/);
});

test('卷二、卷三要目', async () => {
  assert.deepEqual(getEntries('qs2').map((e) => e.title).slice(0, 3), ['安身命例', '一 命宫', '二兄弟']);
  const fumu = getEntries('qs2').find((e) => e.title === '十二父母');
  assert.match((await getEntry('qs2', fumu.id)).content, /太阳在陷宫主先克父，太阴星在陷宫主先克母/);
  const shengshi = getEntries('qs3').find((e) => e.title === '定小儿生时诀');
  assert.match((await getEntry('qs3', shengshi.id)).content, /子午卯酉单顶门/);
});

test('检索：关键词 AND、简繁等价、篇名命中在前', async () => {
  assert.equal(foldText('紫微諸星廟陷訣'), '紫微诸星庙陷诀');
  // 简体关键词命中繁体卷一，繁体关键词命中简体卷二
  const simp = await searchEntries('命无正曜', { book: 'qs1' });
  assert.ok(simp.total > 0 && simp.items.some((h) => h.excerpt.includes('命無正曜')));
  const trad = await searchEntries('祿存', { book: 'qs2' });
  assert.ok(trad.total > 0 && trad.items.some((h) => h.excerpt.includes('禄存')));
  const titled = await searchEntries('太微赋');
  assert.ok(titled.total >= 2);
  assert.equal(titled.items[0].matchedIn, 'title');
  const and = await searchEntries('单顶门 双顶', { scope: 'text' });
  assert.equal(and.total, 1);
  assert.equal(and.items[0].bookId, 'qs3');
  await assert.rejects(() => searchEntries('紫微', { book: 'nope' }), /未知书目/);
});
