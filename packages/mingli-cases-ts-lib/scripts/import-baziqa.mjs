import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const cache = resolve(root, '../../.cache/baziqa');
const revision = '3bad3deaa5aa3a191c9c68b4d8b17f46decff45e';
const sourceUrl = 'https://github.com/ChenJiangxi/BaziQA';
const git = (...args) => execFileSync('git', ['-C', cache, ...args], { windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
assert.equal(git('rev-parse', `${revision}^{commit}`).toString().trim(), revision);
const all = git('ls-tree', '-r', '--name-only', revision).toString('utf8').trim().split('\n');
const selected = all.filter((file) => /^(?:data|charts|sources|tools\/src)\//.test(file)
  || ['README.md', 'README_EN.md', 'LICENSE', 'paipan/README.md', 'eval/README.md', 'dataset_and_input_format.md'].includes(file));
const files = [];
for (const path of selected) {
  // Read immutable Git blobs, not checkout files that Windows may have converted to CRLF.
  const bytes = git('show', `${revision}:${path}`);
  const destination = join(root, 'docs/upstream/baziqa', path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, bytes);
  files.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
writeFileSync(join(root, 'docs/upstream/baziqa/snapshot.json'), `${JSON.stringify({
  schemaVersion: 1, sourceId: 'baziqa', sourceUrl, revision, upstreamVersion: 'v2.3.0',
  files, omitted: ['.git', 'evaluation and chart-generation executable code', 'benchmark plots'],
  execution: 'No upstream baseline, model request or chart engine was executed.',
}, null, 2)}\n`);
console.log(`Imported ${files.length} immutable files from ${sourceUrl}@${revision}`);
