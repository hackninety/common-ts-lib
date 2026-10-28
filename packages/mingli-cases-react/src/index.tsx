import {useEffect, useMemo, useRef, useState} from 'react';
import type {CaseAnswers, CaseStudy, CorpusApi, ReferenceCharts} from './corpus-types.js';
import {asCorpusApi, birthClock, birthDate, safeSourceUrl, SelectionSession} from './helpers.js';
import {panelStyle} from './style.js';

export interface CaseReference {
  caseId: string;
  title: string;
  text: string;
  sourceUrl: string;
  sourceRevision: string;
  collectionId: string;
  mode: 'reference';
}
export interface MingliCaseLibraryProps {
  /** 调用方只在用户打开入口且模式允许时挂载此组件。请传稳定的模块级函数。 */
  loadLibrary: () => Promise<unknown>;
  onReferenceChange?: (reference: CaseReference | null) => void;
  preferredChart?: 'bazi' | 'ziwei';
  title?: string;
}
const answerLabels: Record<string, string> = {official:'官方公布', secondary:'转载答案', unspecified:'来源未注明'};
const precisionLabels: Record<string, string> = {minute:'原文有钟点', branch:'原文仅给时辰（钟点为中点）', 'approximate-clock':'近似钟点', unknown:'时间精度未明'};

