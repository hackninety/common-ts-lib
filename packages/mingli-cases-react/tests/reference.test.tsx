// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {MingliCaseLibrary, type CaseReference} from '../src/index.js';
import type {CaseStudy, CorpusApi} from '../src/corpus-types.js';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT = true;
const nodes: (()=>void)[] = [];
afterEach(async()=>{for(const dispose of nodes.splice(0)) await act(dispose);});
describe('explicit reference answer boundary',()=>{
  it('never fetches hidden answers for a reference, requires reveal and opt-in, and revokes included answers on hide',async()=>{
    const study:CaseStudy = {meta:{id:'s/c/p',sourceId:'s',collectionId:'c',title:'测试命例',year:null,gender:'unknown',method:'unknown',methodRaw:null,topics:[],questionCount:0,answerSource:'unspecified',timePrecision:'unverified-clock',timezoneKnown:false,hasReferenceCharts:false}, profile:{gender:'unknown',birth:{year:1900,month:1,day:1,hour:12,minute:0,place:null,timeRaw:null,raw:'原始12:00',timePrecision:'unverified-clock',timezone:null,utcOffset:null,dst:null,birthNotes:['钟点未核实；原件缺少精确依据。']}},context:[],questions:[],provenance:{sourceUrl:'https://example.org/source',revision:'fixed-revision',rawPath:'case.json',questionSources:[]}};
    const answers = {caseId:study.meta.id,answerSource:'unspecified',answers:[],knownEvents:{事业:['SECRET-EVENT']},notes:['SECRET-NOTE']};
    const loadAnswers=vi.fn(async()=>answers);
    const build=vi.fn((_study:CaseStudy, options?:{mode?:'practice'|'reference';answers?:unknown})=>JSON.stringify(options));
    const api:CorpusApi={getSources:()=>[],getCollections:()=>[],getMethods:()=>[],getTopics:()=>[],getStats:()=>({cases:1,questions:0}),getCaseIndex:()=>[study.meta],loadCase:async()=>study,loadCaseAnswers:loadAnswers,loadReferenceCharts:async()=>undefined,buildCasePrompt:build};
    const reference=vi.fn<(value:CaseReference|null)=>void>();
    const container=document.createElement('div');document.body.appendChild(container);const root=createRoot(container);nodes.push(()=>{root.unmount();container.remove();});
    await act(async()=>{root.render(<MingliCaseLibrary loadLibrary={async()=>api} onReferenceChange={reference}/>);});
    const button=(text:string)=>{const found=Array.from(container.querySelectorAll('button')).find(item=>item.textContent?.startsWith(text));if(!found)throw Error('Missing button '+text);return found;};
    await act(async()=>{button('测试命例').click();});
    expect(container.textContent).toContain('12:00（未核实）');expect(container.textContent).toContain('钟点未核实；原件缺少精确依据。');
    expect(button('用于 AI 参考（含已揭晓答案）').disabled).toBe(true);
    await act(async()=>{button('用于 AI 参考（不含答案）').click();});
    expect(loadAnswers).not.toHaveBeenCalled();
    expect(build).toHaveBeenLastCalledWith(study,{mode:'reference'});
    expect(reference.mock.lastCall?.[0]).toMatchObject({includesAnswers:false,sourceRevision:'fixed-revision'});
    await act(async()=>{button('揭晓答案').click();});expect(loadAnswers).toHaveBeenCalledTimes(1);
    await act(async()=>{button('用于 AI 参考（不含答案）').click();});
    expect(build).toHaveBeenLastCalledWith(study,{mode:'reference'});
    await act(async()=>{button('用于 AI 参考（含已揭晓答案）').click();});
    expect(reference.mock.lastCall?.[0]).toMatchObject({includesAnswers:true});
    expect(reference.mock.lastCall?.[0]?.text).toContain('SECRET-EVENT');
    const clipboard={writeText:vi.fn(async()=>{})};Object.defineProperty(navigator,'clipboard',{value:clipboard,configurable:true});
    await act(async()=>{button('复制练习提示词').click();});expect(build).toHaveBeenLastCalledWith(study,{mode:'practice'});expect(clipboard.writeText).toHaveBeenCalledWith('{"mode":"practice"}');
    await act(async()=>{button('隐藏答案').click();});expect(reference.mock.lastCall).toEqual([null]);expect(button('用于 AI 参考（含已揭晓答案）').disabled).toBe(true);
    await act(async()=>{button('用于 AI 参考（不含答案）').click();});expect(loadAnswers).toHaveBeenCalledTimes(1);expect(reference.mock.lastCall?.[0]?.text).not.toContain('SECRET');
  });
});
