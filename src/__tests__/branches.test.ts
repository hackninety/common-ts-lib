import { describe, expect, it } from 'vitest';
import {
  getTables, getTable, EIGHT_QUARTERS, quarterOfMinute,
  CORE_FORMULA, TAIXUAN_RHYME, taixuanValue,
} from '../tables';
import { getAnnotated, getAnnotatedMeta, getAnnotatedCategories, getAnnotatedByCategory, findAnnotated } from '../annotated';
import { getMethodDocs, getDocMarkdown, searchMethodDocs } from '../docs';
import { citeVerse, citeAnnotated, buildVerseContext } from '../prompt';
import { getVerse } from '../verses';

describe('取数表', () => {
  it('十五张表齐备，编号/slug 双通道', () => {
    const tables = getTables();
    expect(tables.length).toBe(15);
    expect(getTable('14-10')?.slug).toBe('innate');
    expect(getTable('liunian-verse')?.id).toBe('14-14');
    for (const t of tables) {
      expect(t.columns.length).toBeGreaterThan(1);
      expect(t.rows.length).toBeGreaterThan(0);
      for (const r of t.rows) expect(r.length).toBe(t.columns.length);
    }
  });

  it('行数锚点与关键单元格', () => {
    expect(getTable('month')!.rows.length).toBe(12);
    expect(getTable('gua-simple')!.rows.length).toBe(726);
    expect(getTable('gua-detail')!.rows.length).toBe(1500);
    expect(getTable('gua-detail')!.columns).toEqual(['刻别', '本命数', '卦名']);
    expect(getTable('liunian-verse')!.rows.length).toBe(2028);
    // 14-10 多值单元格（一格多条文号，\n 分隔）应保留
    const innate = getTable('innate')!;
    expect(innate.rows.length).toBe(144); // 296 物理行经多行引号单元格合并
    expect(innate.rows.some((r) => r.some((c) => c.includes('\n')))).toBe(true);
    // 14-11-2 表尾空列应剔除
    const sisheng = getTable('liunian-sisheng')!;
    expect(sisheng.columns[sisheng.columns.length - 1]).toBe('12');
    expect(sisheng.rows.length).toBe(120);
  });

  it('八刻细分与太玄数', () => {
    expect(EIGHT_QUARTERS.length).toBe(8);
    expect(quarterOfMinute(0)?.name).toBe('初刻');
    expect(quarterOfMinute(119)?.name).toBe('正刻');
    expect(quarterOfMinute(119)?.value).toBe(8);
    expect(quarterOfMinute(120)).toBeUndefined();
    expect(CORE_FORMULA).toContain('48');
    expect(TAIXUAN_RHYME).toContain('甲己子午九');
    expect(taixuanValue('甲')).toBe(9);
    expect(taixuanValue('亥')).toBe(4);
    expect(taixuanValue('X')).toBeUndefined();
  });
});

describe('注解精选', () => {
  it('29 条 10 类，字段完整', () => {
    expect(getAnnotated().length).toBe(29);
    expect(getAnnotatedCategories().length).toBe(10);
    expect(getAnnotatedMeta().source).toContain('陈明');
    for (const a of getAnnotated()) {
      expect(a.id).toBeTruthy();
      expect(a.content.length).toBeGreaterThan(5);
      expect(a.note.length).toBeGreaterThan(3);
    }
    const liuqin = getAnnotatedByCategory('六亲');
    expect(liuqin.length).toBeGreaterThan(0);
    expect(findAnnotated('乾').length).toBeGreaterThan(0);
  });
});

describe('方法文献', () => {
  it('三篇齐备，正文懒加载', async () => {
    const docs = getMethodDocs();
    expect(docs.map((d) => d.slug).sort()).toEqual(['kaoke', 'overview', 'tables']);
    for (const d of docs) expect(d.summary.length).toBeGreaterThan(5);
    const md = await getDocMarkdown('kaoke');
    expect(md).toContain('八刻');
    expect(md).toContain('刻干数 × 48');
    expect(await getDocMarkdown('nope')).toBeUndefined();
    expect(searchMethodDocs('考刻').length).toBeGreaterThan(0);
  });
});

describe('引用工具', () => {
  it('出处行与提示块携保真度声明', async () => {
    const v = (await getVerse(1001))!;
    expect(citeVerse(v)).toBe('《铁板神数》子集 第1001条（年龄注记 47）');
    const ctx = buildVerseContext([v]);
    expect(ctx).toContain('一树残花');
    expect(ctx).toContain('转录');
    const a = getAnnotated()[0];
    expect(citeAnnotated(a)).toContain('陈明点校本');
  });
});
