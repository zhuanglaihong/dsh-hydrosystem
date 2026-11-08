/** Plugin-owned environment readiness and worker lifetimes. */
import { createHash, randomUUID } from 'node:crypto';
import { HarnessError } from '@deepseek-ai/dsh-llm';
import { isAbsolute, join } from 'node:path';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { Config } from './index.js';
import type { Connection, Json, WorkerResponse } from './protocol.js';
import { jsonObject, record } from './protocol.js';
import { invoke } from './transport.js';
import { prepareManaged } from './managed.js';
import { ResearchBindings } from './research.js';

/** One authorized tool discovered from the common core. */
export interface ScientificTool {
  name: string;
  description: string;
  parameters: ToolDefinition['parameters'];
  pool: 'control' | 'worker';
}

function discovery(value: Json): ScientificTool[] {
  if (!record(value) || !Array.isArray(value.tools)) throw new Error('Invalid common-core discovery response.');
  return value.tools.map((raw: unknown) => {
    if (!record(raw) || typeof raw.name !== 'string' || typeof raw.description !== 'string'
      || !record(raw.input_schema) || !record(raw.execution)
      || (raw.execution.pool !== 'control' && raw.execution.pool !== 'worker')) {
      throw new Error('Invalid common-core tool definition.');
    }
    // The DSH registry validates supported JSON Schema when registering it.
    return { name: raw.name, description: raw.description,
      parameters: raw.input_schema as ToolDefinition['parameters'], pool: raw.execution.pool };
  });
}

function absolute(value: string | undefined, field: string): string {
  if (!value || !isAbsolute(value)) throw new Error(`INVALID_CONFIGURATION: ${field} requires an absolute path.`);
  return value;
}

/** Resolve deployment paths once; scientific tool JSON cannot change them. */
export function resolveStateRoot(config: Config, profileDirectory: string | undefined): string {
  return config.stateRoot ? absolute(config.stateRoot, 'stateRoot')
    : join(absolute(profileDirectory, 'profile directory'), 'hydrosystem');
}

/** Own the verified binding, readiness state, and every scientific worker. */
export class HydrologyRuntime {
  readonly ready: Promise<void>;
  readonly busy = new Set<string>();
  readonly research: ResearchBindings;
  tools: ScientificTool[] = [];
  private connection?: Connection;
  private stopped = false;
  private state: 'preparing' | 'ready' | 'failed' | 'stopped' = 'preparing';
  private detail = 'Checking the hydrology environment.';
  private facts: Json = null;
  private readonly controllers = new Set<AbortController>();
  private readonly pending = new Set<Promise<WorkerResponse>>();

  constructor(readonly config: Config, readonly stateRoot: string, onProgress: (text: string) => void) {
    this.research = new ResearchBindings(stateRoot, config.researchRoots ?? []);
    this.ready = this.initialize(text => { this.detail = text; onProgress(text); }).catch(error => {
      this.state = 'failed';
      this.detail = error instanceof Error ? error.message : String(error);
      throw error;
    });
  }

  private async initialize(progress: (text: string) => void): Promise<void> {
    if (this.config.mode === 'existing') {
      this.connection = { python: absolute(this.config.python, 'python'),
        projectRoot: absolute(this.config.projectRoot, 'projectRoot'),
        workRoot: join(this.stateRoot, 'studies/default'), runtimeRoot: join(this.stateRoot, 'runtime') };
    } else this.connection = await prepareManaged(this.stateRoot, progress);
    for (const name of ['hydromodelConfig', 'dataConfig', 'torchhydroConfig'] as const) {
      const path = this.config[name];
      if (path) this.connection[name] = absolute(path, name);
    }
    if (this.stopped) throw new Error('Plugin stopped during environment preparation.');
    progress('Checking package sources and discovering authorized tools.');
    const facts = await this.request(this.connection, { action: 'inspect' });
    if (!facts.ok) throw new Error(JSON.stringify(facts.error));
    const found = await this.request(this.connection, { action: 'supported' });
    if (!found.ok) throw new Error(JSON.stringify(found.error));
    this.facts = facts.value;
    this.tools = discovery(found.value);
    this.state = 'ready';
    this.detail = 'The environment is ready; scientific data and execution are checked separately.';
  }

