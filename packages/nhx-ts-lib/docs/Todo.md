# 收录路线图（Todo）

## 高价值待收录

1. **汉唐中医官网文章库**（jcold/hantang、wanghao28/nihaixia 镜像，chinese/ch_Articles
   约 3779 篇 htm）——倪师 2000–2011 年每周文章/时事评论/问答，第一手资料的最大缺口。
   工程量：htm→md 批量转换、`htm?` 变体去重、与已收录「专题/日志」内容判重。
   建议独立为 `articles` 分支（slug `wenzhang`，fidelity first-party）。
2. **人纪原版讲义 PDF 五册**（wesky-online/zhongli_data `数据源/`，235–376 页/册）——
   结构化引用（herbs/formulas refs 的 page 字段）即指向这套页码，可做「查证」
   深链的页级渲染（PDF.js 宿主侧实现，本库提供页码即可，无需嵌入）。
3. **闭门课/弟子班扩展**：9527qingfeng 仓库持续更新中（李可、胡希恕等前辈内容属
   他人课程，不入本库）；关注其 doc→md 转换进度，定期重跑 ingest 增量。

## 结构化深化

4. 伤寒/金匮**条文级切分**：现讲稿为整章（如太阳上篇 176KB），可按「原文条文 +
   倪师讲解」切分为条文粒度（正则可识别「一、“太阳之为病…”」标头），
   与 formulas 建立 条文↔方剂 双向索引。
5. 逐字稿↔讲稿**对齐**：同章内容两种保真度（lecture-notes / transcript）可做段落对齐，
   宿主阅读器支持「对照视图」。
6. 医案**方剂抽取**：日志/编号档正文含处方明细，可解析为结构化 prescriptions
   （药+剂量），与 herbs/formulas 互链。
7. 天纪 64 卦与 zimu 字幕、tianji 人间道章节的**卦名互链**。

## 工程

8. 简繁折叠表持续补字（normalize.ts T2S_PAIRS，按检索 miss 日志补）。
9. `docs/corpus/_cases/…959按人名` GBK 乱码残档：若上游修复编码则并入
   （与 bianhao/shenzhou358 判重后取增量）。
10. 发布 tag（v0.1.0）与 GitHub 仓库（install github:hackninety/nhx-ts-lib）。
