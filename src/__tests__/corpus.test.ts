import { describe, expect, it } from 'vitest';
import { getBooks, getBook, getSeries, getSources, getCorpusStats, DISCLAIMER, FIDELITY_LABELS } from '../registry';
import { getDocsManifest, getBookManifest, getDocMarkdown, searchDocs } from '../docs';
import { fold, foldIncludes } from '../normalize';

describe('注册表', () => {
  it('14 书 5 系列，来源仓库锁定 commit', () => {
    const books = getBooks();
    expect(books.length).toBe(14);
    expect(getSeries()).toEqual(['人纪', '天纪', '地纪', '讲演', '文集']);
    const sources = getSources();
    expect(sources.length).toBeGreaterThanOrEqual(5);
    for (const s of sources) expect(s.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('人纪五部与规模锚点', () => {
    expect(getBook('shanghan')?.count).toBe(14);
    expect(getBook('neijing')?.count).toBe(73);
    expect(getBook('zhenjiu')?.count).toBe(7);
    expect(getBook('bencao')?.count).toBe(429);
    expect(getBook('jingui')?.count).toBe(46);
    const stats = getCorpusStats() as { docsTotal: number; casesTotal: number };
    expect(stats.docsTotal).toBe(936);
    expect(stats.casesTotal).toBe(959);
  });

  it('保真度标签与免责声明', () => {
    expect(FIDELITY_LABELS['first-party']).toBe('倪师亲笔');
    expect(getBook('fangjie')?.fidelity).toBe('attributed');
    expect(getBook('zhuanti')?.fidelity).toBe('first-party');
    expect(DISCLAIMER).toContain('不构成');
  });
});

describe('讲稿库', () => {
  it('manifest 与书目计数一致，路径均可解析', async () => {
    const manifest = getDocsManifest();
    expect(manifest.length).toBe(936);
    for (const b of getBooks()) {
      expect(getBookManifest(b.slug).length).toBe(b.count);
    }
    // 全量载荷可达（14 书全部拉起）
    for (const m of manifest) {
      const md = await getDocMarkdown(m.path);
      expect(md, m.path).toBeTruthy();
      expect(md!.startsWith('# '), m.path).toBe(true);
    }
  });

  it('伤寒论篇章可读且非逐字稿标注', async () => {
    const sh = getBookManifest('shanghan');
    const taiyang = sh.find((m) => m.title.includes('太阳病'));
    expect(taiyang).toBeTruthy();
    const md = await getDocMarkdown(taiyang!.path);
    expect(md).toContain('太阳');
    expect(taiyang!.fidelity).toBe('lecture-notes');
  });

  it('searchDocs 繁简折叠命中', () => {
    const hits = searchDocs('傷寒');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.book === '伤寒论' || h.title.includes('伤寒'))).toBe(true);
    expect(searchDocs('針灸', { series: '人纪' }).length).toBeGreaterThan(0);
    expect(searchDocs('天機道').some((h) => h.book === '天纪')).toBe(true);
  });

  it('日志类文档带日期', () => {
    const zhuanti = getBookManifest('zhuanti');
    expect(zhuanti.length).toBe(9);
    expect(zhuanti.every((m) => m.fidelity === 'first-party')).toBe(true);
  });
});

describe('normalize', () => {
  it('繁→简折叠', () => {
    expect(fold('傷寒論')).toBe('伤寒论');
    expect(fold('黃帝內經')).toContain('黄');
    expect(fold('針 灸 大 成')).toBe('针灸大成');
    expect(foldIncludes('辨太阳病脉证并治法', '脈證')).toBe(true);
    expect(foldIncludes('湧泉穴', '涌泉')).toBe(true);
  });
});
