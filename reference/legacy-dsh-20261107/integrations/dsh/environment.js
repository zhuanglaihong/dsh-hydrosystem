/** Read the deployed node's actual environment without installing or changing packages. */
import { spawn, execFile } from 'node:child_process'
import { cpus, totalmem } from 'node:os'
import { join } from 'node:path'
export const name = 'hydrosystem-environment'
export const inject = ['hydrosystemNode', 'commands']

export async function inspectEnvironment(connection, signal) {
  const code = 'import json,sys,platform; from pathlib import Path; from hydrosystem.environment.manager import status; print(json.dumps({**status(Path(sys.argv[1])), "python_version":platform.python_version(), "virtual_environment":sys.prefix}))'
  return new Promise((resolve, reject) => {
    const child = spawn(connection.python, ['-c', code, connection.projectRoot], {
      cwd: connection.projectRoot, windowsHide: true, signal,
      env: { ...process.env, PYTHONUTF8: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = '', detail = '', failure
    child.stdout.on('data', value => { output += value; if (output.length > 1048576) child.kill() })
    child.stderr.on('data', value => { detail = (detail + value).slice(-2048) })
    child.on('error', error => { failure = error })
    child.on('close', async exit => {
      if (failure || exit !== 0) return reject(failure ?? new Error('Environment query failed: ' + detail))
      try {
        const uv = join(connection.projectRoot, '.hydrosystem/tools', process.platform === 'win32' ? 'uv.exe' : 'uv')
        const uvVersion = await new Promise((done, fail) => execFile(uv, ['--version'], { windowsHide: true, signal, timeout: 5000 },
          (error, stdout) => error ? error.code === 'ENOENT' ? done(null) : fail(error) : done(stdout.trim())))
        resolve({ ...JSON.parse(output), node: { platform: process.platform, arch: process.arch,
        cpu_threads: cpus().length, memory_bytes: totalmem(), runtime_root: connection.runtimeRoot },
        uv_executable: uv, uv_version: uvVersion,
        checked_at: new Date().toISOString(), checks: 'metadata_only' }) }
      catch (error) { reject(error) }
    })
  })
}

export function apply(ctx) {
  const controller = new AbortController()
  let pending
  ctx.effect(() => async () => { controller.abort(); await pending?.catch(() => {}) })
  ctx.effect(() => ctx.commands.register({
    definitionId: '@iheadwater/dsh-hydrosystem/environment', name: 'hydro_environment',
    description: 'Inspect the deployed Python environment and execution node',
    async handler(invocation) {
      if (invocation.rawInput.trim()) return { kind: 'error', text: 'This command accepts no arguments.' }
      try {
        pending ??= inspectEnvironment(ctx.hydrosystemNode.connection, controller.signal).finally(() => { pending = undefined })
        return { kind: 'success', text: JSON.stringify(await pending) }
      } catch (error) { return { kind: 'error', text: error.message } }
    },
  }))
}
