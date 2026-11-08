/** Real Next host probe: no model requests, synthetic inputs, isolated sessions. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { exerciseScience } from './science-workflow.mjs';

export const name = 'hydrology-release-probe';
export const inject = ['tools', 'agentPresets', 'agentLoop', 'jobs'];

export function apply(ctx, config) {
  let stopped = false;
  const timer = setInterval(async () => {
    if (stopped) return;
    const tool = ctx.tools.get('hydrosystem_environment');
    if (!tool) return;
    const status = await tool.execute({}, { signal: new AbortController().signal });
    if (status.status === 'preparing') return;
    stopped = true;
    clearInterval(timer);
    let handle;
    try {
      assert.equal(status.status, 'ready', status.detail);
      const expert = (await ctx.agentPresets.list()).find(p => p.id === 'hydrology-expert');
      assert.ok(expert);
      assert.equal(expert.broken, undefined);
      assert.equal(expert.name, '水文专家');
      const caps = await ctx.tools.get('capabilities').execute({}, { signal: new AbortController().signal });
      assert.equal(caps.schema_version, '0.2');
      handle = await ctx.agentLoop.createAgent(ctx, { sessionId: randomUUID(), meta: { cwd: config.workspace },
        setup: async child => { await ctx.agentPresets.mount(child, 'standard'); } });
      const agent = handle.agent;
      const context = owner => ({ agent: owner, signal: new AbortController().signal });
      assert.equal(ctx.tools.get('hydrosystem_study').parameters.properties.new_research.type, 'boolean');
      const selection = await ctx.tools.get('hydrosystem_research').execute({ operation: 'bind', project_id: 'probe-research' }, context(agent));
      await assert.rejects(() => ctx.tools.get('hydrosystem_study').execute({ operation: 'initialize', new_research: 'true',
        goal: 'Explicit cross-conversation acceptance' }, context(agent)), { code: 'INVALID_INPUT' });
      const created = await ctx.tools.get('hydrosystem_study').execute({ operation: 'initialize', new_research: true,
        goal: 'Explicit cross-conversation acceptance' }, context(agent));
      const second = await ctx.agentLoop.createAgent(ctx, { sessionId: randomUUID(), meta: { cwd: config.workspace },
        setup: async child => { await ctx.agentPresets.mount(child, 'standard'); } });
      try {
        await ctx.tools.get('hydrosystem_research').execute({ operation: 'bind', project_id: 'probe-research' }, context(second.agent));
        const reused = await ctx.tools.get('hydrosystem_study').execute({ operation: 'status' }, context(second.agent));
        assert.equal(reused.study.study_ref, created.study.study_ref);
      } finally { await second.dispose(); }
      async function metrics() {
        const callId = randomUUID();
        const submitted = await ctx.tools.get('hydroutils_compute_metrics', agent).execute({
          profile: 'hydroutils.streamflow-metrics/v1', observed: [1, 2, 3, 4], simulated: [1, 2, 3, 4],
        }, { agent, callId, rootCallId: callId, signal: new AbortController().signal });
        assert.equal(submitted.kind, 'background');
        const settled = await ctx.jobs.wait(submitted.job_id, 30000, agent.id);
        assert.equal(settled.status, 'completed', settled.detail);
        const output = ctx.jobs.read(submitted.job_id, agent.id);
        const result = JSON.parse(output.result);
        assert.deepEqual(result.metrics, { NSE: 1, KGE: 1, RMSE: 0 });
        return { job_id: submitted.job_id, metrics: result.metrics };
      }
      const ordinary = await metrics();
      await ctx.agentPresets.select(agent, 'hydrology-expert');
      const hydrologyExpert = await metrics();
      const callId = randomUUID();
      const cancelling = await ctx.tools.get('hydroutils_compute_metrics', agent).execute({
        profile: 'hydroutils.streamflow-metrics/v1', observed: [1, 2, 3, 4], simulated: [1, 2, 3, 4],
      }, { agent, callId, rootCallId: callId, signal: new AbortController().signal });
      ctx.jobs.kill(cancelling.job_id, agent.id, 'isolated acceptance cancellation');
      const cancelled = await ctx.jobs.wait(cancelling.job_id, 30000, agent.id);
      assert.equal(cancelled.status, 'killed', cancelled.detail);
      const science={};
      if(config.scienceSpec) {
        const spec=JSON.parse(await readFile(config.scienceSpec,'utf8'));
        for(const preset of ['standard','hydrology-expert']) {
          await ctx.agentPresets.select(agent,preset);
          const call=async(name,args)=>{
            console.error('SCIENCE '+preset+' '+name);
            const callId=randomUUID();
            const result=await ctx.tools.get(name,agent).execute(args,{agent,callId,rootCallId:callId,signal:new AbortController().signal});
            if(result?.kind!=='background')return result;
            for(;;) {
              const status=await ctx.jobs.wait(result.job_id,30000,agent.id);
              if(status.status==='running'||status.status==='stopping')continue;
              const output=ctx.jobs.read(result.job_id,agent.id);
              assert.equal(status.status,'completed',output.result??status.detail);
              return JSON.parse(output.result);
            }
          };
          science[preset]=await exerciseScience(call,{...spec,title:spec.title+' / '+preset});
        }
      }
      await writeFile(config.report, JSON.stringify({ outcome: 'passed', status, preset: expert,
        ordinary, hydrologyExpert, cancellation: cancelled.status, research: { ...selection, study_ref: created.study.study_ref },science }, null, 2) + '\n');
      console.error('HYDROLOGY_RELEASE_PROBE_PASSED');
    } catch (error) {
      await writeFile(config.report, JSON.stringify({ outcome: 'failed', message: String(error), stack: error.stack }) + '\n');
      console.error(error);
    } finally { await handle?.dispose(); }
  }, 500);
  ctx.effect(() => () => { stopped = true; clearInterval(timer); });
}
