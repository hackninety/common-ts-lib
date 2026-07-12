# 来源目录（GitHub 倪海厦相关仓库全量盘点）

2026-07-13 检索 GitHub（关键词：倪海厦/倪海廈/nihaixia/nihaisha/人纪/天纪 等），
共发现约 55 个相关仓库。按取用情况分类如下；已收录仓库的 commit 锁定见
`docs/corpus/_meta/sources.json` 与运行时 `getSources()`。

## 〇、站点采集（视频索引底本）

| 来源 | 取用 | 说明 |
|---|---|---|
| [汉唐中医网](https://www.hantang.org.cn/nihaixia/)（hantang.org.cn） | 视频页 3593–3598 快照 → `docs/corpus/_videos/` | 人纪五部 + 天纪的 Bilibili 直链索引（6 系列 139 集，2026-07-13 采集）；本库仅收录链接与集名，视频内容归 B 站上传者与权利人 |

## 一、已收录（5 个，语料底本）

| 仓库 | 星 | 取用 | 说明 |
|---|---|---|---|
| [nivance/nihaixia-kb](https://github.com/nivance/nihaixia-kb) | ★5 | `raw/` 全部讲稿/医案/天纪/地纪/讲座/专题/汉唐方剂/相学 | 最完整的一手文字稿汇编（4574 md），带 source_path 溯源 frontmatter；系 9527qingfeng 仓库的再整理超集。其 `wiki/`（2676 md）为衍生词条，未收录 |
| [qmzz/ni-haisha-tcm-skill](https://github.com/qmzz/ni-haisha-tcm-skill) | ★2 | `knowledge/{herbs,acupoints,formulas}` | 逐实体结构化（性味/归经/功效/主治 + 人纪原文引用页码，标注 verified 追溯状态）。其 cases/concepts/diagnosis 含 AI 合成示例与 no_source_found 条目，**未收录** |
| [wesky-online/zhongli_data](https://github.com/wesky-online/zhongli_data) | ★0 | `json数据/` 五书逐字稿 | 重黎团队人纪视频同步文稿，段落级（书/章/段/上下文/哈希），6486 段；数据源 PDF（人纪原版讲义 C 版五册）一并在库，未嵌入 |
| [dreams-flying/nihaixia-tianji](https://github.com/dreams-flying/nihaixia-tianji) | ★0 | `天纪-视频课程字幕-md/` 13 篇 | 天纪视频字幕逐字稿（另有 docx/pdf 合集与截图，未嵌入） |
| [wh149728915-stack/nihaixia-64gua](https://github.com/wh149728915-stack/nihaixia-64gua) | ★1 | `explanations/` 64 卦 | 天纪·人间道 64 卦逐卦详文（含卦象字符），配图未嵌入 |

上游再溯源：nivance 库主体转录自
[9527qingfeng/hantang-nihaixia-follower](https://github.com/9527qingfeng/hantang-nihaixia-follower)（★340，
1630 md + 1417 doc 原稿，倪海厦外门弟子整理）；该仓库另有 `妙方收集/小编医案/精选书籍（陈士铎）`
等编者个人内容，属第三方创作，未收录。

## 二、衍生知识库 / AI Skill（登记未收录 —— 内容系对同一底本的 AI 蒸馏或再组织，保真度低于底本）

| 仓库 | 星 | 内容 |
|---|---|---|
| [JuneYaooo/nihaisha-nishi-tcm](https://github.com/JuneYaooo/nihaisha-nishi-tcm) | ★1098 | Agent Skill：课程检索/方证穴位辨析/板书截图证据索引（references 62 md 14MB，含 screenshot-evidence 索引）。多个仓库（hyzx5168、ggxc0930、suw294550-boop、shenlan088）为其复刻 |
| [jangviktor-web/nihaixia](https://github.com/jangviktor-web/nihaixia) | ★215 | 倪海厦视角 Skill：伤寒/金匮/内经蒸馏模块 + 表达风格研究（29 md）；jangviktor-web/nihaixia-app 为其安卓端 |
| [xiaojian94xiaojian/nihaixia-tcm-wiki](https://github.com/xiaojian94xiaojian/nihaixia-tcm-wiki) | ★17 | karpathy 方法论知识库（515 md 28MB：derived/chunks 分块 + 来源 145 篇），Claude Code Skill 封装 |
| [huoyalong/nihaisha-skill](https://github.com/huoyalong/nihaisha-skill) | ★23 | 倪海厦 skill（32KB） |
| [jonhnsonzz/nihaisha-renji](https://github.com/jonhnsonzz/nihaisha-renji) / [nihaisha-tianji](https://github.com/jonhnsonzz/nihaisha-tianji) | ★4/4 | 人纪/天纪知识系统（references 编译稿 + MCP server） |
| [Lance-myk/NiHaisha-Agent](https://github.com/Lance-myk/NiHaisha-Agent) | ★4 | 人纪系列 AI 顾问 |
| [xiaogege6697/tcm-db](https://github.com/xiaogege6697/tcm-db) | ★2 | SQLite 知识库（3867 条：中药/方剂/医案/经典/针灸/天纪，schema_v2），治理文档完善；与 qmzz 同源同类，取其一 |
| [phamhien4278n-hub/nihaisha-renji](https://github.com/phamhien4278n-hub/nihaisha-renji) | ★3 | 人纪记忆宫殿学习系统（164 md） |
| [zenoyang-ai/nihaixia-knowledge-graph](https://github.com/zenoyang-ai/nihaixia-knowledge-graph) / [nihaixia-tianji-skill](https://github.com/zenoyang-ai/nihaixia-tianji-skill) | ★1/0 | 知识图谱网站 / 天纪学习 skill |
| [qmzz/ni-haisha-xcx](https://github.com/qmzz/ni-haisha-xcx) | ★0 | 微信小程序（经方助手） |
| 其余小型 skill/agent | — | T1ziyouren/nihaixia--perspective（★7）、wjpvip-cloud/nihaixia、2559063619/ni-haixia-perspective、baodirewolf/perspective-skills、zrxparley/ni-haixia-tcm-skill、william22820785-cmyk/nishi-tcm-consultant、Ref96/nihaixia、zlw011/nihaixia-tcm、kirchenX/Nihaixia、qintao0203/nihaixia、hotterry/tcm-diagnosis、liuweihongliuxinyu/tcm-mcp-server、l18915391698-commits/nihaixia-agent、sanshanchen/ni-haixia-fengshui-skill、Superbishop/ni-haixia-moxibustion-guide、pphh4250/hermes-tongue-diagnosis、17768166355/tcm-acupuncture-system、youzi17/chat-system-backend、JuneYaooo/nihaisha-rag-prototype |

## 三、天纪/命理衍生工程（登记未收录）

| 仓库 | 星 | 内容 |
|---|---|---|
| [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu) | ★3142 | 紫微斗数排盘引擎（基于天纪体系，含四化/格局/古籍数据 ts）；排盘算法与本语料库定位不同，宿主可直接并用。abutang-droid/ziwei-doushu、sandrashi0704-cpu/ziweimaster 为同源 |
| [coating8888-cmyk/ni-shi-dou-shu](https://github.com/coating8888-cmyk/ni-shi-dou-shu) | ★0 | 斗数决策系统；`knowledge/processed/extracted` 有天纪全集文字稿（1.1MB txt）、天机道听课笔记、地纪 8 篇 txt、八纲辨证文稿 —— 与已收录的 nivance 天纪/地纪、dreams 字幕内容重叠，未再收录 |
| [jonhnsonzz/nihaisha-tianji](https://github.com/jonhnsonzz/nihaisha-tianji) | ★4 | （见上表） |
| [maxchoy88/bazhi](https://github.com/maxchoy88/bazhi)、[zhixiangshang-hash/-](https://github.com/zhixiangshang-hash/-) | ★0 | 紫微详批/排盘网站 |
| [lihuacatnb/Nihaixia-FaceReading-Annotations](https://github.com/lihuacatnb/Nihaixia-FaceReading-Annotations) | ★1 | 面相教学重构批注（正文为 docx，未嵌入；本库相学分支已含 nivance 相学注解 md） |
| [richardzhaogrit/-](https://github.com/richardzhaogrit/-) | ★0 | 针灸大成学习笔记（第三方笔记） |
| [aiist007/24life](https://github.com/aiist007/24life) | ★7 | 节气养生网站（衍生应用） |

## 四、PDF / 视频 / 音频 / 网站镜像（登记未嵌入 —— 非文本或需另行 OCR/转录）

| 仓库 | 星 | 内容 |
|---|---|---|
| [elliott10/ebook-nihaixia](https://github.com/elliott10/ebook-nihaixia) | ★32 | 倪师笔记与书籍 PDF/doc 61+16 册（含天纪/地纪教材扫描） |
| [Anita-Mul/nihaisha](https://github.com/Anita-Mul/nihaisha) | ★17 | 倪海厦 PDF 合集 |
| [Lance-myk/Traditional-Chinese-Medicine-nihaisha](https://github.com/Lance-myk/Traditional-Chinese-Medicine-nihaisha) | ★8 | 高清教学视频 + 原版 PDF 讲义 + 课件（530MB） |
| [wanghao28/nihaixia](https://github.com/wanghao28/nihaixia) / [jcold/hantang](https://github.com/jcold/hantang) | ★8/0 | **汉唐中医官网镜像**（chinese/ch_Articles 约 3779 篇 htm：倪师每周文章/评论/问答）——第一手资料的最大未收录矿藏，见 Todo |
| [jasonbai008/nihaixia](https://github.com/jasonbai008/nihaixia) | ★3 | 梁冬对话倪海厦 m4a 音频（文字版已收录于讲座分支） |
| [yuqiguang/nihaixia](https://github.com/yuqiguang/nihaixia) | ★0 | 数字人项目：56 PDF + 55 视频切片 |
| [dreams-flying/nihaixia-tianji](https://github.com/dreams-flying/nihaixia-tianji) | ★0 | （字幕已收录；其 docx/pdf 合集与截图未嵌入） |
| [privateheart/renji](https://github.com/privateheart/renji) | ★9 | 人纪学习笔记（图片为主） |
| [leijimu/nihaixia](https://github.com/leijimu/nihaixia) | ★1 | 纪念站单页（生平简介） |
| [Dujltqzv/Some-Many-Books](https://github.com/Dujltqzv/Some-Many-Books) | ★21117 | 通用书单仓库，含倪师书籍条目 |
| [upupzhao/zhongyi](https://github.com/upupzhao/zhongyi) | ★6 | 倪师推荐 8 本书清单 |
| [bz5fang/chinese-medicine](https://github.com/bz5fang/chinese-medicine) | ★1 | 多家中医课程链接合集 |

## 五、空壳 / 无实质内容（登记）

Yxj-515/-、yuqiguang10/nihaixia、chunjie008/nihaixia、starascendin/nihaixia-collection、
youlenanan/NiHaiXia_study_allFile、l18915391698-commits/nihaixia-agent、
nihaixiamed/nihaixiamed.github.io、youxunzhang/nihaixiaorg（构建产物无源文）、
46832632/nihaisha-legacy-website（占位）、shenlan088/…（0KB fork 壳）。

## 取舍原则

1. **文本优先**：只嵌入可校验的文字底本；PDF/视频/图片登记出处，供 Todo 阶段 OCR/转录。
2. **就近上游**：同一内容多仓流传时取最接近转录源、带溯源信息的一份（nivance > 各家 wiki/chunks）。
3. **保真分级**：AI 蒸馏/合成内容不入语料（qmzz cases、各家 skill 的 distilled 模块），
   结构化字段仅取有原文引用支撑的实体条目。
4. **锁定 commit**：引入即锁定，升级须重跑 ingest 并过全部完整性测试。
