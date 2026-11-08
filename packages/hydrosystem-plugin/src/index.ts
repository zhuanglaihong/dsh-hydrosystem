/** Native hydrology tools over an independently managed Python runtime. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import '@deepseek-ai/dsh-tools';
import '@deepseek-ai/dsh-jobs';
import z from '@deepseek-ai/schemastery';
import { HarnessError } from '@deepseek-ai/dsh-llm';
import { randomUUID } from 'node:crypto';
import type { JobOutcome } from '@deepseek-ai/dsh-jobs';
import type { Json, WorkerFailure } from './protocol.js';
import { jsonObject, record } from './protocol.js';
import { HydrologyRuntime, resolveStateRoot } from './runtime.js';
import type { ResearchRoot } from './research.js';

export const name = 'hydrosystem-native';
export const inject = ['tools', 'jobs'];

/** Deployment-owned runtime selection; scientific requests cannot override it. */
export const Config: z<Config> = z.object({
  mode: z.union(['managed', 'existing']).default('managed'),
  python: z.string(),
  projectRoot: z.string(),
  stateRoot: z.string(),
  hydromodelConfig: z.string(),
  dataConfig: z.string(),
  torchhydroConfig: z.string(),
  researchRoots: z.array(z.object({ id: z.string().required(), title: z.string().required(), root: z.string().required() })),
});

/** Validated plugin configuration. */
export interface Config {
  mode: 'managed' | 'existing';
  python?: string;
  projectRoot?: string;
  stateRoot?: string;
  hydromodelConfig?: string;
  dataConfig?: string;
  torchhydroConfig?: string;
  researchRoots?: ResearchRoot[];
}

declare module '@deepseek-ai/dsh-jobs/view' {
  interface JobKindMap { hydrosystem: 'hydrosystem' }
}

function failed(error: WorkerFailure): never {
  throw new HarnessError(JSON.stringify(error), error.code);
}

function resolveToolArguments(name: string, args: { [key: string]: Json }): { [key: string]: Json } {
  const calibration = (request: { [key: string]: Json }) => ({ calibration_mode: 'quick', ...request });
  if (name === 'hydromodel_calibrate') return calibration(args);
  if (name === 'hydromodel_preflight' && args.operation === 'calibrate' && jsonObject(args.request)) {
    return { ...args, request: calibration(args.request) };
  }
  return args;
}

