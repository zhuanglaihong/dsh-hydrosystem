/** Local process transport; cancellation settles through the shared runtime. */
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, unlink } from 'node:fs/promises'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Execute one JSON request using an explicitly bound environment. */
export async function invoke(connection, request, signal) {
  if (signal?.aborted) throw Object.assign(new Error('Request cancelled before submission.'), { code: 'EXECUTION_CANCELLED' })
  const controls = join(connection.runtimeRoot, 'controls')
  await mkdir(controls, { recursive: true })
  const cancelFile = join(controls, randomUUID() + '.cancel')
  const args = ['-m', 'hydrosystem.bridge', '--project-root', connection.projectRoot,
    '--work-root', connection.workRoot, '--runtime-root', connection.runtimeRoot,
    '--cancel-file', cancelFile]
  for (const name of connection.tools ?? []) args.push('--tool', name)
  for (const [key, flag] of [['hydromodelConfig', '--hydromodel-config'],
    ['dataConfig', '--data-config'], ['torchhydroConfig', '--torchhydro-config']]) {
    if (connection[key]) args.push(flag, connection[key])
  }
  try {
    return await new Promise((resolve, reject) => {
      const cancel = () => writeFileSync(cancelFile, 'cancel\n', { encoding: 'utf8' })
      const child = spawn(connection.python, args, {
        cwd: connection.projectRoot, windowsHide: true,
        env: { ...process.env, PYTHONUTF8: '1' }, stdio: ['pipe', 'pipe', 'pipe'],
      })
      let output = ''
      let diagnostics = ''
      let oversized = false
      let cancellationFailure
      let spawnFailure
      const requestCancel = () => {
        try { cancel() } catch (error) { cancellationFailure = error }
      }
      signal?.addEventListener('abort', requestCancel, { once: true })
      child.stdout.setEncoding('utf8').on('data', chunk => {
        if (oversized) return
        output += chunk
        if (Buffer.byteLength(output, 'utf8') > 8388608) {
          oversized = true
          output = ''
          requestCancel()
        }
      })
      child.stderr.setEncoding('utf8').on('data', chunk => { diagnostics = (diagnostics + chunk).slice(-65536) })
      child.on('error', error => { spawnFailure = error })
      child.on('close', code => {
        signal?.removeEventListener('abort', requestCancel)
        if (spawnFailure) return reject(spawnFailure)
        if (cancellationFailure) return reject(new Error('Cancellation could not be delivered; inspect the original execution.', { cause: cancellationFailure }))
        if (oversized) return reject(new Error('Hydrosystem response exceeded 8 MiB.'))
        if (code !== 0) return reject(new Error(`Hydrosystem process exited ${code}: ${diagnostics}`))
        try { resolve(JSON.parse(output)) } catch (error) { reject(new Error('Invalid hydrosystem process response.', { cause: error })) }
      })
      child.stdin.on('error', () => { /* Process settlement reports failed submission. */ })
      child.stdin.end(JSON.stringify(request))
      if (signal?.aborted) requestCancel()
    })
  } finally {
    try { await unlink(cancelFile) } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
}
