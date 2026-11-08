import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pkg = resolve(root, 'packages/hydrosystem-plugin');

test('the distributable exposes a DSH bundle, built ESM entry and display resources', async () => {
  const manifest = JSON.parse(await readFile(resolve(pkg, 'package.json'), 'utf8'));
  assert.equal(manifest.name, '@iheadwater/dsh-hydrosystem');
  assert.equal(manifest.private, undefined);
  assert.equal(manifest.type, 'module');
  assert.equal(manifest.engines.dsh, '0.2.2-rc.1');
  for (const name of [manifest.main, manifest.dsh.bundle.patch, manifest.exports['./icon']]) {
    await access(resolve(pkg, name));
  }
  const patch = await readFile(resolve(pkg, manifest.dsh.bundle.patch), 'utf8');
  assert.match(patch, /hydrology-expert/);
  assert.doesNotMatch(patch, /reference\/|D:\\project|codex-auth|workbuddy-to-dsh/);
  assert.ok(manifest.files.includes('python'));
  assert.ok(manifest.files.includes('core'));
});
