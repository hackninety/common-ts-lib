import { describe, expect, it } from 'vitest';
import { getHerbs, getHerb, findHerbs, getHerbsByCategory } from '../herbs';
import { getAcupoints, getAcupoint, findAcupoints, getAcupointsByMeridian, getMeridians } from '../acupoints';
import { getFormulas, getFormula, findFormulas, getFormulasBySource } from '../formulas';
import { getCaseGroups, getCaseIndex, getCaseMarkdown, findCases, searchCasesFull } from '../cases';
import { getTranscriptBooks, loadTranscriptBook, getTranscriptChapter, searchTranscripts } from '../transcripts';
import { getGua64, findGua, searchGua } from '../gua';
import { citeDoc, buildTranscriptContext } from '../prompt';

describe('中药', () => {
  it('415 味，艾叶结构化字段完整并互链本草讲稿', async () => {
    expect(getHerbs().length).toBe(415);
    const aiye = await getHerb('艾叶');
    expect(aiye).toBeTruthy();
    expect(aiye!.xingwei).toContain('温');
    expect(aiye!.guijing).toBeTruthy();
    expect(aiye!.md.length).toBeGreaterThan(50);
    const withDoc = getHerbs().filter((h) => h.bencaoDoc);
    expect(withDoc.length).toBeGreaterThan(100); // 与《神农本草经》讲稿互链
  });

  it('检索：主治/功效/分类命中', () => {
    expect(findHerbs('止血').length).toBeGreaterThan(3);
    expect(findHerbs('石膏').some((h) => h.name === '石膏')).toBe(true);
    const cat = getHerbs().find((h) => h.category)?.category;
    if (cat) expect(getHerbsByCategory(cat).length).toBeGreaterThan(0);
  });
});

describe('穴位', () => {
  it('411 穴，经络索引齐备', async () => {
    expect(getAcupoints().length).toBe(411);
    const yongquan = await getAcupoint('涌泉');
    expect(yongquan).toBeTruthy();
    expect(yongquan!.md.length).toBeGreaterThan(30);
    expect(getMeridians().length).toBeGreaterThanOrEqual(10);
    const xin = getAcupointsByMeridian('心经');
    expect(xin.length).toBeGreaterThan(0);
  });

  it('繁体检索命中（湧泉→涌泉）', () => {
    expect(findAcupoints('湧泉').some((a) => a.name === '涌泉')).toBe(true);
  });
});

describe('方剂', () => {
  it('113 首，白虎汤出处伤寒论且带原文引用', async () => {
    expect(getFormulas().length).toBe(113);
    const bh = await getFormula('白虎汤');
    expect(bh).toBeTruthy();
    expect(bh!.source).toBe('伤寒论');
    expect(bh!.refs.length).toBeGreaterThan(0);
    expect(getFormulasBySource('伤寒论').length).toBeGreaterThan(20);
  });

  it('经方检索可用；汉唐编号方在讲稿库按编号排序', async () => {
    expect(findFormulas('桂枝').length).toBeGreaterThan(0);
    const { getBookManifest } = await import('../docs');
    const fj = getBookManifest('fangjie').map((m) => m.title);
    expect(fj.indexOf('HT-1白带丸')).toBeGreaterThanOrEqual(0);
    expect(fj.indexOf('HT-1白带丸')).toBeLessThan(fj.indexOf('HT-100历节丸'));
  });
});

describe('医案', () => {
  it('11 组 959 篇，正文分包可读', async () => {
    const groups = getCaseGroups();
    expect(groups.length).toBe(11);
    expect(groups.reduce((a, g) => a + g.count, 0)).toBe(959);
    expect(getCaseIndex().length).toBe(959);
    const riji = getCaseIndex('riji2005');
    expect(riji.length).toBe(77);
    const md = await getCaseMarkdown(riji[0].id);
    expect(md).toBeTruthy();
    expect(md!.length).toBeGreaterThan(100);
  });

  it('日志组为倪师亲笔且带日期；索引检索/全文检索可用', async () => {
    const groups = getCaseGroups();
    expect(groups.find((g) => g.id === 'riji2005')?.fidelity).toBe('first-party');
    const dated = getCaseIndex('riji2005').filter((c) => c.date?.startsWith('2005'));
    expect(dated.length).toBeGreaterThan(50);
    expect(findCases('乳癌').length).toBeGreaterThan(0);
    const full = await searchCasesFull('乳癌', { groups: ['riji2005'], limit: 5 });
    expect(full.length).toBeGreaterThan(0);
    expect(full[0].snippet).toBeTruthy();
  });
});

describe('逐字稿', () => {
  it('5 书 6486 段，章可定位', async () => {
    const books = getTranscriptBooks();
    expect(books.length).toBe(5);
    expect(books.reduce((a, b) => a + b.paraCount, 0)).toBe(6486);
    const sh = await loadTranscriptBook('shanghan');
    expect(sh!.chapters.length).toBe(9);
    const ch = await getTranscriptChapter('shanghan', sh!.chapters[0].id);
    expect(ch!.paras.length).toBeGreaterThan(0);
  });

  it('段落检索：白虎汤见于伤寒论逐字稿', async () => {
    const hits = await searchTranscripts('白虎汤', { books: ['shanghan'], limit: 10 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].text).toContain('白虎');
    expect(buildTranscriptContext(hits)).toContain('视频逐字稿');
  });
});

describe('64 卦', () => {
  it('64 卦齐备，乾为天第一', async () => {
    const gua = await getGua64();
    expect(gua.length).toBe(64);
    const qian = await findGua(1);
    expect(qian!.name).toContain('乾');
    const lu = await findGua('天泽履');
    expect(lu!.no).toBe(10);
    expect((await searchGua('小畜')).length).toBeGreaterThan(0);
  });
});

describe('prompt', () => {
  it('出处行包含保真度声明', () => {
    const line = citeDoc({ path: 'shanghan/ben/001-x.md', title: '辨太阳病', group: 'ben', book: '伤寒论', series: '人纪', fidelity: 'lecture-notes' });
    expect(line).toContain('《伤寒论》');
    expect(line).toContain('听课整理稿');
  });
});
