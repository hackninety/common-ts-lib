import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = 'hackninety/common-ts-lib';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const requested = args.filter((arg) => arg !== '--dry-run' && arg !== 'all');
const manifest = JSON.parse(readFileSync(path.join(root, 'artifacts/manifest.json'), 'utf8'));
const verification = JSON.parse(readFileSync(path.join(root, 'artifacts/verification.json'), 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.equal(verification.schemaVersion, 1);
const packages = manifest.packages.filter((pkg) => requested.length === 0 || requested.includes(pkg.name));
for (const name of requested) assert(packages.some((pkg) => pkg.name === name), `Package not packed: ${name}`);
assert(packages.length > 0, 'No packages to publish. Run pnpm pack:libs and pnpm verify:packages first.');

const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
const commit = git('rev-parse', 'HEAD');
if (!dryRun) {
  assert.equal(git('status', '--porcelain'), '', 'Commit all source changes before publishing.');
  assert.equal(manifest.sourceDirty, false, 'Repack and verify after committing source changes.');
  assert.equal(manifest.sourceCommit, commit, 'Repack and verify the current source commit before publishing.');
}

for (const pkg of packages) {
  assert(/^[a-z0-9-]+$/.test(pkg.name), 'Invalid package name');
  const source = JSON.parse(readFileSync(path.join(root, 'packages', pkg.name, 'package.json'), 'utf8'));
  assert.equal(source.version, pkg.version, `Repack ${pkg.name}: package version changed`);
  assert.equal(pkg.filename, `${pkg.name}-${pkg.version}.tgz`);
  assert.equal(pkg.releaseTag, `${pkg.name}-v${pkg.version}`);
  const archive = readFileSync(path.join(root, 'artifacts', pkg.filename));
  assert.equal(createHash('sha256').update(archive).digest('hex'), pkg.sha256, `Archive changed: ${pkg.name}`);
  assert.equal(`sha512-${createHash('sha512').update(archive).digest('base64')}`, pkg.integrity);
  const verified = verification.packages.find((entry) => entry.name === pkg.name);
  assert.equal(verified?.integrity, pkg.integrity, `Verify current archive before publishing: ${pkg.name}`);
}

if (dryRun) {
  for (const pkg of packages) console.log(`${pkg.name}@${pkg.version}: ${pkg.releaseUrl} (${pkg.sha256})`);
  process.exit(0);
}

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
assert(token, 'Set GITHUB_TOKEN with repository contents write permission.');
const headers = {
  authorization: `Bearer ${token}`,
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28',
  'user-agent': 'common-ts-lib-release',
};
async function api(endpoint, { method = 'GET', body, allowMissing = false } = {}) {
  const response = await fetch(`https://api.github.com/repos/${repository}${endpoint}`, {
    method,
    headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  });
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub ${method} ${endpoint}: HTTP ${response.status}`);
  return response.json();
}

// A release always points to the exact committed source, already present on GitHub.
await api(`/commits/${commit}`);
for (const pkg of packages) {
  const tagRef = await api(`/git/ref/tags/${encodeURIComponent(pkg.releaseTag)}`, { allowMissing: true });
  if (tagRef) {
    let target = tagRef.object;
    while (target.type === 'tag') target = (await api(`/git/tags/${target.sha}`)).object;
    assert.equal(target.type, 'commit');
    assert.equal(target.sha, commit, `Existing version tag points to another source commit: ${pkg.releaseTag}`);
  }
  let release = await api(`/releases/tags/${encodeURIComponent(pkg.releaseTag)}`, { allowMissing: true });
  if (!release) {
    // Draft releases may not yet have a Git tag; find an interrupted draft before creating another.
    const releases = await api('/releases?per_page=100');
    release = releases.find((entry) => entry.tag_name === pkg.releaseTag) ?? null;
  }
  if (release?.draft) {
    const target = await api(`/commits/${encodeURIComponent(release.target_commitish)}`);
    assert.equal(target.sha, commit, `Existing release draft targets another commit: ${pkg.releaseTag}`);
  }
  if (!release) {
    release = await api('/releases', {
      method: 'POST',
      body: {
        tag_name: pkg.releaseTag,
        target_commitish: commit,
        name: `${pkg.name} ${pkg.version}`,
        draft: true,
        prerelease: false,
        body: [
          `独立预构建包，保留 ${pkg.name} 的包名与公开接口。`,
          '',
          `源码提交：${commit}`,
          `SHA-256：${pkg.sha256}`,
          '',
          '```sh',
          `npm install ${pkg.releaseUrl}`,
          '```',
        ].join('\n'),
      },
    });
  }
  assert.equal(release.tag_name, pkg.releaseTag);
  const assets = await api(`/releases/${release.id}/assets?per_page=100`);
  let asset = assets.find((entry) => entry.name === pkg.filename);
  if (asset) {
    assert.equal(asset.state, 'uploaded', `Existing upload is incomplete: ${pkg.filename}`);
    assert.equal(asset.digest, `sha256:${pkg.sha256}`, `Refusing to replace existing version: ${pkg.filename}`);
  } else {
    assert(release.draft, `Published release has no matching asset: ${pkg.releaseTag}; inspect it manually.`);
    const uploadUrl = new URL(release.upload_url.replace(/\{.*$/, ''));
    assert.equal(uploadUrl.origin, 'https://uploads.github.com');
    assert.equal(uploadUrl.pathname, `/repos/${repository}/releases/${release.id}/assets`);
    uploadUrl.searchParams.set('name', pkg.filename);
    const upload = await fetch(uploadUrl, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/gzip' },
      body: readFileSync(path.join(root, 'artifacts', pkg.filename)),
      signal: AbortSignal.timeout(300_000),
    });
    if (!upload.ok) throw new Error(`Upload ${pkg.filename}: HTTP ${upload.status}. Re-run to inspect/resume this draft.`);
    asset = await upload.json();
    assert.equal(asset.state, 'uploaded');
    assert.equal(asset.digest, `sha256:${pkg.sha256}`);
  }
  if (release.draft) {
    release = await api(`/releases/${release.id}`, {
      method: 'PATCH',
      body: { draft: false, make_latest: 'false' },
    });
  }
  console.log(`Published ${pkg.name}@${pkg.version}: ${release.html_url}`);
}
