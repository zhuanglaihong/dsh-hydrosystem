import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import ToolsService from '@deepseek-ai/dsh-tools';
import { ToolExecutionPipeline, executeToolBatch } from '@deepseek-ai/dsh-tools/pipeline';
import * as plugin from '../packages/hydrosystem-plugin/lib/index.js';

test('a hydrology failure blocks new work in its turn without blocking diagnostics or another agent', async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), 'hydro-turn-'));
  const ctx = new Context();
  ctx.provide('systemPrompt', { tools() { return () => {}; } });
  const registry = ctx.plugin(ToolsService, {});
  const admitted = [];
  ctx.provide('jobs', { start(spec) { admitted.push(spec); return `fixture-${admitted.length}`; } });
  const fork = ctx.plugin(plugin, { mode: 'existing', stateRoot,
    python: process.env.HYDROSYSTEM_TEST_PYTHON, projectRoot: process.env.HYDROSYSTEM_TEST_SOURCE });
  try {
    for (let i = 0; i < 300 && !ctx.tools?.get('capabilities'); i++) await new Promise(r => setTimeout(r, 20));
    assert.ok(ctx.tools.get('capabilities'));
    const agent = { id: 'turn-owner', ctx };
    const other = { id: 'another-owner', ctx };
    const signal = new AbortController().signal;
    const enter = (owner, turn, step = 0, messages = step === 0 ? [{ role:'user', id:`user-${turn}`, source:{kind:'user'}, content:[{type:'text',text:'Continue the requested test.'}] }] : []) => ctx.waterfall('agent/pre-step', {
      agent: owner, turn, step, messages, signal, modelSelection: { provider: 'fixture', model: 'fixture' },
    }, async () => undefined);
    const execute = (owner, calls) => executeToolBatch({ agent: owner, calls: calls.map(([name, args], i) => ({
      type: 'tool_call', id: `call-${i}`, name, arguments: JSON.stringify(args),
    })), signal }, new ToolExecutionPipeline(ctx), () => 1);
    const metrics = ['hydroutils_compute_metrics', { profile: 'hydroutils.streamflow-metrics/v1', observed: [1,2,3,4], simulated: [1,2,3,4] }];
    await enter(agent, 1);
    const batch = await execute(agent, [['capabilities', { invalid: true }], metrics]);
    assert.equal(batch.results[0].result.isError, true);
    assert.equal(batch.results[1].result.isError, true, 'The second call must not admit a scientific job after an error');
    assert.match(batch.results[1].result.error.message, /HYDROLOGY_TURN_STOPPED/);
    assert.equal(admitted.length, 0);
    await enter(agent, 1, 1);
    assert.equal((await execute(agent, [metrics])).results[0].result.isError, true);
    assert.equal((await execute(agent, [['capabilities', {}]])).results[0].result.isError, false);
    await enter(agent, 2, 0, []);
    assert.equal((await execute(agent, [metrics])).results[0].result.isError, true, 'Automatic follow-ups must not clear a failed user request');
    await enter(other, 1);
    assert.equal((await execute(other, [metrics])).results[0].result.isError, false);
    assert.equal((await admitted.at(-1).run({ updateProgress() {} }).done).status, 'completed');
    await enter(agent, 2);
    assert.equal((await execute(agent, [metrics])).results[0].result.isError, false);
    assert.equal((await admitted.at(-1).run({ updateProgress() {} }).done).status, 'completed');
    await enter(agent, 3);
    const bad = [metrics[0], { ...metrics[1], simulated: [1,2] }];
    assert.equal((await execute(agent, [bad])).results[0].result.isError, false);
    assert.equal((await admitted.at(-1).run({ updateProgress() {} }).done).status, 'failed');
    const afterFailure = await execute(agent, [metrics]);
    assert.equal(afterFailure.results[0].result.isError, true, 'A failed background job also stops further admissions');
    await fork.dispose();
    assert.equal(ctx.tools.checkGuards({ agent, name: metrics[0], arguments: metrics[1], signal }), undefined);
  } finally {
    await fork.dispose(); await registry.dispose();
    await rm(stateRoot, { recursive: true });
  }
});