/** Register diagnostics immediately, then mount authorized native tools when ready. */
export function apply(ctx: Context, config: Config): void {
  const profile: unknown = ctx.get('profileContext');
  const directory = record(profile) && typeof profile.dir === 'string' ? profile.dir : process.env.DSH_PROFILE_DIR;
  const runtime = new HydrologyRuntime(config, resolveStateRoot(config, directory), text => ctx.logger.info(text));
  const turns = new WeakMap<Agent, { turn: number; failed: boolean }>();
  const owned = new Set(['hydrosystem_environment', 'hydrosystem_research', 'hydrosystem_setup_project', 'hydrosystem_read_artifact']);
  const workers = new Set<string>();
  ctx.on('agent/pre-step', async (payload, next) => {
    const previous = turns.get(payload.agent);
    const userInput = payload.messages.some(message => message.source?.kind === 'user');
    if (!previous || userInput || previous.turn !== payload.turn) {
      turns.set(payload.agent, { turn: payload.turn, failed: userInput ? false : previous?.failed ?? false });
    }
    return next();
  });
  ctx.on('tools/result', (execution, result) => {
    const turn = execution.agent && turns.get(execution.agent);
    if (turn && owned.has(execution.name) && result.isError) turn.failed = true;
  });
  ctx.effect(() => ctx.tools.guard(execution => {
    if (!execution.agent || !turns.get(execution.agent)?.failed) return;
    const mutation = execution.name === 'hydrosystem_setup_project'
      || execution.name === 'hydrosystem_research' && record(execution.arguments) && execution.arguments.operation === 'bind'
      || execution.name === 'hydrosystem_study' && record(execution.arguments) && execution.arguments.operation !== 'status';
    if (mutation || workers.has(execution.name)) return 'HYDROLOGY_TURN_STOPPED: A hydrology call failed. Do not start new work. Collect existing job outputs, inspect status and report the error; wait for a new user instruction. Automatic follow-ups do not authorize a restart.';
    return;
  }));
  let disposed = false;
  ctx.effect(() => async () => { disposed = true; await runtime.close(); });
  ctx.effect(() => ctx.tools.register({
    name: 'hydrosystem_environment',
    description: 'Read the hydrology environment preparation state. This does not start scientific work.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: { schema: {}, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute() {
      return runtime.status();
    },
  }));
  void runtime.ready.then(() => {
    if (disposed) return;
    for (const tool of runtime.tools) {
      owned.add(tool.name);
      if (tool.pool === 'worker') workers.add(tool.name);
    }
    ctx.effect(() => {
      const disposers: (() => void)[] = [];
      try {
        disposers.push(ctx.tools.register({
          name: 'hydrosystem_read_artifact',
          description: 'Read a JSON metadata artifact of at most 1 MiB in the current Study using its complete Artifact Reference. Verifies the path, schema, kind and content hash. Use this to inspect resolved parameters or reports; does not execute science or read arbitrary files.',
          parameters: { type:'object', properties:{ reference:{type:'object',properties:{
            artifact_id:{type:'string'},content_hash:{type:'string'},format:{type:'string',enum:['json']},
            kind:{type:'string'},path:{type:'string'},schema:{type:'string'},schema_version:{type:'string'},
          },required:['artifact_id','content_hash','format','kind','path','schema','schema_version'],additionalProperties:false}},required:['reference'],additionalProperties:false},
          output:{schema:{},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
          async execute(args,execution) {
            if (!jsonObject(args) || !jsonObject(args.reference)) throw new HarnessError('Use a complete JSON Artifact Reference.','INVALID_INPUT');
            const response=await runtime.forOwner(execution.agent?.id)({action:'read_artifact',reference:args.reference},execution.signal);
            if (!response.ok) failed(response.error);
            return response.value;
          },
        }));
        disposers.push(ctx.tools.register({
          name:'hydrosystem_setup_project',
          description:'Prepare a new research declaration from a local dataset explicitly selected by the user. Never guess a source path. Does not download data, install packages or initialize a Study. Returns and binds the new project; inspect data with preflight before scientific execution.',
          parameters:{type:'object',properties:{title:{type:'string'},source_root:{type:'string'},reader:{enum:['selfmade','camels_us']},dataset_id:{type:'string'},
            basin_ids:{type:'array',items:{type:'string'},minItems:1},period:{type:'array',items:{type:'string'},minItems:2,maxItems:2},
            variables:{type:'array',items:{type:'string'},minItems:1,uniqueItems:true},attributes:{type:'array',items:{type:'string'},minItems:1,uniqueItems:true},
            calibration_period:{type:'array',items:{type:'string'},minItems:2,maxItems:2},validation_period:{type:'array',items:{type:'string'},minItems:2,maxItems:2},
            warmup_steps:{type:'integer',minimum:0,maximum:3660}},required:['title','source_root','reader','dataset_id','basin_ids','period','calibration_period','validation_period'],additionalProperties:false},
          output:{schema:{},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
          async execute(args,execution) {
            if (!jsonObject(args)) throw new HarnessError('Expected project fields.','INVALID_INPUT');
            return runtime.prepareProject(args,execution.agent?.id,execution.signal);
          },
        }));
        disposers.push(ctx.tools.register({
          name: 'hydrosystem_research',
          description: 'List host-approved research projects, inspect the current selection, or explicitly bind this conversation to a project. Binding does not create or merge Studies. Use hydrosystem_study to inspect existing research before initialization.',
          parameters: { type: 'object', properties: { operation: { type: 'string', enum: ['list', 'current', 'bind'] },
            project_id: { type: 'string' } }, required: ['operation'], additionalProperties: false },
          output: { schema: {}, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
          async execute(args, execution) {
            const owner = execution.agent?.id;
            return runtime.research.execute(args, owner, owner !== undefined && runtime.busy.has(owner));
          },
        }));
        for (const tool of runtime.tools) disposers.push(ctx.tools.register({
          name: tool.name,
          description: tool.description + (tool.name === 'hydromodel_status'
            ? ' For calibration/workflow results use task_ref or the returned status_query. run_ref is only for standalone runs; a calibration run_id is not a standalone run_ref.' : '') + (tool.pool === 'worker'
            ? ' Returns a DSH background job; collect its final result using job_output and request cancellation with job_kill. Do not resubmit.' : ''),
          parameters: tool.parameters,
          output: { schema: {}, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
          async execute(args, execution) {
            if (!jsonObject(args)) throw new HarnessError('Tool arguments must be a JSON object.', 'INVALID_INPUT');
            const caller=execution.agent?.id;
            if (tool.name === 'hydrosystem_study' && args.operation !== 'status' && caller && runtime.busy.has(caller)) {
              throw new HarnessError('Wait for the current operation before changing the research.','RESOURCE_BUSY');
            }
            const run = runtime.forOwner(execution.agent?.id);
            const request: Json = { action: 'call', name: tool.name,
              arguments: { ...resolveToolArguments(tool.name,args), execution_id: args.execution_id === undefined ? randomUUID() : args.execution_id } };
            if (tool.pool === 'control') {
              const response = await run(request, execution.signal);
              if (!response.ok) failed(response.error);
              return response.value;
            }
            const owner = execution.agent?.id;
            if (!owner) throw new HarnessError('A scientific job requires an owning conversation.', 'SESSION_REQUIRED');
            if (runtime.busy.has(owner)) throw new HarnessError('This conversation already owns a scientific job.', 'RESOURCE_BUSY');
            runtime.busy.add(owner);
            const turn = execution.agent && turns.get(execution.agent);
            try {
              execution.signal.throwIfAborted();
              const jobId = ctx.jobs.start({
                kind: 'hydrosystem', label: tool.name, owner,
                toolCall: { callId: execution.callId, rootCallId: execution.rootCallId },
                run(job) {
                  const controller = new AbortController();
                  job.updateProgress(tool.name);
                  const done: Promise<JobOutcome> = run(request, controller.signal).then(response => response.ok
                    ? { status: 'completed' as const, result: JSON.stringify(response.value) }
                    : { status: response.error.code === 'EXECUTION_CANCELLED' ? 'killed' as const : 'failed' as const,
                      detail: response.error.code, result: JSON.stringify(response.error) },
                  error => ({ status: error instanceof Error && error.name === 'AbortError' ? 'killed' as const : 'failed' as const,
                    detail: error instanceof Error ? error.message : String(error) }))
                    .then(outcome => {
                      if (turn && outcome.status !== 'completed') turn.failed = true;
                      return outcome;
                    }).finally(() => runtime.busy.delete(owner));
                  return { cancel: () => controller.abort(), done };
                },
              });
              return { kind: 'background', job_id: jobId, operation: tool.name,
                next_action: 'Use job_output; a submitted job is not a completed scientific result.' };
            } catch (error) { runtime.busy.delete(owner); throw error; }
          },
        }));
      } catch (error) {
        for (const dispose of disposers.reverse()) dispose();
        runtime.registrationFailed(error);
        throw error;
      }
      return () => { for (const dispose of disposers.reverse()) dispose(); };
    });
  }).catch(error => ctx.logger.error('Hydrosystem preparation failed; query hydrosystem_environment.', error));
}
