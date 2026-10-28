import {describe, expect, it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {MingliCaseLibrary} from '../src/index.js';
import {asCorpusApi, birthClock, birthDate, safeSourceUrl, SelectionSession} from '../src/helpers.js';

describe('命例面板边界',()=>{
  it('服务端渲染不调用资料加载器，实际挂载后才读取',()=>{
    let calls=0;
    const html=renderToStaticMarkup(<MingliCaseLibrary loadLibrary={async()=>{calls++;return {};}}/>);
    expect(calls).toBe(0); expect(html).toContain('正在加载命例索引');
  });
  it('换例或关闭使前一个异步读取失效',async()=>{
    const session=new SelectionSession(); const old=session.begin();
    const result=Promise.resolve('旧参考'); session.begin();
    await result; expect(session.isCurrent(old)).toBe(false);
    const current=session.begin(); expect(session.isCurrent(current)).toBe(true);
  });
  it('未知时间不会伪装成午夜',()=>{
    expect(birthClock(null,null)).toBe('时辰未提供');
    expect(birthClock(14,null)).toBe('14:??');
    expect(birthClock(0,0)).toBe('00:00');
    expect(birthDate(null,null,null)).toBe('公历日期未提供');
    expect(birthDate(1900,null,null)).toBe('1900-未知月-未知日');
  });
  it('来源链接只接受网页协议',()=>{
    expect(safeSourceUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeSourceUrl('https://github.com/ChenJiangxi/BaziQA')).toBe('https://github.com/ChenJiangxi/BaziQA');
  });
  it('错误版本的数据模块给出可处理错误',()=>{
    expect(()=>asCorpusApi({getSources(){return [];}})).toThrow('命例库接口不完整');
  });
});
