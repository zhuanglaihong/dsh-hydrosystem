/** Exercise default environment provisioning through the public plugin entry. */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import * as plugin from '../packages/hydrosystem-plugin/lib/index.js';

assert.equal(process.argv.length, 3, 'Pass one explicit, isolated state directory');
const stateRoot = resolve(process.argv[2]);
const ctx = new Context();
const tools = new Map();
const jobs = new Map();
ctx.provide('tools', { guard() { return () => {}; }, register(tool) { tools.set(tool.name, tool); return () => tools.delete(tool.name); } });
ctx.provide('jobs', { start(spec) {
  const id = `hydrosystem-${jobs.size + 1}`;
  jobs.set(id, spec.run({ updateProgress() {} }));
  return id;
} });
const fork = ctx.plugin(plugin, { mode: 'managed', stateRoot });
try {
  let diagnostic;
  let previous;
  for (;;) {
    const tool = tools.get('hydrosystem_environment');
    if (tool) {
      diagnostic = await tool.execute({});
      if (diagnostic.detail !== previous) { console.log(diagnostic.detail); previous = diagnostic.detail; }
      if (diagnostic.status === 'failed') throw new Error(diagnostic.detail);
      if (diagnostic.status === 'ready') break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  const submitted = await tools.get('hydroutils_compute_metrics').execute({
    profile: 'hydroutils.streamflow-metrics/v1', observed: [1, 2, 3, 4], simulated: [1, 2, 3, 4],
  }, { agent: { id: 'managed-smoke' }, signal: new AbortController().signal });
  const outcome = await jobs.get(submitted.job_id).done;
  assert.equal(outcome.status, 'completed', outcome.result ?? outcome.detail);
  const result = JSON.parse(outcome.result);
  assert.deepEqual(result.metrics, { NSE: 1, KGE: 1, RMSE: 0 });
  const toolDeclarationBytes=Buffer.byteLength(JSON.stringify([...tools.values()].map(tool=>({name:tool.name,description:tool.description,parameters:tool.parameters}))));
  const report = { outcome: 'passed', diagnostic, scientific_execution: result, tool_declaration_bytes:toolDeclarationBytes };
  await writeFile(join(stateRoot, 'smoke-result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ outcome: 'passed', tools: tools.size, toolDeclarationBytes, metrics: result.metrics, stateRoot }));
} finally { await fork.dispose(); }
