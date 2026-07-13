# INTEGRATION —— React 宿主接入指南（react-shj）

本库为纯数据 + 访问器库（ESM、零运行时依赖）。实体索引/地望/图像元数据同步可用，
经文与实体正文共 19 个 chunk 按需分包——地图首屏只引入约 200KB 索引。

```bash
npm install github:hackninety/shj-ts-lib
```

## 0. 图片静态资源（一次性配置）

古图文件随包分发在 `node_modules/shj-ts-lib/assets/images/`（228 幅约 85MB，SVG/JPG/PNG）。
推荐拷贝进宿主静态目录（Vite 用 [vite-plugin-static-copy](https://www.npmjs.com/package/vite-plugin-static-copy)）：

```ts
// vite.config.ts
import { viteStaticCopy } from 'vite-plugin-static-copy';
export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [{ src: 'node_modules/shj-ts-lib/assets/images/*', dest: 'shj-images' }],
    }),
  ],
});
```

之后 `imageUrl(img, '/shj-images')` 即为可用 URL。

## 1. 世界地图打点（核心场景）

「穷奇住在邽山 → 邽山处标穷奇图标 → 点击弹卡片：原文 + 白话 + 古图」：

```tsx
import { entitiesToGeoJSON } from 'shj-ts-lib/geo';
import { getEntity } from 'shj-ts-lib/entities';
import { getLocation } from 'shj-ts-lib/locations';
import { getImagesByEntity, imageUrl } from 'shj-ts-lib/images';
import { CONFIDENCE_LABELS, type Entity } from 'shj-ts-lib';

// ① 打点：GeoJSON 直接喂地图库（Leaflet / MapLibre / ECharts geo 均可）
const fc = entitiesToGeoJSON();          // 全部；或 { confidence: ['identified','disputed'] }
// Leaflet 示例
L.geoJSON(fc as any, {
  pointToLayer: (f, latlng) =>
    L.marker(latlng, { icon: iconFor(f.properties.category) })
      .on('click', () => openCard(f.properties.entityId)),
}).addTo(map);

// ② 卡片：点击时懒加载正文
function EntityCard({ id }: { id: string }) {
  const [e, setE] = useState<Entity>();
  useEffect(() => { getEntity(id).then(setE); }, [id]);
  if (!e) return <Spinner />;
  const loc = e.locationId ? getLocation(e.locationId) : undefined;
  const imgs = getImagesByEntity(e.id);
  return (
    <div className="shj-card">
      <h3>{e.name} <small>{e.pinyin}</small></h3>
      {imgs[0] && <img src={imageUrl(imgs[0], '/shj-images')} alt={e.name} />}
      <blockquote lang="zh-Hant">{e.occurrences[0].quoteTrad}</blockquote>
      <p>{e.brief}</p>
      {loc && (
        <footer>
          所居：{loc.nameSimp}（{loc.modern}）
          <em>{CONFIDENCE_LABELS[loc.confidence]}</em>
        </footer>
      )}
      {imgs[0] && <cite>图：{imgs[0].title} · <a href={imgs[0].sourceUrl}>{imgs[0].license}</a></cite>}
    </div>
  );
}
```

**图例建议**：`properties.confidence === 'legendary'` 的点用虚线描边/降低不透明度，
并在图例挂 `CONFIDENCE_LABELS`，明示「神话示意位」；`DISCLAIMER` 放关于页。

**图标建议**：按 `properties.category` 分色/分形（`CATEGORY_LABELS` 有中文名）；
`properties.image` 非空时可直接用小图头像作 marker（SVG 缩放无损）。

## 2. 百科检索面板

```tsx
import { findEntities, CATEGORY_LABELS } from 'shj-ts-lib';

// 同步、繁简折叠，适合 onChange 即时过滤
findEntities('九尾');              // 名称/别名/拼音/标签/简介
findEntities('食人', { categories: ['beast'] });
findEntities('', { chapter: 'xishan', limit: 100 }); // 某卷全部实体
```

## 3. 经文阅读器（典籍抽屉，与 nhx/zslj 同形）

```tsx
import { getChapterGroups } from 'shj-ts-lib';
import { getChapterEntries, searchText } from 'shj-ts-lib/text';

const groups = getChapterGroups();  // 五臧山经/海外经/海内经/大荒经 → 十八卷
const entries = await getChapterEntries('nanshan'); // 首次打开该卷才拉 chunk
// entries[i].head 可做卷内目录；t/s 繁简对照渲染
const hits = await searchText('凤皇');
```

## 4. 地望层与「山海经地理」玩法

```ts
import { locationsToGeoJSON } from 'shj-ts-lib/geo';
import { getLocations } from 'shj-ts-lib/locations';

locationsToGeoJSON({ withEntitiesOnly: true }); // 山川底层：名称 + 今地 + 依据
getLocations().filter((l) => l.confidence === 'identified'); // 「实地寻访」清单：
// 泰山狪狪、华山肥遗、恒山诸怀、发鸠山精卫、天水邽山穷奇、新安青要山武罗、
// 岳阳君山湘君、敦煌三危山三青鸟、长白山肃慎、羽山之鲧……
```

## 5. 打包注意

- **Vite/Next**：动态 import 自动分包；SSR 下所有 API 均可服务端调用。
- **纯 Node**：`dist` 已修复 ESM 扩展名与 JSON import attributes（Node ≥ 20.10 直接可用）。
- **体积**：安装包约 85MB（228 幅图像文件为主）；bundle 首屏仅索引 JSON（约 200KB，gzip 远小）。
  懒加载 chunk 共 19 个（18 卷经文 + 实体正文）。
- 图像不会进 JS bundle——它们是静态文件，走 `assets/images` 拷贝方案。
