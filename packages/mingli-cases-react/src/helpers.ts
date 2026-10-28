import type {CorpusApi} from './corpus-types.js';

/** 关闭、换例或卸载以后，先前发出的异步请求不得更新选中参考。 */
export class SelectionSession {
  private generation = 0;
  begin() { return ++this.generation; }
  isCurrent(generation: number) { return this.generation === generation; }
}

export function asCorpusApi(value: unknown): CorpusApi {
  const methods = ['getSources', 'getCollections', 'getMethods', 'getTopics', 'getStats', 'getCaseIndex', 'loadCase', 'loadCaseAnswers', 'loadReferenceCharts', 'buildCasePrompt'];
  if (!value || typeof value !== 'object' || methods.some(key => typeof (value as Record<string, unknown>)[key] !== 'function')) {
    throw new Error('命例库接口不完整，请检查安装的版本。');
  }
  return value as CorpusApi;
}

export function safeSourceUrl(value: string): string | undefined {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}

export function birthClock(hour: number | null, minute: number | null, precision?: string): string {
  if (hour === null) return '时辰未提供';
  const value = `${String(hour).padStart(2, '0')}:${minute === null ? '??' : String(minute).padStart(2, '0')}`;
  const suffix = precision === 'unverified-clock' ? '（未核实）' : precision === 'placeholder' ? '（占位）' : precision === 'interval-midpoint' ? '（区间中点）' : '';
  return value + suffix;
}

export function birthDate(year: number | null, month: number | null, day: number | null): string {
  if (year === null && month === null && day === null) return '公历日期未提供';
  return `${year ?? '未知年'}-${month === null ? '未知月' : String(month).padStart(2,'0')}-${day === null ? '未知日' : String(day).padStart(2,'0')}`;
}
