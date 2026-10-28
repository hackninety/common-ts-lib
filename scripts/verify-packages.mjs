import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { artifactsDir, digest, packageDefinitions, root, runNpm } from './pack.mjs';

const requested = process.argv.slice(2).filter((arg) => arg !== '--');
const definitions = packageDefinitions(requested);
const manifest = JSON.parse(await readFile(join(artifactsDir, 'manifest.json'), 'utf8'));
assert.equal(manifest.schemaVersion, 1, 'Unsupported artifact manifest version');
const packages = definitions.map((pkg) => {
  const packed = manifest.packages.find((entry) => entry.name === pkg.name);
  assert(packed, `${pkg.name}: missing from artifact manifest; run pack first`);
  assert.equal(packed.version, pkg.version, `${pkg.name}: tarball version is stale`);
  assert.deepEqual(packed.exports, pkg.exports, `${pkg.name}: tarball exports are stale`);
  return packed;
});
for (const pkg of packages) {
  assert.equal(resolve(artifactsDir, pkg.filename), join(artifactsDir, `${pkg.name}-${pkg.version}.tgz`), `Invalid tarball filename: ${pkg.filename}`);
  const bytes = await readFile(join(artifactsDir, pkg.filename));
  assert.equal(digest(bytes, 'sha256'), pkg.sha256, `${pkg.name}: SHA-256 mismatch`);
  assert.equal(`sha512-${digest(bytes, 'sha512', 'base64')}`, pkg.integrity, `${pkg.name}: integrity mismatch`);
}

const fixture = await mkdtemp(join(tmpdir(), 'common-ts-lib-packages-'));
const isolated = await realpath(fixture);
assert(!isolated.startsWith(`${await realpath(root)}${sep}`), 'Fixture must be outside the workspace');
try {
  // Each package gets its own installation: siblings cannot hide undeclared dependencies.
  const results = [];
  for (const pkg of packages) {
    const directory = join(fixture, pkg.name);
    await mkdir(directory);
    await copyFile(join(artifactsDir, pkg.filename), join(directory, pkg.filename));
    await writeFile(join(directory, 'package.json'), `${JSON.stringify({
      name: `verify-${pkg.name}`, private: true, version: '0.0.0', type: 'module',
      dependencies: { [pkg.name]: `file:./${pkg.filename}` },
    }, null, 2)}\n`);
    await writeFile(join(directory, 'artifact.json'), `${JSON.stringify(pkg)}\n`);
    await copyFile(join(root, 'scripts/tests/package-smoke.mjs'), join(directory, 'package-smoke.mjs'));
    runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=true'], directory);
    const run = spawnSync(process.execPath, ['package-smoke.mjs'], {
      cwd: directory, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
      // Node should resolve only the fixture's own installed dependencies.
      env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '' },
    });
    if (run.error) throw run.error;
    assert.equal(run.status, 0, `${pkg.name}: isolated smoke failed:\n${run.stdout}\n${run.stderr}`);
    process.stdout.write(run.stdout);
    results.push(JSON.parse(await readFile(join(directory, 'result.json'), 'utf8')));
  }
  await writeFile(join(artifactsDir, 'verification.json'), `${JSON.stringify({ schemaVersion: 1, packages: results }, null, 2)}\n`);
  console.log(`Verified ${results.length} independently installed packages; report: ${join(artifactsDir, 'verification.json')}`);
} finally {
  const parent = await realpath(tmpdir());
  assert(isolated.startsWith(`${parent}${sep}`) && isolated !== parent, 'Refusing to remove a fixture outside the temporary directory');
  await rm(isolated, { recursive: true, force: true });
}
