// 构建：tsc 产出 ESM 与 d.ts 到 dist/。数据 data/ 不进 dist，运行时按 ../data/ 相对读取。
// 数据要从 novel-wiki 重新整理时先跑 npm run gen。
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
if (!existsSync(path.join(root, 'data/catalog.json'))) throw new Error('缺 data/catalog.json，先运行 npm run gen');
rmSync(path.join(root, 'dist'), { recursive: true, force: true });
execSync('npx tsc -p tsconfig.build.json', { cwd: root, stdio: 'inherit' });
console.log('build ok: dist/');