  /** Read readiness without installing dependencies or launching science. */
  status(): Json {
    return { status: this.state, mode: this.config.mode, detail: this.detail,
      tools: this.tools.map(tool => tool.name), environment: this.facts,
      scientific_execution: 'query_selected_study', tool_scope: 'supported_interfaces_require_project_deployment' };
  }

  /** Make host registration failure visible and prevent scientific admission. */
  registrationFailed(error: unknown): void {
    this.state = 'failed';
    this.detail = error instanceof Error ? error.message : String(error);
    this.tools = [];
  }

  /** Prepare declarations for an explicitly chosen local source and bind the caller. */
  async prepareProject(spec: Json, owner: string | undefined, signal: AbortSignal): Promise<Json> {
    if (!owner) throw new HarnessError('A project requires an owning conversation.', 'SESSION_REQUIRED');
    if (!this.connection || this.state !== 'ready') throw new HarnessError('Wait for the managed environment.', 'ENVIRONMENT_NOT_READY');
    if (this.busy.has(owner)) throw new HarnessError('Wait for the current scientific job.', 'RESOURCE_BUSY');
    this.busy.add(owner);
    try {
      const id='project-'+randomUUID();
      // Short physical directories leave room for Windows artifact and atomic-write names.
      const output=join(this.stateRoot,'p',id.slice('project-'.length).replaceAll('-',''));
      const response=await this.request({...this.connection,configurationRoot:output}, {action:'prepare',spec},signal);
      if (this.stopped || signal.aborted) throw new HarnessError('Project preparation stopped; any prepared declaration is retained without changing the conversation binding.','EXECUTION_CANCELLED');
      if (!response.ok) throw new HarnessError(JSON.stringify(response.error),response.error.code);
      const project=response.value;
      if (!record(project) || typeof project.title !== 'string' || project.root !== join(output,'study')
        || project.dataConfig !== join(output,'data.json') || project.hydromodelConfig !== join(output,'model.json')
        || project.torchhydroConfig !== join(output,'training.json')) throw new Error('Invalid prepared project declaration.');
      this.research.add({id,title:project.title,root:project.root, dataConfig:project.dataConfig,
        hydromodelConfig:project.hydromodelConfig,torchhydroConfig:project.torchhydroConfig,
        ...(jsonObject(spec)?{source:spec}:{})});
      return this.research.execute({operation:'bind',project_id:id},owner,false);
    } finally { this.busy.delete(owner); }
  }

  /** Capture this conversation's binding before a background job is admitted. */
  forOwner(owner?: string): (request: Json, signal?: AbortSignal) => Promise<WorkerResponse> {
    if (!this.connection || this.state !== 'ready') throw new Error('ENVIRONMENT_NOT_READY: query hydrosystem_environment.');
    const project = owner ? this.research.current(owner) : undefined;
    const binding = { ...this.connection, workRoot: owner
      ? project?.root ?? join(this.stateRoot, 'studies', createHash('sha256').update(owner).digest('hex').slice(0, 24))
      : this.connection.workRoot };
    if (project) for (const field of ['dataConfig','hydromodelConfig','torchhydroConfig'] as const) {
      if (project[field]) binding[field]=project[field];
    }
    return (request, signal) => this.request(binding, request, signal);
  }

  private request(binding: Connection, request: Json, callerSignal?: AbortSignal): Promise<WorkerResponse> {
    if (this.stopped) return Promise.reject(new Error('Hydrosystem is stopping.'));
    const controller = new AbortController();
    const cancel = () => controller.abort();
    callerSignal?.addEventListener('abort', cancel, { once: true });
    if (callerSignal?.aborted) cancel();
    this.controllers.add(controller);
    const pending = invoke(binding, request, controller.signal).finally(() => {
      this.controllers.delete(controller);
      callerSignal?.removeEventListener('abort', cancel);
      this.pending.delete(pending);
    });
    this.pending.add(pending);
    return pending;
  }

  /** Stop accepting requests and wait for owned workers to exit and settle. */
  async close(): Promise<void> {
    this.stopped = true;
    for (const controller of this.controllers) controller.abort();
    await this.ready.catch(() => {});
    await Promise.allSettled([...this.pending]);
    this.state = 'stopped';
  }
}
