import assert from 'node:assert/strict';

const METHODS = ['bazi', 'ziwei', 'qimen', 'unknown'];
const TOPICS = ['relationship', 'wealth', 'family', 'career', 'health', 'education', 'timing', 'unknown'];
const ANSWER_SOURCES = ['official', 'secondary', 'unspecified'];
const requiredText = (value, field) => assert(typeof value === 'string' && value.trim(), `${field} must be a nonempty string`);
const nullableText = (value, field) => assert(value === null || typeof value === 'string', `${field} must be a string or null`);
const stringList = (value, field) => assert(Array.isArray(value) && value.every((item) => typeof item === 'string'), `${field} must be a string array`);
const enumValue = (value, values, field) => assert(values.includes(value), `Invalid ${field}: ${value}`);
const topicsOf = (values = ['unknown']) => {
  assert(Array.isArray(values) && values.length > 0 && values.every((topic) => TOPICS.includes(topic)), 'Invalid topics');
  assert(!values.includes('unknown') || values.length === 1, 'unknown cannot accompany an assigned topic');
  return [...new Set(values)];
};

/** Canonical user/source collections need no source-specific code or UI change. */
export function normalizeCanonical(input) {
  assert.equal(input.schemaVersion, 1, 'Unsupported canonical schemaVersion');
  const declared = input.source, original = input.collection;
  // Only public metadata belongs in the eager index, never arbitrary input fields.
  const source = Object.fromEntries(['id', 'title', 'url', 'revision', 'attribution', 'snapshotPath'].map((key) => [key, declared[key]]));
  source.license = Object.fromEntries(['code', 'content', 'notice'].map((key) => [key, declared.license[key]]));
  for (const [key, value] of Object.entries({ sourceId: source.id, collectionId: original.id })) assert(/^[a-z0-9][a-z0-9_-]*$/.test(value), `Invalid ${key}`);
  for (const key of ['title', 'url', 'revision', 'attribution', 'snapshotPath']) requiredText(source[key], `source.${key}`);
  for (const key of ['code', 'content', 'notice']) requiredText(source.license[key], `source.license.${key}`);
  requiredText(original.title, 'collection.title');
  requiredText(original.rawPath, 'collection.rawPath');
  enumValue(original.kind, ['contest', 'celebrity', 'curated'], 'collection.kind');
  enumValue(original.answerSource, ANSWER_SOURCES, 'collection.answerSource');
  assert(original.year === null || Number.isInteger(original.year), 'collection.year must be integer or null');
  const collection = {
    id: original.id, sourceId: source.id, title: original.title, kind: original.kind, year: original.year,
    answerSource: original.answerSource, rawPath: original.rawPath,
    questionSources: original.questionSources ?? [], answerSources: original.answerSources ?? [], scoring: original.scoring ?? null,
    caseCount: 0, questionCount: 0,
  };
  stringList(collection.questionSources, 'questionSources'); stringList(collection.answerSources, 'answerSources');
  nullableText(collection.scoring, 'collection.scoring');
  const cases = [], answers = [], charts = [], index = [], search = {};
  const personIds = new Set(), questionIds = new Set();
  assert(Array.isArray(input.cases), 'cases must be an array');
  for (const person of input.cases) {
    requiredText(person.personId, 'personId'); assert(!person.personId.includes('/'), 'personId cannot contain /');
    assert(!personIds.has(person.personId), `Duplicate personId ${person.personId}`); personIds.add(person.personId);
    requiredText(person.title, 'title'); enumValue(person.gender, ['male', 'female', 'unknown'], 'gender');
    enumValue(person.method, METHODS, 'method'); nullableText(person.methodRaw, 'methodRaw');
    assert(person.methodRaw !== null || person.method === 'unknown', 'An unrecorded source method must remain unknown');
    const b = person.birth;
    for (const [key, min, max] of [['year', 1, 9999], ['month', 1, 12], ['day', 1, 31]]) assert(b[key] === null || (Number.isInteger(b[key]) && b[key] >= min && b[key] <= max), `Invalid birth.${key}`);
    for (const [key, max] of [['hour', 23], ['minute', 59]]) assert(b[key] === null || (Number.isInteger(b[key]) && b[key] >= 0 && b[key] <= max), `Invalid birth.${key}`);
    assert(b.hour !== null || b.minute === null, 'A missing birth hour cannot have a known minute');
    for (const key of ['place', 'timeRaw', 'raw', 'timezone', 'utcOffset']) nullableText(b[key], `birth.${key}`);
    for (const key of ['approximate', 'dst']) assert(b[key] === null || typeof b[key] === 'boolean', `birth.${key} must be boolean or null`);
    enumValue(b.timePrecision, ['minute', 'branch', 'approximate-clock', 'unknown'], 'birth.timePrecision');
    assert(b.hour !== null || b.timePrecision === 'unknown', 'Missing birth hour must have unknown precision');
    const birth = Object.fromEntries(['year', 'month', 'day', 'hour', 'minute', 'place', 'approximate', 'timeRaw', 'raw', 'timePrecision', 'timezone', 'utcOffset', 'dst'].map((key) => [key, b[key]]));
    const provenance = {
      sourceUrl: source.url, revision: source.revision, rawPath: collection.rawPath,
      questionSources: collection.questionSources,
      ...(person.documentUrl ? { documentUrl: person.documentUrl } : {}),
    };
    if (person.documentUrl !== undefined) requiredText(person.documentUrl, 'documentUrl');
    const id = `${source.id}/${collection.id}/${person.personId}`;
    const topics = topicsOf(person.topics);
    const topicOrigin = topics[0] === 'unknown' ? 'unclassified' : person.topicOrigin;
    enumValue(topicOrigin, ['source', 'manual', 'unclassified'], 'topicOrigin');
    assert(Array.isArray(person.questions), 'questions must be an array');
    const questions = person.questions.map((question) => {
      requiredText(question.sourceQuestionId, 'sourceQuestionId');
      requiredText(question.prompt, 'question.prompt');
      const qid = `${id}/${question.sourceQuestionId}`;
      assert(!questionIds.has(qid), `Duplicate question ID ${qid}`); questionIds.add(qid);
      assert(question.number === null || Number.isInteger(question.number), 'question.number must be integer or null');
      assert(Array.isArray(question.options) && question.options.length > 1, 'Questions require at least two options');
      const options = question.options.map((option) => {
        for (const key of ['label', 'text', 'raw']) requiredText(option[key], `option.${key}`);
        return { label: option.label, text: option.text, raw: option.raw };
      });
      assert.equal(new Set(options.map((option) => option.label)).size, options.length, 'Duplicate option labels');
      return { id: qid, sourceQuestionId: question.sourceQuestionId, number: question.number, prompt: question.prompt, options, topics: topicsOf(question.topics) };
    });
    const meta = {
      id, sourceId: source.id, collectionId: collection.id, personId: person.personId, title: person.title,
      year: collection.year, gender: person.gender, method: person.method, methodRaw: person.methodRaw,
      topics, topicOrigin, questionCount: questions.length, answerSource: collection.answerSource,
      timePrecision: birth.timePrecision, timezoneKnown: Boolean(birth.timezone), hasReferenceCharts: Boolean(person.referenceCharts),
    };
    const context = person.context ?? []; stringList(context, 'context');
    cases.push({ answerVisibility: 'hidden', meta, profile: { gender: person.gender, birth }, context, questions, provenance });
    index.push(meta);
    search[id] = `${person.title}\n${birth.place ?? ''}\n${questions.map((question) => question.prompt).join('\n')}`.toLocaleLowerCase();
    if (person.answerData) {
      const rows = person.answerData.answers.map((answer) => {
        const question = questions.find((item) => item.sourceQuestionId === answer.sourceQuestionId);
        assert(question, `Answer refers to unknown question ${answer.sourceQuestionId}`);
        const acceptedAnswers = answer.acceptedAnswers ?? [answer.primaryAnswer];
        assert(Array.isArray(acceptedAnswers) && acceptedAnswers.length > 0 && acceptedAnswers.includes(answer.primaryAnswer), 'Invalid acceptedAnswers');
        assert(acceptedAnswers.every((label) => question.options.some((option) => option.label === label)), 'Answer label is not an option');
        nullableText(answer.note ?? null, 'answer.note');
        return { questionId: question.id, primaryAnswer: answer.primaryAnswer, acceptedAnswers, note: answer.note ?? null };
      });
      assert.equal(new Set(rows.map((row) => row.questionId)).size, rows.length, 'Duplicate question answer');
      const knownEvents = person.answerData.knownEvents ?? {}, notes = person.answerData.notes ?? [];
      for (const [topic, events] of Object.entries(knownEvents)) stringList(events, `knownEvents.${topic}`);
      stringList(notes, 'answer notes');
      answers.push({ answerVisibility: 'included', caseId: id, answerSource: collection.answerSource, answers: rows, knownEvents, notes, provenance });
    }
    if (person.referenceCharts) {
      const chart = person.referenceCharts;
      for (const key of ['bazi', 'ziwei']) requiredText(chart.engine[key], `chart.engine.${key}`);
      requiredText(chart.defaultTimeConvention, 'chart.defaultTimeConvention');
      requiredText(chart.conventions.dayRollover, 'chart.conventions.dayRollover');
      requiredText(chart.conventions.note, 'chart.conventions.note');
      charts.push({ caseId: id, status: 'upstream-reference', engine: chart.engine, defaultTimeConvention: chart.defaultTimeConvention,
        bazi: chart.bazi ?? null, ziwei: chart.ziwei ?? null, conventions: chart.conventions, provenance });
    }
  }
  collection.caseCount = cases.length; collection.questionCount = cases.reduce((sum, study) => sum + study.questions.length, 0);
  return { source, collection, cases, answers, charts, index, search };
}
