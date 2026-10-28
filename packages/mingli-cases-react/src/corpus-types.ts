// 面板只依赖这组结构，不把任何具体数据包静态导入浏览器。
export interface SourceMeta {
  id: string; title: string; url: string; revision: string;
  attribution: string; license: { code: string; content: string; notice: string };
}
export interface CollectionMeta {
  id: string; sourceId: string; title: string; year: number | null;
  kind: string; caseCount: number; questionCount: number;
}
export interface CaseIndex {
  id: string; sourceId: string; collectionId: string; title: string;
  year: number | null; gender: string; method: string; methodRaw: string | null;
  topics: string[]; questionCount: number; answerSource: string;
  timePrecision: string; timezoneKnown: boolean; hasReferenceCharts: boolean;
}
export interface CaseStudy {
  meta: CaseIndex;
  profile: { gender: string; birth: {
    year: number | null; month: number | null; day: number | null; hour: number | null; minute: number | null;
    birthNotes?: string[];
    place: string | null; timeRaw: string | null; raw: string | null; timePrecision: string;
    timezone: string | null; utcOffset: string | null; dst: boolean | null;
  } };
  context: string[];
  questions: { id: string; number: number | null; prompt: string; options: {label: string; text: string; raw: string}[] }[];
  provenance: {sourceUrl: string; documentUrl?: string; revision: string; rawPath: string; questionSources: string[]};
}
export interface CaseAnswers {
  caseId: string; answerSource: string;
  answers: {questionId: string; primaryAnswer: string; acceptedAnswers: string[]; note: string | null}[];
  knownEvents: Record<string, string[]>; notes: string[];
}
export interface ReferenceCharts {
  caseId: string; engine: {bazi: string; ziwei: string}; defaultTimeConvention: string;
  bazi: unknown; ziwei: unknown; conventions: {dayRollover: string; note: string};
}
export interface CorpusApi {
  getSources(): SourceMeta[];
  getCollections(): CollectionMeta[];
  getMethods(): {id: string; label: string}[];
  getTopics(): {id: string; label: string}[];
  getStats(): {cases: number; questions: number};
  getCaseIndex(filter?: {sourceId?: string; collectionId?: string; year?: number; method?: string; topic?: string; query?: string}): CaseIndex[];
  loadCase(id: string): Promise<CaseStudy | undefined>;
  loadCaseAnswers(id: string): Promise<CaseAnswers | undefined>;
  loadReferenceCharts(id: string): Promise<ReferenceCharts | undefined>;
  buildCasePrompt(study: CaseStudy, options?: {mode?: 'practice'|'reference'; answers?: CaseAnswers}): string;
}
