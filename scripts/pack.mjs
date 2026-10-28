import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { delimiter, dirname, join, relative, resolve, sep } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const artifactsDir = join(root, 'artifacts');

/** Invoke npm's JavaScript entry directly, avoiding cmd.exe quoting on Windows. */
export function runNpm(args, cwd) {
  const locations = [dirname(process.execPath), ...(process.env.PATH ?? '').split(delimiter)];
  const candidates = [process.env.npm_execpath].filter((p) => p && /npm-cli\.js$/.test(p));
  for (const location of locations) {
    candidates.push(join(location, 'node_modules/npm/bin/npm-cli.js'));
    candidates.push(join(location, '../lib/node_modules/npm/bin/npm-cli.js'));
    const launcher = join(location, 'npm');
    if (existsSync(launcher)) candidates.push(realpathSync(launcher));
  }
  const npmCli = candidates.find((p) => /npm-cli\.js$/.test(p) && existsSync(p));
  assert(npmCli, 'Cannot locate npm-cli.js; install Node.js with npm and retry.');
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, npm_config_update_notifier: 'false' },
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `npm ${args[0]} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

export function packageDefinitions(names = []) {
  names = names.filter((name) => name !== 'all');
  const packages = readdirSync(join(root, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const directory = join(root, 'packages', entry.name);
      return { directory, ...JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const name of names) assert(packages.some((pkg) => pkg.name === name), `Unknown package: ${name}`);
  return names.length ? packages.filter((pkg) => names.includes(pkg.name)) : packages;
}

export function exportTargets(value) {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  return [...new Set(Object.values(value).flatMap(exportTargets))];
}

function filesUnder(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert(!entry.isSymbolicLink(), `Package files must not be symlinks: ${join(directory, entry.name)}`);
    return entry.isDirectory() ? filesUnder(join(directory, entry.name), path) : [path];
  });
}

export function digest(buffer, algorithm, encoding = 'hex') {
  return createHash(algorithm).update(buffer).digest(encoding);
}

async function pack(names) {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
  const sourceCommit = git('rev-parse', 'HEAD');
  const dirtyBeforePack = git('status', '--porcelain') !== '';
  const packages = packageDefinitions(names);
  await mkdir(artifactsDir, { recursive: true });
  const entries = [];
  for (const pkg of packages) {
    const targets = exportTargets(pkg.exports);
    assert(targets.length > 0, `${pkg.name}: no public exports`);
    for (const target of targets) {
      const absolute = resolve(pkg.directory, target);
      const local = relative(pkg.directory, absolute);
      assert(!local.startsWith(`..${sep}`) && local !== '..', `${pkg.name}: export outside package: ${target}`);
      assert(existsSync(absolute) && statSync(absolute).isFile(), `${pkg.name}: missing ${target}; run the workspace build first.`);
    }
    const [packed] = JSON.parse(runNpm(['pack', '--ignore-scripts', '--json', '--pack-destination', artifactsDir], pkg.directory));
    assert.equal(packed.name, pkg.name);
    assert.equal(packed.version, pkg.version);
    const files = packed.files.map(({ path, size }) => ({ path: path.replaceAll('\\', '/'), size }));
    const included = new Set(files.map((file) => file.path));
    for (const file of files) {
      assert(!/(^|\/)(?:node_modules|\.git|packages|src|scripts|tests|__tests__)(?:\/|$)/.test(file.path), `${pkg.name}: unexpected development file ${file.path}`);
      assert(!file.path.startsWith('docs/corpus/'), `${pkg.name}: raw source corpus leaked into tarball: ${file.path}`);
    }
    for (const target of targets) assert(included.has(target.replace(/^\.\//, '')), `${pkg.name}: export missing from tarball: ${target}`);
    // Validate all generated data/chunks, not just entrypoints.
    for (const file of filesUnder(join(pkg.directory, 'dist'))) {
      assert(included.has(`dist/${file}`), `${pkg.name}: missing built file dist/${file}`);
    }
    if (pkg.name === 'zslj-ts-lib') {
      assert(!files.some(file => /^docs\/(plan|research)\//.test(file.path)), 'zslj-ts-lib: internal planning docs must not ship');
      for (const group of ['book', 'algorithm']) for (const file of filesUnder(join(pkg.directory, 'docs', group))) {
        assert(included.has('docs/' + group + '/' + file), 'zslj-ts-lib: missing original/document asset ' + file);
      }
    }
    if (pkg.name === 'shj-ts-lib') {
      const assets = filesUnder(join(pkg.directory, 'assets'));
      assert(assets.length > 0, 'shj-ts-lib: image assets are empty');
      for (const file of assets) assert(included.has(`assets/${file}`), `shj-ts-lib: missing asset ${file}`);
    }
    const tarball = readFileSync(join(artifactsDir, packed.filename));
    const integrity = `sha512-${digest(tarball, 'sha512', 'base64')}`;
    assert.equal(integrity, packed.integrity);
    const releaseTag = `${pkg.name}-v${pkg.version}`;
    entries.push({
      name: pkg.name, version: pkg.version, filename: packed.filename, releaseTag,
      releaseUrl: `https://github.com/hackninety/common-ts-lib/releases/download/${releaseTag}/${packed.filename}`,
      integrity, sha256: digest(tarball, 'sha256'), size: tarball.length,
      unpackedSize: packed.unpackedSize, exports: pkg.exports, files,
    });
    console.log(`${pkg.name}@${pkg.version}: ${packed.filename} (${tarball.length} bytes, ${files.length} files)`);
  }
  const sourceDirty = dirtyBeforePack || git('status', '--porcelain') !== '' || git('rev-parse', 'HEAD') !== sourceCommit;
  await writeFile(join(artifactsDir, 'manifest.json'), `${JSON.stringify({ schemaVersion: 1, sourceCommit, sourceDirty, packages: entries }, null, 2)}\n`);
  console.log(`Wrote ${join(artifactsDir, 'manifest.json')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await pack(process.argv.slice(2).filter((arg) => arg !== '--'));
}
