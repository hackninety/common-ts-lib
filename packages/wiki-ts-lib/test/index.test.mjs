import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  foldText, getBook, getBooks, getCatalog, getDocMarkdown, getDocsManifest, getEntries, getEntry, getEntryByUri,
  searchBooks, searchEntries,
} from '../dist/index.js';

test('总表与书目', () => {
  const catalog = getCatalog();
  const books = getBooks();
  assert.equal(books.length, catalog.totals.books);
  assert.ok(books.length >= 50);
  assert.equal(getBook('taiping-guangji')?.title, '太平广记');
  assert.ok(getBooks({ tradition: '释' }).every(b => b.tradition === '释'));
  assert.ok(searchBooks('蒲松龄').some(b => b.id === 'liaozhai-zhiyi'));
});

test('AI 译注单独一层（react-scripture 藏经楼）', async () => {
  for (const id of ['zhonglun', 'shiermen-lun', 'guankong-pian']) {
    const book = getBook(id);
    assert.deepEqual(book?.aiProviders, ['Claude', 'GPT', 'Gemini']);
    assert.ok(book.layers.ai > 0 && book.layers.source > 0);
    assert.ok(getEntries(id).every(e => (e.layer === 'ai') === Boolean(e.ai)));
  }
  const summary = await getEntry('zhonglun', 'summary-claude');
  assert.deepEqual({ provider: summary.ai.provider, role: summary.ai.role }, { provider: 'Claude', role: 'summary' });
  assert.ok(!('repositoryPath' in summary.source));
  const modern = await getEntry('zhonglun', 'v01-c001-gpt-modern');
  assert.equal(modern.ai.role, 'translation');
  assert.ok(modern.ai.segmentIds.includes('T1564_001_s0003'));
  assert.match(await getDocMarkdown('zhonglun/v01-c001-gpt-modern'), /GPT AI 现代译文（非古籍原文）/);
  // 原书与译文按层分开搜：默认不进 AI 层。
  const source = await searchEntries('僧叡', { book: 'zhonglun' });
  assert.ok(source.items.every(h => h.layer === 'source'));
  const ai = await searchEntries('僧叡', { book: 'zhonglun', layer: 'ai', aiProvider: 'Gemini' });
  assert.ok(ai.total > 0 && ai.items.every(h => h.ai?.provider === 'Gemini'));
  const all = await searchEntries('僧叡', { book: 'zhonglun', layer: 'all' });
  assert.ok(all.total > source.total + ai.total);
});

test('读篇目全文与来源', async () => {
  const entry = await getEntry('liaozhai-zhiyi', 'v001-001');
  assert.ok(entry);
  assert.match(entry.content, /宋公諱/);
  assert.equal(entry.uri, 'reference://liaozhai-zhiyi/v001-001');
  assert.equal(entry.source.provider, '维基文库');
  assert.ok(!('snapshotPath' in entry.source));
  assert.deepEqual(await getEntryByUri(entry.uri), entry);
  const last = getEntries('taiping-guangji').at(-1);
  assert.ok(last && last.shard > 0);
  assert.ok((await getEntry('taiping-guangji', last.id))?.content.length);
});

test('docs 同形接口', async () => {
  const manifest = getDocsManifest();
  assert.equal(manifest.length, getCatalog().totals.entries);
  const doc = manifest.find(d => d.bookId === 'shanhai-jing' && d.layer === 'source');
  assert.ok(doc);
  const md = await getDocMarkdown(doc.path);
  assert.match(md, /^# /);
  assert.match(md, /《山海经》/);
  assert.equal(await getDocMarkdown('no-such-book/x'), undefined);
});

test('简繁等价检索', async () => {
  assert.equal(foldText('東王公'), '东王公');
  assert.equal(foldText('ABC東'), 'abc东');
  const simp = await searchEntries('东王公', { book: 'taiping-guangji', scope: 'text' });
  const trad = await searchEntries('東王公', { book: 'taiping-guangji', scope: 'text' });
  assert.ok(simp.total > 0);
  assert.equal(simp.total, trad.total);
  assert.match(simp.items[0].excerpt, /東王公/);
  const title = await searchEntries('画皮', { book: 'liaozhai-zhiyi' });
  assert.equal(title.items[0]?.matchedIn, 'title');
  const and = await searchEntries('狐 女', { book: 'liaozhai-zhiyi', limit: 5 });
  assert.ok(and.total > 5 && and.nextOffset === 5);
  await assert.rejects(searchEntries('x', { book: 'nope' }));
});
