import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getChapters, getCorpusStats } from '../registry';
import { fold, foldIncludes } from '../normalize';
import { getChapterEntries, searchText } from '../text';
import { getEntitiesIndex, getEntity, findEntities, getEntitiesByLocation } from '../entities';
import { getLocations, getLocation } from '../locations';
import { getImages, getImagesByEntity, getCollections } from '../images';
import { entitiesToGeoJSON, locationsToGeoJSON, riversToGeoJSON } from '../geo';
import { getRivers, getRiversByLocation, findRivers } from '../rivers';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('经文', () => {
  it('十八卷齐备，条目与字数达标', () => {
    const chapters = getChapters();
    expect(chapters.length).toBe(18);
    const stats = getCorpusStats();
    expect(stats.entries).toBeGreaterThan(800);
    expect(stats.chars).toBeGreaterThan(30000);
    expect(chapters.filter((c) => c.book === 'shan').length).toBe(5);
    expect(chapters.filter((c) => c.book === 'hai').length).toBe(13);
  });

  it('正文可按卷懒加载，繁简对照', async () => {
    const entries = await getChapterEntries('nanshan');
    expect(entries.length).toBeGreaterThan(40);
    expect(entries[0].t).toContain('招搖之山');
    expect(entries[0].s).toContain('招摇之山');
  });

  it('全文检索（繁简折叠）', async () => {
    const hits = await searchText('九尾', { chapters: ['nanshan'] });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].entry.s).toContain('九尾');
    const hitsTrad = await searchText('窮奇', { chapters: ['xishan'] });
    expect(hitsTrad.length).toBeGreaterThan(0);
  });
});

describe('实体百科', () => {
  it('实体量与必填字段', () => {
    const idx = getEntitiesIndex();
    expect(idx.length).toBeGreaterThanOrEqual(220);
    for (const e of idx) {
      expect(e.name, e.id).toBeTruthy();
      expect(e.pinyin, e.id).toBeTruthy();
      expect(e.brief.length, e.id).toBeGreaterThan(10);
      expect(e.chapter, e.id).toBeTruthy();
    }
  });

  it('每条引文均可在底本原文中命中（语料可溯源）', async () => {
    for (const item of getEntitiesIndex()) {
      const e = await getEntity(item.id);
      expect(e, item.id).toBeTruthy();
      expect(e!.occurrences.length, item.id).toBeGreaterThan(0);
      for (const occ of e!.occurrences) {
        const entries = await getChapterEntries(occ.chapter);
        const entry = entries[occ.entry];
        expect(entry, `${item.id} ${occ.chapter}#${occ.entry}`).toBeTruthy();
        expect(entry.t.includes(occ.quoteTrad), `${item.id} 引文未命中`).toBe(true);
        expect(foldIncludes(entry.s, occ.quote), `${item.id} 简体引文未命中`).toBe(true);
      }
    }
  });

  it('穷奇：邽山可考坐标 + 海内北经二出 + 有图', async () => {
    const qq = await getEntity('qiongqi');
    expect(qq!.occurrences.length).toBe(2);
    expect(qq!.locationId).toBe('guishan');
    const loc = getLocation('guishan')!;
    expect(loc.confidence).toBe('identified');
    expect(loc.lat).toBeCloseTo(34.66, 1);
    expect(getImagesByEntity('qiongqi').length).toBeGreaterThan(0);
    expect(getEntitiesByLocation('guishan').map((e) => e.id)).toContain('luoyu');
  });

  it('检索：繁简/别名/拼音均可命中', () => {
    expect(findEntities('窮奇')[0]?.id).toBe('qiongqi');
    expect(findEntities('穷奇')[0]?.id).toBe('qiongqi');
    expect(findEntities('饕餮').map((e) => e.id)).toContain('paoxiao');
    expect(findEntities('比翼鸟').map((e) => e.id)).toContain('manman');
  });
});

describe('山川地望', () => {
  it('坐标合法、实体引用闭环', () => {
    const locs = getLocations();
    expect(locs.length).toBeGreaterThanOrEqual(100);
    const locIds = new Set(locs.map((l) => l.id));
    for (const l of locs) {
      expect(Math.abs(l.lat), l.id).toBeLessThanOrEqual(90);
      expect(Math.abs(l.lng), l.id).toBeLessThanOrEqual(180);
      expect(['identified', 'disputed', 'legendary']).toContain(l.confidence);
      expect(l.modern, l.id).toBeTruthy();
      expect(l.basis, l.id).toBeTruthy();
    }
    for (const e of getEntitiesIndex()) {
      if (e.locationId) expect(locIds.has(e.locationId), `${e.id} → ${e.locationId}`).toBe(true);
    }
  });
});

