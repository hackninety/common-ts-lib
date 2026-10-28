# 底本来源

本库全部语料均取自公开网络来源，引入时锁定 commit；`npm run ingest` 可复现拉取。
条文文本为清代术数文献之社区数字化转录，原文本身已入公版；数字化录入的准确性
未经与刊本逐字校勘（保真度：第三方整理）。

## 一手数据（入库）

| 语料 | 上游 | 锁定 commit | 路径 | 说明 |
|------|------|-------------|------|------|
| 条文库 12000 条 | [Nanphy/TiebanshenshuOS](https://github.com/Nanphy/TiebanshenshuOS) | `785dc871d523` | `DB/List.csv` | 子集~亥集十二集，号 1001–13000，带年龄注记；UTF-8 |
| 取数表十五张 | 同上 | 同上 | `DB/14-*.csv` | 十四考取数表（14-11 分男女）；与 xaminxan 版逐字节同文 |
| 注解精选 29 条 | [wangdwn/mingli-lab](https://github.com/wangdwn/mingli-lab) | `cadb2f4fc34b` | `data/tiepan.json` | 题注「邵雍著，陈明点校《铁板神数》」节录 + 今注、分类、标签 |

### 上游源流

- 条文库与取数表的**原始录入者**为 [xaminxan/tiebanshenshu](https://github.com/xaminxan/tiebanshenshu)
  （`e17f30cb65b7`，GB18030 编码，`数据库/铁板神数-条文断词.csv` 与 List.csv 同文）；
  Nanphy/TiebanshenshuOS 为其致谢下游，统一 UTF-8 并补充考刻系统，本库据以引入。
- 两上游均未声明开源许可证（README 注「仅供学习交流」），条文文本为公版古籍内容；
  本库以研究/学习为目的收录并完整署名，许可证取 CC BY-NC 4.0（见 LICENSE）。

## 交叉参照（未入库）

调研中核对过的同族文本，供校勘参考：

- 知乎专栏《铁板神数12000条（上）》 zhuanlan.zhihu.com/p/3333325949 —— 同一录入源流
  （文字个别歧异，如 1004「行人为难/行人泥滑」）。
- 知乎专栏《铁板神数断语条文》 zhuanlan.zhihu.com/p/607141241 —— 源流与流派述评。
- seer100.com/tiebanshensu、tianji.best/tieban —— 在线条文精选/批命应用。
- 百度文库/Scribd 若干扫描件 —— 非结构化，未采用。
- 殆知阁 daizhigev20（易藏/术数）—— 无铁板神数本体，仅亲缘文本
  （《皇极经世》《秘本诸葛神数》《梅花易数》等），未收录。

## 方法文献

`docs/corpus/method/*.md`（概述/考刻/表格说明）为本库编写的综述，
依据上游 README 与 main.py 实现整理，非古籍原文；引用关系已在各篇文末注明。
