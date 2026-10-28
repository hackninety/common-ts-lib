/**
 * AI 分析 —— 提示词组装（无 UI 依赖，可在任意宿主复用）
 *
 * 检索策略：按盘面命中（chart.refs：三传法门、卅六卦、占类章节）从内置书籍数据
 * 精确取原文条文，随课盘 JSON 一并交给模型「依经断课」。
 */
import chaptersData from './data/chapters.json';
import gua36Data from './data/gua36.json';
import type { ZsljChart } from './types';

export interface RefFragment {
  id: string;
  heading: string;
  text: string;
}

/** 依 refs 收集原文条文（章节 + 卅六卦） */
export function collectRefs(chart: ZsljChart): RefFragment[] {
  const out: RefFragment[] = [];
  for (const id of chart.refs) {
    if (/^26\d\d$/.test(id)) {
      const g = gua36Data.guas.find((x) => x.id === id);
      if (g) out.push({ id, heading: g.heading, text: g.text });
    } else {
      const c = chaptersData.chapters.find((x) => x.id === id);
      if (c) out.push({ id, heading: c.heading || c.title, text: c.text });
    }
  }
  return out;
}

/** 课盘瘦身：AI 无需 UI 冗余字段 */
export function chartForAI(chart: ZsljChart) {
  return {
    流派: chart.meta.school,
    输入: chart.input,
    天地盘: chart.gong.map((g) => ({
      地盘: g.diZhi, 天盘: g.tianZhi, 天将: g.jiang, 遁干: g.dunGan, 旬空: g.isKong || undefined, 标记: g.marks.length ? g.marks : undefined,
    })),
    四课: chart.sike.map((k) => ({ 课: k.name, 上神: k.shang, 下: k.xia, 天将: k.jiang, 克应: k.relation })),
    三传: {
      法门: chart.sanchuan.method,
      初传: chart.sanchuan.chu,
      中传: chart.sanchuan.zhong,
      末传: chart.sanchuan.mo,
      判定路径: chart.sanchuan.path.map((p) => `【${p.fa}】${p.note}`),
    },
    贵人: chart.tianjiang,
    命中卦: chart.gua.map((g) => ({ 卦: g.name, 判定: g.why, 可信度: g.certainty })),
    杂法: chart.derive,
    占断助手: chart.zhanduan,
  };
}

export const SYSTEM_PROMPT = `你是研究安倍晴明《占事略決》（983 年前后，六壬式占）的助手。请只依据【原文条文】断课：
1. 断语必须给出条文出处（用条文 id 标注，如 [senji27]、[2603]）；
2. 原文未涉及之处明确说明「书中无此法」，不得引入后世六壬（明清《六壬大全》体系）的规则补断；
3. 先总述课体格局，再依占问逐条引文分析，最后给出综合参断与吉凶期；
4. 语气克制，说明此为古籍规则的推演，供研究参考。`;

export function buildUserPrompt(chart: ZsljChart, question: string): string {
  const refs = collectRefs(chart);
  const refText = refs
    .map((r) => `[${r.id}] ${r.heading}\n${r.text}`)
    .join('\n\n---\n\n');
  return [
    '【课盘】',
    JSON.stringify(chartForAI(chart), null, 1),
    '',
    '【原文条文】',
    refText,
    '',
    '【占问】',
    question.trim() || '未指明占问，请作通盘分析。',
  ].join('\n');
}

/** 完整提示词（复制到任意对话式 AI 即可用） */
export function buildClipboardPrompt(chart: ZsljChart, question: string): string {
  return `${SYSTEM_PROMPT}\n\n${buildUserPrompt(chart, question)}`;
}