describe('古图', () => {
  it('元数据完整，文件均已落盘', () => {
    const images = getImages();
    expect(images.length).toBeGreaterThanOrEqual(180);
    const collections = getCollections();
    for (const img of images) {
      expect(collections[img.collection], img.id).toBeTruthy();
      expect(img.license, img.id).toBeTruthy();
      expect(img.sourceUrl, img.id).toContain('commons');
      const file = path.join(root, 'assets/images', img.file);
      expect(existsSync(file), `缺文件 ${img.file}`).toBe(true);
    }
  });

  it('实体图像引用闭环', async () => {
    const imgIds = new Set(getImages().map((i) => i.id));
    for (const item of getEntitiesIndex()) {
      const e = await getEntity(item.id);
      for (const id of e!.images) expect(imgIds.has(id), `${item.id} → ${id}`).toBe(true);
      if (item.image) expect(imgIds.has(item.image)).toBe(true);
    }
  });

  it('有图实体覆盖率 ≥ 72%（植物/矿物类多无古图可觅）', () => {
    const idx = getEntitiesIndex();
    const withImg = idx.filter((e) => e.imageCount > 0).length;
    expect(withImg / idx.length).toBeGreaterThanOrEqual(0.72);
  });
});

describe('水系', () => {
  it('解析量与锚定质量', () => {
    const rivers = getRivers();
    expect(rivers.length).toBeGreaterThan(250);
    expect(rivers.filter((r) => r.locationId).length).toBeGreaterThan(70);
    for (const r of rivers) {
      expect(r.name.endsWith('水'), r.name).toBe(true);
      expect(r.chapter).toBeTruthy();
    }
  });

  it('名例：漳水出发鸠山注于河；邽山出蒙水', () => {
    const zhang = findRivers('漳水').find((r) => r.locationId === 'fajiu')!;
    expect(zhang.dest).toBe('河');
    expect(zhang.dir).toBe('东');
    const meng = getRiversByLocation('guishan');
    expect(meng.map((r) => r.name)).toContain('蒙水');
  });

  it('GeoJSON 示意线：坐标合法，属性带 label', () => {
    const fc = riversToGeoJSON();
    expect(fc.features.length).toBeGreaterThan(70);
    for (const f of fc.features) {
      expect(f.geometry.type).toBe('LineString');
      expect(f.geometry.coordinates.length).toBe(2);
      for (const [lng, lat] of f.geometry.coordinates) {
        expect(Math.abs(lat)).toBeLessThanOrEqual(90);
        expect(Math.abs(lng)).toBeLessThanOrEqual(180);
      }
      expect(f.properties.label).toContain(f.properties.name);
    }
  });
});

describe('新增分支：神木灵草/矿藏/中山经补录', () => {
  it('plant/mineral 类目成型', () => {
    const idx = getEntitiesIndex();
    expect(idx.filter((e) => e.category === 'plant').length).toBeGreaterThanOrEqual(14);
    expect(idx.filter((e) => e.category === 'mineral').length).toBeGreaterThanOrEqual(5);
  });

  it('瑶草（帝女所化）与帝女桑可检索、有地望', async () => {
    expect(findEntities('瑶草')[0]?.id).toBe('yaocao');
    const yc = await getEntity('yaocao');
    expect(yc!.occurrences[0].quoteTrad).toContain('帝女');
    expect(getLocation(yc!.locationId!)).toBeTruthy();
    expect(findEntities('帝女桑').map((e) => e.id)).toContain('dinvsang');
  });

  it('中山经实体密度提升', () => {
    const zs = getEntitiesIndex().filter((e) => e.chapter === 'zhongshan');
    expect(zs.length).toBeGreaterThanOrEqual(40);
  });
});

describe('GeoJSON', () => {
  it('实体要素集：坐标 [lng,lat]，属性齐备', () => {
    const fc = entitiesToGeoJSON();
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features.length).toBeGreaterThanOrEqual(150);
    for (const f of fc.features) {
      const [lng, lat] = f.geometry.coordinates;
      expect(Math.abs(lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(lng)).toBeLessThanOrEqual(180);
      expect(f.properties.name).toBeTruthy();
      expect(f.properties.locationName).toBeTruthy();
    }
    const qq = fc.features.find((f) => f.properties.entityId === 'qiongqi')!;
    expect(qq.properties.locationName).toBe('邽山');
    expect(qq.geometry.coordinates[0]).toBeCloseTo(105.62, 0);
  });

  it('过滤器：只看可考地望/只看有图', () => {
    const real = entitiesToGeoJSON({ confidence: ['identified'] });
    expect(real.features.length).toBeGreaterThan(5);
    for (const f of real.features) expect(f.properties.confidence).toBe('identified');
    const withImg = entitiesToGeoJSON({ withImageOnly: true });
    for (const f of withImg.features) expect(f.properties.image).toBeTruthy();
  });

  it('地望要素集', () => {
    const fc = locationsToGeoJSON({ withEntitiesOnly: true });
    expect(fc.features.length).toBeGreaterThan(80);
  });
});

describe('折叠检索', () => {
  it('繁→简折叠', () => {
    expect(fold('窮奇')).toBe(fold('穷奇'));
    expect(fold('鳳凰')).toBe(fold('凤凰'));
    expect(foldIncludes('其狀如牛，蝟毛', '猬毛')).toBe(true);
  });
});
