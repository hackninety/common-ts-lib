# mingli-cases-react

React 18 / 19 共用的命例浏览面板。组件包不包含数据、不静态导入数据包，也不自动替换宿主的出生资料或排盘。

```tsx
const loadLibrary = () => import('mingli-cases-ts-lib');
const Panel = React.lazy(() => import('mingli-cases-react').then(module => ({ default: module.MingliCaseLibrary })));

// 普通命理工具：用户展开后挂载。
// 六壬 / 奇门 / 铁板：还必须先显式开启算命模式。
{fortuneMode && expanded && <Suspense fallback="正在打开命例库…">
  <Panel loadLibrary={loadLibrary} preferredChart="bazi" onReferenceChange={setReference} />
</Suspense>}
```

支持来源、资料集、年份、原题术数、题材和题干检索。默认只读取无答案的命例；“揭晓答案”与“用于 AI 参考（含已有答案）”才读取答案、生平和备注。没有选择题或答案的叙述命例也可选为参考。练习提示词始终隐藏答案。上游预排盘单独按需读取。

`CaseReference` 包含稳定命例 ID、标题、独立参考文本、来源 URL、固定上游提交和资料集 ID。宿主只能把参考作为单独资料区块附在 AI 提示词后，不能合并进当前命主事实。关闭算命模式、换盘时必须清空参考并拒绝旧异步回调；组件卸载和换例同样使内部未完成请求失效。

核心 props：`loadLibrary: () => Promise<unknown>`（传稳定函数）、`onReferenceChange?: (reference: CaseReference | null) => void`、`preferredChart?: 'bazi' | 'ziwei'`、`title?: string`。

数据包的许可、来源与题目权利说明独立适用；本包只提供 MIT 许可的浏览组件。
