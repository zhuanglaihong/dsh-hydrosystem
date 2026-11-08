/** Prepare a release-owned environment using the common, hash-checked installer. */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, chmod, copyFile, cp, mkdir, mkdtemp, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Connection } from './protocol.js';
import { record } from './protocol.js';

const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url));

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; }
  catch (error) { if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false; throw error; }
}

/** Prepare only the platform and dependency baseline declared in this artifact. */
export async function prepareManaged(stateRoot: string, onProgress: (message: string) => void): Promise<Connection> {
  const declaration: unknown = JSON.parse(await readFile(join(PACKAGE_ROOT, 'core/release.json'), 'utf8'));
  if (!record(declaration) || typeof declaration.release_id !== 'string' || !/^[a-f0-9]{12}$/.test(declaration.release_id)
    || !record(declaration.platforms)) throw new Error('INVALID_RELEASE: missing or invalid scientific payload.');
  const platform = `${process.platform}-${process.arch}`;
  const tool = declaration.platforms[platform];
  if (!record(tool) || typeof tool.program !== 'string' || typeof tool.sha256 !== 'string'
    || !/^tools\/(?:win32-x64\/uv\.exe|darwin-arm64\/uv)$/.test(tool.program)) {
    throw new Error(`PLATFORM_UNSUPPORTED: no verified scientific toolchain for ${platform}.`);
  }
  const uvSource = join(PACKAGE_ROOT, tool.program);
  const digest = createHash('sha256').update(await readFile(uvSource)).digest('hex');
  if (digest !== tool.sha256) throw new Error('TOOLCHAIN_CHECKSUM_MISMATCH: bundled uv changed.');
  const releases = join(stateRoot, 'releases');
  await mkdir(releases, { recursive: true });
  const release = join(releases, declaration.release_id);
  if (!(await exists(release))) {
    const temporary = await mkdtemp(join(releases, '.prepare-'));
    const payload = join(temporary, 'payload');
    await cp(join(PACKAGE_ROOT, 'core'), payload, { recursive: true, errorOnExist: true, force: false });
    await rename(payload, release);
  }
  const projectRoot = join(release, 'hydrosystem');
  const toolRoot = join(projectRoot, '.hydrosystem/tools');
  const uv = join(toolRoot, process.platform === 'win32' ? 'uv.exe' : 'uv');
  await copyFile(uvSource, uv);
  if (process.platform !== 'win32') await chmod(uv, 0o755);
  const node = join(stateRoot, 'nodes', declaration.release_id);
  await mkdir(node, { recursive: true });
  const planPath = join(node, 'setup-plan.json');
  const plan = { schema_version: 'hydrosystem.local-install/v1', node_root: node, work_root: join(stateRoot, 'studies/default') };
  if (!(await exists(planPath))) await writeFile(planPath, JSON.stringify(plan)+'\n', { flag: 'wx' });
  else if (await readFile(planPath, 'utf8') !== JSON.stringify(plan)+'\n') throw new Error('NODE_CONFIGURATION_CONFLICT: preserve the original node.');
  const ready = join(projectRoot, '.hydrosystem/setup-result.json');
  const previous: unknown = await exists(ready) ? JSON.parse(await readFile(ready, 'utf8')) : null;
  if (!record(previous) || previous.outcome !== 'passed') {
    onProgress('Installing private Python and locked scientific dependencies; installation.log records progress.');
    await new Promise<void>((resolve, reject) => {
      const child = spawn(uv, ['run', '--no-project', '--managed-python', '--python', '3.12.12', 'python',
        join(toolRoot, 'install_local.py'), '--root', release, '--plan', planPath], {
        cwd: release, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUTF8: '1', UV_CACHE_DIR: join(stateRoot, 'cache/uv'),
          UV_PYTHON_INSTALL_DIR: join(stateRoot, 'tools/python') },
      });
      let detail = '', failure: Error | undefined;
      child.stdout.on('data', (chunk: Buffer) => { detail = (detail + chunk.toString()).slice(-16384); });
      child.stderr.on('data', (chunk: Buffer) => { detail = (detail + chunk.toString()).slice(-16384); });
      child.on('error', error => { failure = error; });
      child.on('close', code => failure || code !== 0
        ? reject(failure ?? new Error(`ENVIRONMENT_INSTALL_FAILED (${code}): ${detail}`)) : resolve());
    });
  }
  return { python: join(projectRoot, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'),
    projectRoot, workRoot: plan.work_root, runtimeRoot: join(node, 'runtime') };
}
