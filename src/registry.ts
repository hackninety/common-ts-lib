/**
 * 注册表与库级元信息（轻量同步；条文等重载荷一律走各子入口懒加载）
 */
import registryData from './data/registry.json';
import statsData from './data/corpus-stats.json';
import type { SourceRepo } from './types';

const reg = registryData as unknown as { sources: SourceRepo[] };

/** 底本来源仓库（URL + 引入时锁定 commit） */
export function getSources(): SourceRepo[] {
  return reg.sources;
}

/** 语料规模统计（构建期生成，测试锚点）：verses/volumes/tables/annotated/… */
export function getCorpusStats(): Record<string, unknown> {
  return statsData as Record<string, unknown>;
}

/**
 * 保真度声明：条文库为清代术数文献之社区数字化转录（第三方整理），
 * 未经与刊本逐字校勘，文字或与他本有出入；结构化时的修复均登记于
 * `getCorpusStats().textualIssues`。
 */
export const FIDELITY_NOTE =
  '底本为社区数字化转录（第三方整理），未经与清刊本逐字校勘，引用研究请核对原典。';

/** 免责声明（宿主展示条文时建议一并呈现） */
export const DISCLAIMER =
  '铁板神数为历史术数文献。本语料库仅供文献研究、数字人文与传统文化学习之用，' +
  '不构成任何命运预测依据，请勿据以做出人生决策。';
