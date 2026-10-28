/** Stable identifiers include source / collection / upstream person identifiers. */
export type MethodId = 'bazi' | 'ziwei' | 'qimen' | 'unknown';
export type TopicId = 'relationship' | 'wealth' | 'family' | 'career' | 'health' | 'education' | 'timing' | 'unknown';
export type AnswerSource = 'official' | 'secondary' | 'unspecified';
export type Gender = 'male' | 'female' | 'unknown';
export type TimePrecision = 'minute' | 'branch' | 'approximate-clock' | 'interval-midpoint' | 'unverified-clock' | 'placeholder' | 'unknown';
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface SourceMeta {
  id: string;
  title: string;
  url: string;
  revision: string;
  license: { code: string; content: string; notice: string };
  attribution: string;
  snapshotPath: string;
}

export interface CollectionMeta {
  id: string;
  sourceId: string;
  title: string;
  kind: 'contest' | 'celebrity' | 'curated';
  year: number | null;
  caseCount: number;
  questionCount: number;
  answerSource: AnswerSource;
  rawPath: string;
  /** URLs only; original explanatory strings may disclose answers and stay in the snapshot. */
  questionSources: string[];
  answerSources: string[];
  scoring: string | null;
}

export interface CaseIndex {
  id: string;
  sourceId: string;
  collectionId: string;
  personId: string;
  title: string;
  year: number | null;
  gender: Gender;
  method: MethodId;
  methodRaw: string | null;
  topics: TopicId[];
  topicOrigin: 'source' | 'manual' | 'derived-question-keywords' | 'unclassified';
  questionCount: number;
  answerSource: AnswerSource;
  timePrecision: TimePrecision;
  timezoneKnown: boolean;
  hasReferenceCharts: boolean;
}

export interface BirthRecord {
  year: number | null;
  month: number | null;
  day: number | null;
  hour: number | null;
  minute: number | null;
  place: string | null;
  /** Public birth/time provenance only; never answers or known events. */
  birthNotes?: string[];
  /** null means upstream does not specify; a branch midpoint is never exact clock time. */
  approximate: boolean | null;
  timeRaw: string | null;
  raw: string | null;
  timePrecision: TimePrecision;
  timezone: string | null;
  utcOffset: string | null;
  dst: boolean | null;
}

export interface CaseProvenance {
  sourceUrl: string;
  /** An explicit document link; a source need not be a GitHub repository. */
  documentUrl?: string;
  revision: string;
  rawPath: string;
  questionSources: string[];
}

export interface PracticeQuestion {
  id: string;
  sourceQuestionId: string;
  number: number | null;
  prompt: string;
  options: { label: string; text: string; raw: string }[];
  topics: TopicId[];
}

/** This shape deliberately has no answers, biographies, or curator notes. */
export interface CaseStudy {
  answerVisibility: 'hidden';
  meta: CaseIndex;
  profile: { gender: Gender; birth: BirthRecord };
  context: string[];
  questions: PracticeQuestion[];
  provenance: CaseProvenance;
}

export interface CaseAnswers {
  answerVisibility: 'included';
  caseId: string;
  answerSource: AnswerSource;
  answers: { questionId: string; primaryAnswer: string; acceptedAnswers: string[]; note: string | null }[];
  /** Upstream recorded claims, not independently verified facts or predictions. */
  knownEvents: Record<string, string[]>;
  notes: string[];
  provenance: CaseProvenance;
}

export interface ReferenceCharts {
  caseId: string;
  status: 'upstream-reference';
  engine: { bazi: string; ziwei: string };
  defaultTimeConvention: string;
  /** Unmodified upstream chart objects; never silently substituted for a host engine's chart. */
  bazi: JsonValue | null;
  ziwei: JsonValue | null;
  conventions: { dayRollover: string; note: string };
  provenance: CaseProvenance;
}

export interface CaseFilter {
  sourceId?: string;
  collectionId?: string;
  year?: number;
  method?: MethodId;
  topic?: TopicId;
  /** Searches titles, question stems and birthplace only, never answer material. */
  query?: string;
}

export interface PromptOptions {
  mode?: 'practice' | 'reference';
  /** Ignored in practice mode, even when supplied accidentally. */
  answers?: CaseAnswers;
  maxChars?: number;
}

export interface CorpusStats {
  sources: number;
  collections: number;
  cases: number;
  questions: number;
  casesByMethod: Record<MethodId, number>;
  questionsByMethod: Record<MethodId, number>;
  questionsByAnswerSource: Record<AnswerSource, number>;
}
