/** Bounded process transport with cooperative, acknowledged cancellation. */
import { spawn } from 'node:child_process';
import { mkdir, unlink } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Connection, Json, WorkerResponse } from './protocol.js';
import { parseResponse } from './protocol.js';

const WORKER = fileURLToPath(new URL('../python/worker.py', import.meta.url));
const MAX_REPLY_BYTES = 8388608;

/** Invoke the packaged adapter using an explicit Python and deployment binding. */
export async function invoke(connection: Connection, request: Json, signal?: AbortSignal): Promise<WorkerResponse> {
  signal?.throwIfAborted();
  const input = JSON.stringify(request);
  if (Buffer.byteLength(input) > 1048576) throw new Error('REQUEST_TOO_LARGE: worker input exceeds 1 MiB.');
  const controls = join(connection.runtimeRoot, 'controls');
  await mkdir(controls, { recursive: true });
  const cancelPath = join(controls, `${randomUUID()}.cancel`);
  const args = [WORKER, '--project-root', connection.projectRoot, '--work-root', connection.workRoot,
    '--runtime-root', connection.runtimeRoot, '--cancel-file', cancelPath];
  for (const [name, flag] of [['hydromodelConfig', '--hydromodel-config'], ['dataConfig', '--data-config'],
    ['torchhydroConfig', '--torchhydro-config'], ['configurationRoot', '--configuration-root']] as const) {
    const value = connection[name];
    if (value) args.push(flag, value);
  }
  try {
    return await new Promise<WorkerResponse>((resolve, reject) => {
      signal?.throwIfAborted();
      const child = spawn(connection.python, args, { cwd: connection.projectRoot, windowsHide: true,
        env: { ...process.env, PYTHONUTF8: '1' }, stdio: ['pipe', 'pipe', 'pipe'] });
      let output = '', diagnostics = '', bytes = 0, overflow = false;
      let launchError: Error | undefined, cancellationError: Error | undefined;
      const cancel = () => {
        try { writeFileSync(cancelPath, 'cancel\n', 'utf8'); }
        catch (error) { cancellationError = error instanceof Error ? error : new Error(String(error)); }
      };
      signal?.addEventListener('abort', cancel, { once: true });
      if (signal?.aborted) cancel();
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        bytes += Buffer.byteLength(chunk);
        if (bytes > MAX_REPLY_BYTES) { overflow = true; cancel(); }
        else output += chunk;
      });
      child.stderr.on('data', (chunk: string) => { diagnostics = (diagnostics + chunk).slice(-32768); });
      child.on('error', error => { launchError = error; });
      child.stdin.on('error', error => { launchError = error; });
      child.on('close', code => {
        signal?.removeEventListener('abort', cancel);
        if (launchError) return reject(launchError);
        if (cancellationError) return reject(new Error(`CANCEL_DELIVERY_FAILED: ${cancellationError.message}`));
        if (overflow) return reject(new Error('WORKER_OUTPUT_TOO_LARGE: execution stopped after the worker exited.'));
        if (code !== 0) return reject(new Error(`WORKER_EXIT_${code}: ${diagnostics}`));
        try { resolve(parseResponse(output)); } catch (error) { reject(error); }
      });
      child.stdin.end(input);
    });
  } finally {
    try { await unlink(cancelPath); }
    catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
  }
}
