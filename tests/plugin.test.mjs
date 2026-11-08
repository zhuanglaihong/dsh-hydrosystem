import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import * as plugin from '../packages/hydrosystem-plugin/lib/index.js';

test('ordinary sessions receive real tools without selecting the hydrology preset', async () => {
  assert.ok(process.env.HYDROSYSTEM_TEST_PYTHON, 'Use an explicitly selected scientific interpreter');
  const stateRoot = await mkdtemp(join(tmpdir(), 'dsh-hydro-plugin-'));
  const ctx = new Context();
  const tools = new Map();
  let ready;
  let registered = new Promise(resolve => { ready = resolve; });
  ctx.provide('tools', { guard() { return () => {}; }, register(tool) {
    tools.set(tool.name, tool);
    if (tool.name === 'capabilities') ready();
    return () => tools.delete(tool.name);
  } });
  const jobs = new Map();
  ctx.provide('jobs', { start(spec) {
    const id = `hydrosystem-${jobs.size + 1}`;
    const handle = spec.run({ updateProgress() {} });
    jobs.set(id, { ...handle, owner: spec.owner });
    return id;
  } });
  const configuration = { mode: 'existing', python: process.env.HYDROSYSTEM_TEST_PYTHON,
    projectRoot: process.env.HYDROSYSTEM_TEST_SOURCE, stateRoot,
    researchRoots: [{ id: 'shared-basin', title: 'Shared synthetic research', root: join(stateRoot, 'shared') }] };
  let fork = ctx.plugin(plugin, configuration);
  try {
    await Promise.race([registered, new Promise((_, reject) => setTimeout(() => reject(new Error('Public tools did not become ready')), 60000).unref())]);
    const diagnostics = await tools.get('hydrosystem_environment').execute({}, { signal: new AbortController().signal });
    assert.equal(diagnostics.status, 'ready');
    assert.equal(diagnostics.mode, 'existing');
    const result = await tools.get('capabilities').execute({}, { signal: new AbortController().signal });
    assert.equal(result.schema_version, '0.2');
    assert.ok(tools.has('hydroutils_compute_metrics'));
    assert.equal(tools.get('hydrosystem_study').parameters.properties.new_research.type, 'boolean');
    assert.ok(tools.has('hydromodel_calibrate'), 'Supported tools remain visible; scoped execution still requires a deployment');
    const owner = 'test-conversation';
    const select = (args, id = owner) => tools.get('hydrosystem_research').execute(args, {
      agent: { id }, signal: new AbortController().signal,
    });
    const bound = await select({ operation: 'bind', project_id: 'shared-basin' });
    assert.equal(bound.project_id, 'shared-basin');
    await assert.rejects(() => select({ operation: 'bind', project_id: '../outside' }), { code: 'UNKNOWN_PROJECT' });
    await assert.rejects(() => tools.get('hydrosystem_study').execute({
      operation: 'initialize', new_research: 'true', goal: 'Shared synthetic research',
    }, { agent: { id: owner }, signal: new AbortController().signal }), { code: 'INVALID_INPUT' });
    const initialized = await tools.get('hydrosystem_study').execute({
      operation: 'initialize', new_research: true, goal: 'Shared synthetic research',
    }, { agent: { id: owner }, signal: new AbortController().signal });
    await select({ operation: 'bind', project_id: 'shared-basin' }, 'another-conversation');
    const continued = await tools.get('hydrosystem_study').execute({ operation: 'status' }, {
      agent: { id: 'another-conversation' }, signal: new AbortController().signal,
    });
    assert.equal(continued.study.study_ref, initialized.study.study_ref);
    const submitted = await tools.get('hydroutils_compute_metrics').execute({
      profile: 'hydroutils.streamflow-metrics/v1', observed: [1, 2, 3, 4], simulated: [1, 2, 3, 4],
    }, { agent: { id: owner }, signal: new AbortController().signal });
    assert.equal(submitted.kind, 'background');
    await assert.rejects(() => select({ operation: 'bind', project_id: 'shared-basin' }), { code: 'RESOURCE_BUSY' });
    await assert.rejects(() => tools.get('hydrosystem_study').execute({ operation:'initialize',new_research:true,goal:'Shared synthetic research' }, {
      agent:{id:owner},signal:new AbortController().signal,
    }), {code:'RESOURCE_BUSY'});
    const job = jobs.get(submitted.job_id);
    assert.equal(job.owner, owner);
    const outcome = await job.done;
    assert.equal(outcome.status, 'completed');
    assert.deepEqual(JSON.parse(outcome.result).metrics, { NSE: 1, KGE: 1, RMSE: 0 });
    await assert.rejects(() => tools.get('capabilities').execute({ unknown: true }, {
      signal: new AbortController().signal,
    }), /INVALID_INPUT/);
    const cancelled = await tools.get('hydroutils_compute_metrics').execute({
      profile: 'hydroutils.streamflow-metrics/v1', observed: [1, 2, 3, 4], simulated: [1, 2, 3, 4],
    }, { agent: { id: owner }, signal: new AbortController().signal });
    const cancellingJob = jobs.get(cancelled.job_id);
    cancellingJob.cancel();
    assert.equal((await cancellingJob.done).status, 'killed', 'Immediate cancellation is acknowledged after worker settlement');
    await fork.dispose();
    registered = new Promise(resolve => { ready = resolve; });
    fork = ctx.plugin(plugin, configuration);
    await Promise.race([registered, new Promise((_, reject) => setTimeout(() => reject(new Error('Reload not ready')), 30000).unref())]);
    assert.equal((await select({ operation: 'current' })).project_id, 'shared-basin');
    const restored = await tools.get('hydrosystem_study').execute({ operation: 'status' }, {
      agent: { id: owner }, signal: new AbortController().signal,
    });
    assert.equal(restored.study.study_ref, initialized.study.study_ref);
    await fork.dispose();
    registered = new Promise(resolve => { ready = resolve; });
    fork = ctx.plugin(plugin, { ...configuration,
      researchRoots: [{ id: 'shared-basin', title: 'Changed location', root: join(stateRoot, 'other') }] });
    await Promise.race([registered, new Promise((_, reject) => setTimeout(() => reject(new Error('Changed configuration not ready')), 30000).unref())]);
    await assert.rejects(() => select({ operation: 'current' }), { code: 'BINDING_CHANGED' });
  } finally {
    await fork.dispose();
    assert.equal(tools.size, 0, 'Unloading removes only this plugin’s registrations');
    await rm(stateRoot, { recursive: true });
  }
});

