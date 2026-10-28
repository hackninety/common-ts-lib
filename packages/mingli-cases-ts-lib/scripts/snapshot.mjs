import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

function within(directory, path) {
  assert(typeof path === 'string' && path.length > 0 && !isAbsolute(path) && !path.includes('\\'), 'Snapshot paths must use relative forward-slash paths');
  const absolute = resolve(directory, path);
  const child = relative(directory, absolute);
  assert(child && !isAbsolute(child) && child !== '..' && !child.startsWith(`..${sep}`), `Snapshot path escapes its directory: ${path}`);
  return absolute;
}

function filesIn(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    assert(!entry.isSymbolicLink(), `Snapshot cannot include a symbolic link: ${entry.name}`);
    const path = `${prefix}${entry.name}`;
    return entry.isDirectory() ? filesIn(resolve(directory, entry.name), `${path}/`) : [path];
  });
}

/** Handwritten canonical inputs may have no external originals. Existing originals must be verified. */
export function verifyCanonicalSnapshot(packageRoot, source, collection) {
  const sourceRoot = resolve(packageRoot, 'docs/upstream', source.id);
  const manifestPath = within(packageRoot, source.snapshotPath);
  assert.equal(dirname(manifestPath), sourceRoot, 'snapshotPath must name a manifest directly inside docs/upstream/<sourceId>');
  if (!existsSync(manifestPath)) {
    assert(!existsSync(sourceRoot) || filesIn(sourceRoot).length === 0, `Original files need a snapshot manifest: ${source.snapshotPath}`);
    return false;
  }
  const snapshot = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(snapshot.schemaVersion, 1, 'Unsupported snapshot schemaVersion');
  for (const [key, expected] of [['sourceId', source.id], ['sourceUrl', source.url], ['revision', source.revision]]) {
    assert.equal(snapshot[key], expected, `Snapshot ${key} differs from source metadata`);
  }
  assert(Array.isArray(snapshot.files) && snapshot.files.length > 0, 'Snapshot must list its original files');
  const paths = new Set();
  for (const file of snapshot.files) {
    const path = within(sourceRoot, file.path);
    assert(!paths.has(file.path), `Duplicate snapshot file: ${file.path}`); paths.add(file.path);
    assert(Number.isSafeInteger(file.bytes) && file.bytes >= 0 && /^[a-f0-9]{64}$/.test(file.sha256), `Invalid snapshot digest: ${file.path}`);
    const bytes = readFileSync(path);
    assert.equal(bytes.length, file.bytes, `Original byte length changed: ${file.path}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, `Original SHA-256 changed: ${file.path}`);
  }
  const manifestName = relative(sourceRoot, manifestPath).split(sep).join('/');
  assert.deepEqual(filesIn(sourceRoot).filter((path) => path !== manifestName).sort(), [...paths].sort(), 'Snapshot must cover every original file');
  assert(paths.has(collection.rawPath), `Collection rawPath is missing from its snapshot: ${collection.rawPath}`);
  return true;
}
