/** Prepare a private release using the existing hashed installer payload. */
import { spawn } from 'node:child_process'
import { access, cp, mkdir, mkdtemp, readFile, rename, rmdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

async function exists(path) {
  try { await access(path); return true } catch (error) { if (error.code === 'ENOENT') return false; throw error }
}

async function publish(path, value) {
  const text = JSON.stringify(value, null, 2) + '\n'
  if (await exists(path)) {
    if (await readFile(path, 'utf8') !== text) throw new Error(`Managed configuration changed: ${path}`)
    return
  }
  await writeFile(path, text, { flag: 'wx' })
}

/** Atomically publish a new payload, or reuse an existing release unchanged. */
export async function stageRelease(packageRoot, releases, releaseId) {
  if (!/^[a-f0-9]{12}$/.test(releaseId)) throw new Error('Invalid hydrosystem release identity.')
  await mkdir(releases, { recursive: true })
  const release = join(releases, releaseId)
  if (!(await exists(release))) {
    const container = await mkdtemp(join(releases, '.prepare-'))
    const staging = join(container, 'payload')
    await cp(join(packageRoot, 'payload'), staging, { recursive: true, force: false, errorOnExist: true })
    await rename(staging, release)
    await rmdir(container)
  }
  return release
}

/** Deploy into profile-owned storage, preserving research and global settings. */
export async function prepareNode(packageRoot, profileDir, declaration, signal, progress) {
  const state = join(profileDir, 'hydrosystem')
  progress('Preparing the locked hydrosystem release.')
  const release = await stageRelease(packageRoot, join(state, 'releases'), declaration.releaseId)
  const projectRoot = join(release, 'hydrosystem')
  const nodeRoot = join(state, 'nodes', declaration.releaseId)
  const inputs = join(nodeRoot, 'setup-input')
  await mkdir(inputs, { recursive: true })
  const dataRoot = join(state, 'data')
  const settings = join(inputs, 'hydro_setting.yml')
  await publish(settings, { storage: { default_source: 'local', local: { root: dataRoot }, cache: join(state, 'cache/hydrodata') } })
  // Demo files remain an immutable part of this release; no real data download.
  const data = { schema_version: '0.2', settings_file: settings,
    management: { state_root: nodeRoot, cache_root: join(state, 'cache/hydrodata'), stores: { demo: join(projectRoot, 'examples/data') } },
    registry: { demo_selfmade: { reader: 'selfmade', store: 'demo', path: 'demo-selfmade' } },
    policy: { protected_periods: [], datasets: { demo_selfmade: { basin_ids: ['001', '002'], period: ['2000-01-01', '2004-12-31'],
      variables: ['precipitation', 'potential_evapotranspiration', 'streamflow'], attributes: ['area'] } } } }
  const model = { schema_version: '0.2', models: ['xaj', 'gr4j'],
    datasets: { demo_selfmade: { basin_ids: ['001', '002'], calibration_period: ['2000-01-01', '2002-12-31'],
      validation_period: ['2003-01-01', '2003-12-31'], simulation_period: ['2004-01-01', '2004-12-31'] } },
    study_model_evaluations: null, per_task_model_evaluations: 256, max_scoring_steps: 1096, warmup_steps: 60,
    timeout_seconds: 900, data_timeout_seconds: 30, protected_periods: [] }
  const torch = { schema_version: '0.2', models: ['CpuLSTM', 'SimpleLSTM'], study_optimizer_steps: null,
    per_task_optimizer_steps: 128, max_epochs: 2, max_hidden_size: 8, timeout_seconds: 180 }
  const plan = { schema_version: 'hydrosystem.local-install/v1', node_root: nodeRoot,
    work_root: join(state, 'studies/default'), data_config: join(inputs, 'data.json'),
    hydromodel_config: join(inputs, 'model.json'), torchhydro_config: join(inputs, 'torch.json') }
  for (const [name, value] of [['data', data], ['model', model], ['torch', torch], ['plan', plan]]) {
    await publish(join(inputs, name + '.json'), value)
  }
  const tools = join(projectRoot, '.hydrosystem/tools')
  const uv = join(tools, process.platform === 'win32' ? 'uv.exe' : 'uv')
  const python = join(projectRoot, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
  const ready = join(projectRoot, '.hydrosystem/setup-result.json')
  if (!(await exists(ready)) || JSON.parse(await readFile(ready, 'utf8')).outcome !== 'passed') {
    progress('Installing the private Python environment and locked scientific packages; see installation.log for progress.')
    await new Promise((resolve, reject) => {
      const child = spawn(uv, ['run', '--no-project', '--managed-python', '--python', '3.12.12', 'python',
        join(tools, 'install_local.py'), '--root', release, '--plan', join(inputs, 'plan.json')], {
        cwd: release, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUTF8: '1', UV_CACHE_DIR: join(state, 'cache/uv'), UV_PYTHON_INSTALL_DIR: join(state, 'tools/python') },
      })
      let detail = ''
      let error
      child.stdout.on('data', value => { detail = (detail + value.toString()).slice(-32768) })
      child.stderr.on('data', value => { detail = (detail + value.toString()).slice(-32768) })
      child.on('error', value => { error = value })
      child.on('close', code => error || code !== 0
        ? reject(error ?? new Error(`Private environment preparation failed (${code}): ${detail}`)) : resolve())
      // The installer retains its durable report on failure. Do not kill it
      // halfway through environment mutation when the plugin is deselected.
    })
  }
  if (signal?.aborted) throw new Error('Plugin stopped after environment preparation; the prepared environment was retained.')
  return { python, projectRoot, workRoot: plan.work_root, runtimeRoot: join(nodeRoot, 'runtime'),
    hydromodelConfig: join(nodeRoot, 'config/model.json'), dataConfig: join(nodeRoot, 'config/data.json'),
    torchhydroConfig: join(nodeRoot, 'config/torch.json') }
}
