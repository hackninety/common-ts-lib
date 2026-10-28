import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { normalizeCanonical } from '../../scripts/canonical.mjs';
import { verifyCanonicalSnapshot } from '../../scripts/snapshot.mjs';

const template = () => JSON.parse(readFileSync(fileURLToPath(new URL('../../docs/templates/canonical-collection.json', import.meta.url)), 'utf8'));

it('validates original byte manifests while allowing self-authored input with no external originals', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'mingli-snapshot-'));
  try {
    const { source, collection } = normalizeCanonical(template());
    expect(verifyCanonicalSnapshot(fixture, source, collection)).toBe(false);
    const manifestPath = join(fixture, source.snapshotPath);
    const originalPath = join(dirname(manifestPath), collection.rawPath);
    mkdirSync(dirname(originalPath), { recursive: true });
    const bytes = Buffer.from('原始命例\r\n甲子年 丙寅月 戊辰日 庚申时\r\n', 'utf8');
    writeFileSync(originalPath, bytes);
    expect(() => verifyCanonicalSnapshot(fixture, source, collection)).toThrow('need a snapshot manifest');
    const snapshot = { schemaVersion: 1, sourceId: source.id, sourceUrl: source.url, revision: source.revision,
      files: [{path: collection.rawPath, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')}] };
    writeFileSync(manifestPath, JSON.stringify(snapshot));
    expect(verifyCanonicalSnapshot(fixture, source, collection)).toBe(true);
    expect(() => verifyCanonicalSnapshot(fixture, {...source, revision: 'wrong-version'}, collection)).toThrow('revision differs');
    expect(() => verifyCanonicalSnapshot(fixture, source, {...collection, rawPath: 'absent.txt'})).toThrow('rawPath is missing');
    writeFileSync(originalPath, bytes.toString('utf8').replaceAll('\r\n', '\n'));
    expect(() => verifyCanonicalSnapshot(fixture, source, collection)).toThrow('byte length changed');
    writeFileSync(originalPath, Buffer.alloc(bytes.length));
    expect(() => verifyCanonicalSnapshot(fixture, source, collection)).toThrow('SHA-256 changed');
    writeFileSync(originalPath, bytes);
    const extraPath = join(dirname(manifestPath), 'unlisted.txt');
    writeFileSync(extraPath, 'must be listed');
    expect(() => verifyCanonicalSnapshot(fixture, source, collection)).toThrow('cover every original file');
    rmSync(extraPath);
    snapshot.files[0].path = '../escape.txt';
    writeFileSync(manifestPath, JSON.stringify(snapshot));
    expect(() => verifyCanonicalSnapshot(fixture, source, collection)).toThrow('escapes its directory');
  } finally {
    expect(resolve(fixture).startsWith(`${resolve(tmpdir())}${sep}`)).toBe(true);
    rmSync(fixture, { recursive: true, force: true });
  }
});

it('keeps only declared source metadata and rejects non-text notes that cannot render in consumers', () => {
  const document = template();
  document.source.notes = ['PRIVATE-ANSWER'];
  expect(JSON.stringify(normalizeCanonical(document).source)).not.toContain('PRIVATE-ANSWER');
  document.collection.scoring = { invalid: true };
  expect(() => normalizeCanonical(document)).toThrow('collection.scoring');
});
