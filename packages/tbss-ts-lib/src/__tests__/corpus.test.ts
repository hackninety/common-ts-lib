import { describe, expect, it } from 'vitest';
import { getSources, getCorpusStats, DISCLAIMER, FIDELITY_NOTE } from '../registry';
import { fold, foldIncludes } from '../normalize';
import {
  getVolumes, volumeOf, getVerse, getVerses, getVolumeVerses,
  searchVerses, getVerseNumbersByAge, getVersesByAge, loadAllVerses,
} from '../verses';

describe('注册表', () => {
  it('三处来源仓库均锁定 commit', () => {
    const sources = getSources();
    expect(sources.length).toBe(3);
    for (const s of sources) {
      expect(s.url).toMatch(/^https:\/\/github\.com\//);
      expect(s.commit).toMatch(/^[0-9a-f]{12}$/);
    }
    expect(DISCLAIMER).toContain('不构成');
    expect(FIDELITY_NOTE).toContain('转录');
  });

  it('统计锚点：12000 条 / 十二集 / 15 表 / 29 注解 / 3 文献 / 4 处修复', () => {
    const stats = getCorpusStats();
    expect(stats.verses).toBe(12000);
    expect(stats.volumes).toBe(12);
    expect(stats.tables).toBe(15);
    expect(stats.annotated).toBe(29);
    expect(stats.methodDocs).toBe(3);
    expect(stats.agesAnnotated).toBe(7089);
    expect((stats.textualIssues as string[]).length).toBe(4);
  });
});

describe('条文库', () => {
  it('十二集号段连续（1001–13000）', () => {
    const vols = getVolumes();
    expect(vols.length).toBe(12);
    expect(vols[0]).toMatchObject({ slug: 'zi', name: '子集', start: 1001, end: 2000, count: 1000 });
    expect(vols[11]).toMatchObject({ slug: 'hai', name: '亥集', start: 12001, end: 13000 });
    for (let i = 1; i < vols.length; i++) expect(vols[i].start).toBe(vols[i - 1].end + 1);
    expect(volumeOf(1001)?.name).toBe('子集');
    expect(volumeOf(13000)?.name).toBe('亥集');
    expect(volumeOf(1000)).toBeUndefined();
    expect(volumeOf(13001)).toBeUndefined();
  });

  it('首尾条与年龄注记锚点', async () => {
    const first = await getVerse(1001);
    expect(first).toMatchObject({ n: 1001, volume: '子集', ages: [47], text: '一树残花，有枝复茂。' });
    const last = await getVerse(13000);
    expect(last).toMatchObject({ n: 13000, volume: '亥集', ages: [], text: '万象更新，周而复始。' });
    const paired = await getVerse(1004); // 年龄成对注记
    expect(paired!.ages).toEqual([21, 22]);
    const repaired = await getVerse(1174); // 底本「3940」分隔符缺失 → 修复
    expect(repaired!.ages).toEqual([39, 40]);
  });

  it('取集与批量取条', async () => {
    const zi = await getVolumeVerses('zi');
    expect(zi.length).toBe(1000);
    expect(zi[0].n).toBe(1001);
    const byBranch = await getVolumeVerses('亥');
    expect(byBranch.length).toBe(1000);
    const batch = await getVerses([1001, 7000, 99999]);
    expect(batch[0]!.text).toContain('残花');
    expect(batch[1]!.volume).toBe('巳集');
    expect(batch[2]).toBeUndefined();
  });

  it('全文检索：简体/繁体混写均命中', async () => {
    const hits = await searchVerses('残花');
    expect(hits.some((v) => v.n === 1001)).toBe(true);
    const trad = await searchVerses('殘花'); // 繁体输入
    expect(trad.some((v) => v.n === 1001)).toBe(true);
    const scoped = await searchVerses('姻缘', { volumes: ['hai'], limit: 5 });
    expect(scoped.length).toBeGreaterThan(0);
    expect(scoped.every((v) => v.volume === '亥集')).toBe(true);
  });

  it('年龄倒排：47 岁含 1001 条', async () => {
    const ns = await getVerseNumbersByAge(47);
    expect(ns).toContain(1001);
    const vs = await getVersesByAge(47);
    expect(vs.every((v) => v.ages.includes(47))).toBe(true);
    expect(vs.length).toBe(ns.length);
  });

  it('全库装载 12000 条无缺号', async () => {
    const all = await loadAllVerses();
    expect(all.length).toBe(12000);
    const set = new Set(all.map((v) => v.n));
    expect(set.size).toBe(12000);
  });
});

describe('检索折叠', () => {
  it('繁→简 + 去句读', () => {
    expect(fold('鐵板神數，條文。')).toBe(fold('铁板神数条文'));
    expect(foldIncludes('卜君之寿，未满六旬。', '之壽')).toBe(true);
  });
});