export function MingliCaseLibrary({loadLibrary, onReferenceChange, preferredChart = 'bazi', title = '命例库'}: MingliCaseLibraryProps) {
  const [api, setApi] = useState<CorpusApi>();
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState('');
  const [sourceId, setSource] = useState('');
  const [collectionId, setCollection] = useState('');
  const [year, setYear] = useState('');
  const [method, setMethod] = useState('');
  const [topic, setTopic] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [study, setStudy] = useState<CaseStudy>();
  const [answers, setAnswers] = useState<CaseAnswers>();
  const [charts, setCharts] = useState<ReferenceCharts>();
  const [chartKind, setChartKind] = useState(preferredChart);
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');
  const [reference, setReference] = useState<CaseReference | null>(null);
  const session = useRef(new SelectionSession());
  const generation = useRef(0);
  const referenceCallback = useRef(onReferenceChange);
  useEffect(() => {referenceCallback.current = onReferenceChange;}, [onReferenceChange]);
  useEffect(() => {
    let active = true;
    setError('');
    loadLibrary().then(value => {if (active) setApi(asCorpusApi(value));}).catch(cause => {if (active) setError(String(cause instanceof Error ? cause.message : cause));});
    return () => {active = false; session.current.begin();};
  }, [loadLibrary, loadAttempt]);

  const sources = api?.getSources() ?? [];
  const collections = api?.getCollections() ?? [];
  const methods = api?.getMethods() ?? [];
  const topics = api?.getTopics() ?? [];
  const methodName = (id: string) => methods.find(item => item.id === id)?.label ?? id;
  const topicName = (id: string) => topics.find(item => item.id === id)?.label ?? id;
  const visible = useMemo(() => {
    const collection = api?.getCollections().find(item=>`${item.sourceId}/${item.id}`===collectionId);
    return api?.getCaseIndex({
      sourceId:collection?.sourceId ?? (sourceId || undefined), collectionId:collection?.id, year:year ? Number(year) : undefined,
      method:method || undefined, topic:topic || undefined, query:query || undefined,
    }) ?? [];
  }, [api, sourceId, collectionId, year, method, topic, query]);
  const years = [...new Set(collections.flatMap(item => item.year === null ? [] : [item.year]))].sort((a,b)=>b-a);

  function clearReference() {setReference(null); referenceCallback.current?.(null);}
  function cancelReference() {
    generation.current = session.current.begin(); setBusy(''); clearReference(); setStatus('已清除 AI 参考。');
  }
  async function selectCase(id: string) {
    const request = session.current.begin(); generation.current = request;
    setSelectedId(id); setStudy(undefined); setAnswers(undefined); setCharts(undefined); setBusy('case'); setStatus(''); setError(''); clearReference();
    try {
      const value = await api!.loadCase(id);
      if (session.current.isCurrent(request)) {
        if (!value) throw new Error('找不到该命例。');
        setStudy(value);
      }
    } catch (cause) {if (session.current.isCurrent(request)) setError(String(cause instanceof Error ? cause.message : cause));}
    finally {if (session.current.isCurrent(request)) setBusy('');}
  }
  async function revealAnswers() {
    if (!api || !study) return;
    const request = generation.current; setBusy('answers'); setError('');
    try {const value = await api.loadCaseAnswers(study.meta.id); if (session.current.isCurrent(request)) {if (!value) throw new Error('此命例尚无答案资料。'); setAnswers(value);}}
    catch (cause) {if (session.current.isCurrent(request)) setError(String(cause instanceof Error ? cause.message : cause));}
    finally {if (session.current.isCurrent(request)) setBusy('');}
  }
  async function selectReference() {
    if (!api || !study) return;
    const request = generation.current; setBusy('reference'); setError('');
    try {
      const value = answers ?? await api.loadCaseAnswers(study.meta.id);
      if (!session.current.isCurrent(request)) return;
      const next: CaseReference = {caseId:study.meta.id, title:study.meta.title, text:api.buildCasePrompt(study, {mode:'reference', answers:value}), sourceUrl:study.provenance.sourceUrl, sourceRevision:study.provenance.revision, collectionId:study.meta.collectionId, mode:'reference'};
      setReference(next); referenceCallback.current?.(next); setStatus('已选为独立命例参考；不会替换当前命盘的出生资料。');
    } catch (cause) {if (session.current.isCurrent(request)) setError(String(cause instanceof Error ? cause.message : cause));}
    finally {if (session.current.isCurrent(request)) setBusy('');}
  }
  async function showCharts() {
    if (!api || !study) return;
    const request = generation.current; setBusy('charts'); setError('');
    try {const value = await api.loadReferenceCharts(study.meta.id); if (session.current.isCurrent(request)) {if (!value) throw new Error('此命例未附预排盘。'); setCharts(value);}}
    catch (cause) {if (session.current.isCurrent(request)) setError(String(cause instanceof Error ? cause.message : cause));}
    finally {if (session.current.isCurrent(request)) setBusy('');}
  }
  async function copyPractice() {
    if (!api || !study) return;
    const request = generation.current;
    try {await navigator.clipboard.writeText(api.buildCasePrompt(study, {mode:'practice'})); if(session.current.isCurrent(request)) setStatus('已复制练习提示词（不含答案和已知生平）。');}
    catch {if(session.current.isCurrent(request)) setError('复制失败，请检查浏览器的剪贴板权限。');}
  }
  const birth = study?.profile.birth;
  const studySource = study ? sources.find(item => item.id === study.meta.sourceId) : undefined;
  return <section className="ml-cases" aria-label={title}>
    <style>{panelStyle}</style>
    <h2>{title}</h2>
    <p>按来源整理真实题目与公开案例。练习时隐藏答案；选为 AI 参考时，案例资料与当前命主分开。</p>
    {!api && !error && <p role="status">正在加载命例索引…</p>}
    {error && <div className="ml-error" role="alert">{error} {!api && <button type="button" onClick={()=>setLoadAttempt(n=>n+1)}>重试加载</button>}</div>}
    {api && <>
      <small>共 {api.getStats().cases} 个命例 · {api.getStats().questions} 道题 · 题材按题干辅助归类；原题未注明的术数保留“未注明”。</small>
      <div className="ml-filters">
        <label>来源<select aria-label="命例来源" value={sourceId} onChange={event=>{setSource(event.target.value);setCollection('');}}><option value="">全部来源</option>{sources.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label>资料集<select aria-label="命例资料集" value={collectionId} onChange={event=>setCollection(event.target.value)}><option value="">全部资料集</option>{collections.filter(item=>!sourceId || item.sourceId===sourceId).map(item=><option key={`${item.sourceId}/${item.id}`} value={`${item.sourceId}/${item.id}`}>{item.title}</option>)}</select></label>
        <label>比赛年份<select aria-label="命例年份" value={year} onChange={event=>setYear(event.target.value)}><option value="">全部年份（含名人）</option>{years.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
        <label>原题术数<select aria-label="原题术数" value={method} onChange={event=>setMethod(event.target.value)}><option value="">全部术数</option>{methods.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label>题材<select aria-label="命例题材" value={topic} onChange={event=>setTopic(event.target.value)}><option value="">全部题材</option>{topics.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="ml-search">搜索命例或题干<input type="search" placeholder="姓名、题干或出生地" value={query} onChange={event=>setQuery(event.target.value)} /></label>
        <button type="button" onClick={()=>{setSource('');setCollection('');setYear('');setMethod('');setTopic('');setQuery('');}}>重置筛选</button>
      </div>
      {reference && <div className="ml-reference">已选参考：{reference.title}<button type="button" onClick={cancelReference}>清除参考</button></div>}
      <p className="ml-status" role="status" aria-live="polite">{status || `找到 ${visible.length} 个命例`}</p>
      <div className="ml-layout">
        <div className="ml-list" aria-label="命例列表">
          {visible.length===0 && <p>没有符合条件的命例，请调整筛选。</p>}
          {visible.map(item=><button type="button" className="ml-case" key={item.id} aria-pressed={item.id===selectedId} onClick={()=>void selectCase(item.id)}>{item.title}<small>{item.year ?? (collections.find(collection=>collection.id===item.collectionId && collection.sourceId===item.sourceId)?.kind==='celebrity'?'名人案例':'未标年份')} · {methodName(item.method)} · {item.questionCount ? `${item.questionCount} 题` : '叙述命例'}</small></button>)}
        </div>
        <article className="ml-detail" aria-label="命例详情">
          {busy==='case' && <p role="status">正在读取命例…</p>}
          {!study && busy!=='case' && <p>从列表选择命例，查看出生资料和原题。</p>}
          {study && birth && <>
            <h3>{study.meta.title}</h3>
            <div className="ml-tags"><span className="ml-tag">{methodName(study.meta.method)}</span>{study.meta.topics.map(item=><span className="ml-tag" key={item}>{topicName(item)}</span>)}<span className="ml-tag">答案：{answerLabels[study.meta.answerSource] ?? study.meta.answerSource}</span></div>
            <div className="ml-birth"><span>{birthDate(birth.year,birth.month,birth.day)} · {birthClock(birth.hour,birth.minute)}</span><span>{study.profile.gender==='male'?'男':study.profile.gender==='female'?'女':'性别未注明'} · {birth.place ?? '出生地未注明'}</span><span>{precisionLabels[birth.timePrecision] ?? birth.timePrecision}{birth.timeRaw ? ` · 原文：${birth.timeRaw}` : ''}</span><span>时区：{birth.timezone ?? '未提供'}{birth.utcOffset ? `（UTC${birth.utcOffset}）` : ''}</span><span>夏令时：{birth.dst===null?'未注明':birth.dst?'是':'否'}</span></div>
            {birth.raw && <details><summary>出生资料原文</summary><p>{birth.raw}</p></details>}
            {study.context.length>0 && <details open><summary>题目已知条件</summary>{study.context.map((text,index)=><p key={index}>{text}</p>)}</details>}
            <div className="ml-actions">
              <button type="button" onClick={()=>void copyPractice()}>复制练习提示词</button>
              <button type="button" disabled={!!busy} onClick={()=>answers ? setAnswers(undefined) : void revealAnswers()}>{answers?'隐藏答案':'揭晓答案'}</button>
              {onReferenceChange && <button type="button" disabled={!!busy} onClick={()=>void selectReference()}>用于 AI 参考{study.questions.length > 0 ? '（含已有答案）' : ''}</button>}
              {study.meta.hasReferenceCharts && <button type="button" disabled={!!busy} onClick={()=>charts ? setCharts(undefined) : void showCharts()}>{charts?'收起预排盘':'查看上游预排盘'}</button>}
            </div>
            {charts && <div><p><strong>上游预排盘</strong> · {charts.defaultTimeConvention} · {charts.conventions.dayRollover}</p><small>{charts.conventions.note}</small>{birth.hour===null && <p>原资料没有出生时辰。上游盘中的占位钟点及相关推算不能当作准确出生时刻；请保留原盘备注。</p>}<label>预排盘类型<select aria-label="预排盘类型" value={chartKind} onChange={event=>setChartKind(event.target.value as 'bazi'|'ziwei')}><option value="bazi">八字</option><option value="ziwei">紫微斗数</option></select></label><p>引擎：{charts.engine[chartKind]}</p><pre>{charts[chartKind] ? JSON.stringify(charts[chartKind],null,2) : '该例没有此类预排盘。'}</pre></div>}
            {study.questions.map((question,index)=>{const answer=answers?.answers.find(item=>item.questionId===question.id);return <section className="ml-question" key={question.id} aria-label={`第 ${question.number ?? index+1} 题`}><strong>{question.number ?? index+1}. {question.prompt}</strong><ol>{question.options.map(option=><li key={option.label}>{option.label}. {option.text}</li>)}</ol>{answer && <div className="ml-answer"><strong>参考答案：{answer.acceptedAnswers.join(' / ')}</strong>{answer.note && <p>{answer.note}</p>}</div>}</section>;})}
            {answers && Object.keys(answers.knownEvents).length>0 && <details><summary>来源记录的已知生平</summary>{Object.entries(answers.knownEvents).map(([key,values])=><div key={key}><strong>{key}</strong>{values.map((value,index)=><p key={index}>{value}</p>)}</div>)}</details>}
            {answers && answers.notes.length>0 && <details><summary>整理备注</summary>{answers.notes.map((value,index)=><p key={index}>{value}</p>)}</details>}
            <footer className="ml-source"><p><a href={safeSourceUrl(study.provenance.documentUrl ?? study.provenance.sourceUrl)} target="_blank" rel="noreferrer">查看资料来源</a> · 版本 {study.provenance.revision.slice(0,12)} · {study.provenance.rawPath}</p>{study.provenance.questionSources.map((url,index)=><p key={index}><a href={safeSourceUrl(url)} target="_blank" rel="noreferrer">原题出处 {index+1}</a></p>)}{studySource && <><p>{studySource.attribution}</p><p>{studySource.license.notice}</p></>}</footer>
          </>}
        </article>
      </div>
    </>}
  </section>;
}
