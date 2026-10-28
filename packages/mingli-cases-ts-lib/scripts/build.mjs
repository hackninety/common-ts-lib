import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
execFileSync(process.execPath, ['scripts/gen-data.mjs'], { cwd: root, stdio: 'inherit', windowsHide: true });
rmSync(join(root, 'dist'), { recursive: true, force: true });
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.build.json'], { cwd: root, stdio: 'inherit', windowsHide: true });
console.log('Built independent ESM, declaration files and lazy case/answer/chart chunks.');