test('a rejected native registration leaves diagnostics and removes partial scientific tools', async () => {
  const stateRoot = await mkdtemp(join(tmpdir(), 'dsh-hydro-registration-'));
  const ctx = new Context();
  const tools = new Map();
  let rejectRegistration;
  const rejected = new Promise(resolve => { rejectRegistration = resolve; });
  ctx.provide('tools', { guard() { return () => {}; }, register(tool) {
    if (tool.name === 'hydroutils_compute_metrics') {
      rejectRegistration();
      throw new Error('Host rejected the scientific registration');
    }
    tools.set(tool.name, tool);
    return () => tools.delete(tool.name);
  } });
  ctx.provide('jobs', {});
  const fork = ctx.plugin(plugin, { mode: 'existing', python: process.env.HYDROSYSTEM_TEST_PYTHON,
    projectRoot: process.env.HYDROSYSTEM_TEST_SOURCE, stateRoot });
  try {
    await Promise.race([rejected, new Promise((_, reject) => setTimeout(() => reject(new Error('Registration not attempted')), 30000).unref())]);
    await new Promise(resolve => setImmediate(resolve));
    const status = await tools.get('hydrosystem_environment').execute({});
    assert.equal(status.status, 'failed');
    assert.match(status.detail, /Host rejected/);
    assert.deepEqual([...tools.keys()], ['hydrosystem_environment']);
  } finally { await fork.dispose(); await rm(stateRoot, { recursive: true }); }
});

test('an unavailable interpreter leaves a readable failure and no scientific tools', async () => {
  const stateRoot=await mkdtemp(join(tmpdir(),'dsh-hydro-dependency-'));
  const ctx=new Context(),tools=new Map();
  ctx.provide('tools',{guard(){return()=>{};},register(tool){tools.set(tool.name,tool);return()=>tools.delete(tool.name);}});
  ctx.provide('jobs',{});
  const fork=ctx.plugin(plugin,{mode:'existing',python:join(stateRoot,'missing-python.exe'),
    projectRoot:process.env.HYDROSYSTEM_TEST_SOURCE,stateRoot});
  try {
    let status;
    for(let attempt=0;attempt<100;attempt++) {
      status=await tools.get('hydrosystem_environment')?.execute({});
      if(status?.status==='failed')break;
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    assert.equal(status.status,'failed');
    assert.match(status.detail,/missing-python/);
    assert.deepEqual([...tools.keys()],['hydrosystem_environment']);
  } finally {await fork.dispose();await rm(stateRoot,{recursive:true});}
});
