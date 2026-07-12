/**
 * 语料引入（一次性 bootstrap；docs/corpus 为库内规范底本，日常构建不需要再跑本脚本）
 *
 * 从 GitHub 克隆的源仓库（默认在会话 scratchpad，可用 NHX_SRC 覆盖）拷贝文本底本到
 * docs/corpus/，保持源文件原样（含 frontmatter），由 scripts/gen-data.mjs 解析归一。
 * 同时落 docs/corpus/_meta/sources.json 记录每个源仓库的 URL/commit 与取用路径。
 *
 * 取用与舍弃的完整决策记录见 docs/sources.md。
 */
import { cpSync, mkdirSync, readdirSync, statSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = process.env.NHX_SRC
  || 'C:/Users/ADMIN/AppData/Local/Temp/claude/D--WWW-nhx-ts-lib/867b61c7-be4a-4cdf-b18f-ccc3065b2fac/scratchpad/repos';
const OUT = path.join(root, 'docs/corpus');

const NIVANCE = 'nivance__nihaixia-kb/raw';

/** 拷贝任务：slug/group ← 源仓库相对目录（仅 .md/.txt/.json） */
const COPY = [
  // ---- 人纪五部（听课整理稿，nivance/nihaixia-kb 汇编自 9527qingfeng/hantang-nihaixia-follower）----
  { to: 'zhenjiu/ben', from: `${NIVANCE}/人纪/针灸` },
  { to: 'neijing/ben', from: `${NIVANCE}/人纪/黄帝内经` },
  { to: 'bencao/zonglun', from: `${NIVANCE}/人纪/神农本草经`, filesOnly: true },
  { to: 'bencao/shang', from: `${NIVANCE}/人纪/神农本草经/上经` },
  { to: 'bencao/zhong', from: `${NIVANCE}/人纪/神农本草经/中经` },
  { to: 'bencao/xia', from: `${NIVANCE}/人纪/神农本草经/下经` },
  { to: 'bencao/buchong', from: `${NIVANCE}/人纪/神农本草经/倪师补充`, filesOnly: true },
  { to: 'bencao/buchong-bianji', from: `${NIVANCE}/人纪/神农本草经/倪师补充/小编补充药物` },
  { to: 'shanghan/ben', from: `${NIVANCE}/人纪/伤寒论` },
  { to: 'jingui/ben', from: `${NIVANCE}/人纪/金匮要略`, filesOnly: true },
  { to: 'jingui/anli', from: `${NIVANCE}/人纪/金匮要略/26.临床案例和方剂补充处方` },
  { to: 'jingui/liangong', from: `${NIVANCE}/人纪/金匮要略/27.总结所有练功的方法` },
  { to: 'jingui/zhenjiu-buchong', from: `${NIVANCE}/人纪/金匮要略/28.临床针灸加处方补充` },
  { to: 'bimen/ben', from: `${NIVANCE}/人纪/闭门课`, filesOnly: true },
  { to: 'bimen/dizi-ketang', from: `${NIVANCE}/人纪/闭门课/弟子课堂` },
  // ---- 人纪附录（整理者总结/弟子分享，第三方）----
  { to: 'fulu/zongjie', from: `${NIVANCE}/人纪`, filesOnly: true },
  { to: 'fulu/dizi', from: `${NIVANCE}/人纪/倪师弟子多年行医经验/杨贞` },
  // ---- 天纪 / 地纪 ----
  { to: 'tianji/01-tianjidao', from: `${NIVANCE}/天纪/01天机道` },
  { to: 'tianji/02-ziwei', from: `${NIVANCE}/天纪/02紫微斗数`, filesOnly: true },
  { to: 'tianji/02-ziwei-gong', from: `${NIVANCE}/天纪/02紫微斗数/紫薇十二宫详解` },
  { to: 'tianji/02-ziwei-anli', from: `${NIVANCE}/天纪/02紫微斗数/紫薇斗数案例` },
  { to: 'tianji/03-dimai', from: `${NIVANCE}/天纪/03地脉道` },
  { to: 'tianji/04-renjian', from: `${NIVANCE}/天纪/04人间道` },
  { to: 'tianji/05-kanyu', from: `${NIVANCE}/天纪/05堪舆学` },
  { to: 'tianji/06-liushen', from: `${NIVANCE}/天纪/06六神占断` },
  { to: 'tianji/07-shouxiang', from: `${NIVANCE}/天纪/07手相` },
  { to: 'tianji/08-sizhu', from: `${NIVANCE}/天纪/08四柱命卦` },
  { to: 'tianji/09-guina', from: `${NIVANCE}/天纪/09归纳总结` },
  { to: 'tianji/10-xingzuo', from: `${NIVANCE}/天纪/10星座` },
  { to: 'diji/ben', from: `${NIVANCE}/地纪` },
  // ---- 讲座 / 专题 / 汉唐方剂 / 相学 ----
  { to: 'jiangzuo/zhongjing', from: `${NIVANCE}/讲座/仲景心法`, filesOnly: true },
  { to: 'jiangzuo/fuyang', from: `${NIVANCE}/讲座/扶阳论坛`, recursive: true },
  { to: 'jiangzuo/stanford', from: `${NIVANCE}/讲座/斯坦福演讲` },
  { to: 'jiangzuo/liangdong', from: `${NIVANCE}/讲座/梁冬对话` },
  { to: 'jiangzuo/jingfang', from: `${NIVANCE}/讲座/经方妙用` },
  { to: 'zhuanti/ben', from: `${NIVANCE}/专题` },
  { to: 'fangjie/ben', from: `${NIVANCE}/汉唐方剂` },
  { to: 'xiangxue/ben', from: `${NIVANCE}/其他/相学` },
  // ---- 天纪视频字幕（dreams-flying/nihaixia-tianji，逐字稿）----
  { to: 'zimu/ben', from: 'dreams-flying__nihaixia-tianji/天纪-视频课程字幕-md' },
  // ---- 医案（nivance raw/医案；959按人名目录为 GBK 乱码且与其余重复，弃）----
  { to: '_cases/bianhao', from: `${NIVANCE}/医案`, filesOnly: true },
  { to: '_cases/riji2005', from: `${NIVANCE}/医案/2005年日志` },
  { to: '_cases/riji2006', from: `${NIVANCE}/医案/2006年日志` },
  { to: '_cases/riji2007', from: `${NIVANCE}/医案/2007年日志` },
  { to: '_cases/riji2008', from: `${NIVANCE}/医案/2008年日志` },
  { to: '_cases/zhenliao2005', from: `${NIVANCE}/医案/2005年诊疗日志` },
  { to: '_cases/zhenliao2006', from: `${NIVANCE}/医案/2006年诊疗日志` },
  { to: '_cases/shenzhou358', from: `${NIVANCE}/医案/倪海厦08年医案358篇(神州医料库）` },
  { to: '_cases/renjiban', from: `${NIVANCE}/医案/倪海厦人纪班学的诊疗医案(神州医料库）` },
  { to: '_cases/luyin', from: `${NIVANCE}/医案/录音坐诊医案` },
  { to: '_cases/jilu', from: `${NIVANCE}/医案/1500个医案记录` },
  // ---- 结构化实体（qmzz/ni-haisha-tcm-skill knowledge）----
  { to: '_structured/herbs', from: 'qmzz_ni-haisha-tcm-skill/knowledge/herbs' },
  { to: '_structured/acupoints', from: 'qmzz_ni-haisha-tcm-skill/knowledge/acupoints' },
  { to: '_structured/formulas', from: 'qmzz_ni-haisha-tcm-skill/knowledge/formulas' },
  // ---- 人纪视频逐字稿（wesky-online/zhongli_data 重黎数据集）----
  { to: '_transcripts', from: 'wesky-online_zhongli_data/json数据' },
  // ---- 天纪 64 卦详解（wh149728915-stack/nihaixia-64gua）----
  { to: '_gua64', from: 'wh149728915-stack_nihaixia-64gua/explanations' },
];

/** 源仓库注册表（provenance；sha 由 ingest 时解析） */
const REPOS = [
  ['nivance__nihaixia-kb', 'https://github.com/nivance/nihaixia-kb', '讲稿/医案/天纪/专题/方剂讲解 主底本（汇编自 9527qingfeng/hantang-nihaixia-follower 等）'],
  ['qmzz_ni-haisha-tcm-skill', 'https://github.com/qmzz/ni-haisha-tcm-skill', '中药/穴位/方剂 结构化实体（含人纪原文引用）'],
  ['wesky-online_zhongli_data', 'https://github.com/wesky-online/zhongli_data', '人纪五部视频逐字稿段落级 JSON（重黎医案数据集）'],
  ['dreams-flying__nihaixia-tianji', 'https://github.com/dreams-flying/nihaixia-tianji', '天纪视频课程字幕 markdown'],
  ['wh149728915-stack_nihaixia-64gua', 'https://github.com/wh149728915-stack/nihaixia-64gua', '天纪 64 卦图解详文'],
];

const isText = (f) => /\.(md|txt|json)$/i.test(f);
let copied = 0;

for (const task of COPY) {
  const srcDir = path.join(SRC, task.from);
  if (!existsSync(srcDir)) {
    console.error(`MISSING SOURCE: ${task.from}`);
    continue;
  }
  const outDir = path.join(OUT, task.to);
  mkdirSync(outDir, { recursive: true });
  const walk = (dir, rel = '') => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (task.recursive) walk(full, path.join(rel, name));
        continue; // filesOnly / 默认：子目录由各自任务处理
      }
      if (!isText(name)) continue;
      const destName = rel ? `${rel.replaceAll(path.sep, '·')}·${name}` : name;
      copyFileSync(full, path.join(outDir, destName.replace(/\.txt$/i, '.md')));
      copied++;
    }
  };
  walk(srcDir);
}

// provenance
const meta = { ingestedAt: new Date().toISOString().slice(0, 10), repos: [] };
for (const [dir, url, note] of REPOS) {
  let sha = 'unknown';
  try {
    sha = execSync(`git -C "${path.join(SRC, dir)}" rev-parse HEAD`, { encoding: 'utf8' }).trim();
  } catch { /* 源不在时保留 unknown */ }
  meta.repos.push({ url, commit: sha, note });
}
mkdirSync(path.join(OUT, '_meta'), { recursive: true });
writeFileSync(path.join(OUT, '_meta/sources.json'), JSON.stringify(meta, null, 2) + '\n');

console.log(`ingest ok: ${copied} files → docs/corpus/`);
