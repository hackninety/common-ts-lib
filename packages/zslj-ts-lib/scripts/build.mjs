// 构建：tsc 产出 ESM + d.ts，随后确保 data/*.json 落入 dist
import { execSync } from 'node:child_process';
import { cpSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');

rmSync(dist, { recursive: true, force: true });
// 先生成典籍数据（src/data/docs.json），供 index.ts 导入
execSync('node scripts/gen-docs.mjs', { cwd: root, stdio: 'inherit' });
execSync('npx tsc -p tsconfig.build.json', { cwd: root, stdio: 'inherit' });
cpSync(path.join(root, 'src/data'), path.join(dist, 'data'), { recursive: true });

// tsc（moduleResolution:bundler）产出的相对 import 无扩展名、JSON 无导入属性，
// Node 原生 ESM 无法加载。此处对运行时 .js 后处理，令 dist 可被纯 Node / vitest 直接消费。
fixEsmImports(dist);
console.log('build ok: dist/');

/** 递归修正 dist 内 .js 的 ESM 导入：相对导入补 .js，JSON 导入补 import attribute */
function fixEsmImports(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      fixEsmImports(full);
      continue;
    }
    if (!name.endsWith('.js')) continue;
    let code = readFileSync(full, 'utf8');
    // 相对 import/export 补 .js（.json/.js/.mjs/.cjs 已带扩展名者跳过）
    code = code.replace(
      /(\bfrom\s*)(['"])(\.\.?\/[^'"]+)(['"])/g,
      (m, kw, q1, spec, q2) =>
        /\.(js|json|mjs|cjs)$/.test(spec) ? m : `${kw}${q1}${spec}.js${q2}`,
    );
    // JSON 静态导入补 import attribute（Node ≥ 20.10 / 22 要求）
    code = code.replace(
      /(\bfrom\s*)(['"])(\.\.?\/[^'"]+\.json)(['"])(?!\s*with)/g,
      (m, kw, q1, spec, q2) => `${kw}${q1}${spec}${q2} with { type: 'json' }`,
    );
    writeFileSync(full, code);
  }
}
