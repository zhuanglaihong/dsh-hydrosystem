/** Durable conversation selections; scientific Study records remain core-owned. */
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { HarnessError } from '@deepseek-ai/dsh-llm';
import type { Json } from './protocol.js';
import { jsonObject, record } from './protocol.js';

/** Host-approved research location, independent of model arguments. */
export interface ResearchRoot { id: string; title: string; root: string; hydromodelConfig?: string; dataConfig?: string; torchhydroConfig?: string; source?: { [key:string]:Json } }

/** Store one atomic selection per conversation without creating a Study. */
export class ResearchBindings {
  private readonly projects = new Map<string, ResearchRoot>();
  constructor(private readonly stateRoot: string, roots: readonly ResearchRoot[]) {
    for (const project of roots) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(project.id) || !project.title.trim()
        || !isAbsolute(project.root) || this.projects.has(project.id)) {
        throw new Error('INVALID_CONFIGURATION: researchRoots require unique IDs, titles and absolute roots.');
      }
      this.projects.set(project.id, { ...project, root: resolve(project.root) });
    }
    const directory = join(stateRoot, 'projects');
    if (existsSync(directory)) for (const name of readdirSync(directory).filter(name => name.endsWith('.json'))) {
      const raw: unknown = JSON.parse(readFileSync(join(directory, name), 'utf8'));
      if (!record(raw) || typeof raw.id !== 'string' || typeof raw.title !== 'string' || typeof raw.root !== 'string'
        || typeof raw.hydromodelConfig !== 'string' || typeof raw.dataConfig !== 'string' || typeof raw.torchhydroConfig !== 'string') {
        throw new Error('Invalid saved research project; preserve its declaration.');
      }
      if (raw.source !== undefined && !jsonObject(raw.source)) throw new Error('Invalid saved source declaration.');
      this.add({id:raw.id,title:raw.title,root:raw.root,hydromodelConfig:raw.hydromodelConfig,dataConfig:raw.dataConfig,torchhydroConfig:raw.torchhydroConfig,
        ...(raw.source === undefined ? {} : {source:raw.source})}, false);
    }
  }

  /** Publish a prepared immutable project; no scientific records are duplicated. */
  add(project: ResearchRoot, persist = true): void {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(project.id) || this.projects.has(project.id)
      || ![project.root,project.dataConfig,project.hydromodelConfig,project.torchhydroConfig].every(path => path !== undefined && isAbsolute(path))) {
      throw new HarnessError('Invalid or duplicate prepared project.', 'INVALID_CONFIGURATION');
    }
    if (persist) {
      const directory = join(this.stateRoot, 'projects');
      mkdirSync(directory,{recursive:true});
      const temporary=join(directory,randomUUID()+'.tmp');
      writeFileSync(temporary,JSON.stringify(project)+'\n',{flag:'wx'});
      renameSync(temporary,join(directory,project.id+'.json'));
    }
    this.projects.set(project.id,project);
  }

  private path(owner: string): string {
    return join(this.stateRoot, 'bindings', createHash('sha256').update(owner).digest('hex') + '.json');
  }

  /** Resolve a persisted selection, refusing removed projects or changed roots. */
  current(owner: string): ResearchRoot | undefined {
    const path = this.path(owner);
    if (!existsSync(path)) return undefined;
    const stored: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (!record(stored) || stored.schema_version !== 1 || typeof stored.project_id !== 'string') {
      throw new HarnessError('Invalid research binding; preserve and inspect the binding file.', 'BINDING_INVALID');
    }
    const project = this.projects.get(stored.project_id);
    if (!project || project.root !== stored.root) {
      throw new HarnessError('The selected research was removed or its configured path changed. Explicitly bind a project again.', 'BINDING_CHANGED');
    }
    return project;
  }

  /** List configured locations or explicitly bind the owning conversation. */
  execute(args: unknown, owner: string | undefined, busy: boolean): Json {
    if (!record(args) || !['list', 'current', 'bind'].includes(String(args.operation))
      || Object.keys(args).some(key => key !== 'operation' && key !== 'project_id')
      || (args.operation === 'bind' ? typeof args.project_id !== 'string' : args.project_id !== undefined)) {
      throw new HarnessError('Use list, current, or bind with a project_id.', 'INVALID_INPUT');
    }
    if (args.operation === 'list') return { projects: [...this.projects.values()].map(p => ({ id:p.id,title:p.title,root:p.root,data_configured:!!p.dataConfig,source:p.source ?? null })), creates_study: false };
    if (!owner) throw new HarnessError('Research selection requires an owning conversation.', 'SESSION_REQUIRED');
    if (args.operation === 'current') {
      const project = this.current(owner);
      return { project_id: project?.id ?? null, root: project?.root ?? null,
        mode: project ? 'shared' : 'conversation', creates_study: false };
    }
    if (busy) throw new HarnessError('Wait for this conversation’s scientific job before switching research.', 'RESOURCE_BUSY');
    const project = typeof args.project_id === 'string' ? this.projects.get(args.project_id) : undefined;
    if (!project) throw new HarnessError('Select a project ID returned by list.', 'UNKNOWN_PROJECT');
    const directory = join(this.stateRoot, 'bindings');
    mkdirSync(directory, { recursive: true });
    const temporary = join(directory, randomUUID()+'.tmp');
    writeFileSync(temporary, JSON.stringify({ schema_version: 1, project_id: project.id, root: project.root })+'\n', { flag: 'wx' });
    renameSync(temporary, this.path(owner));
    return { project_id: project.id, root: project.root, mode: 'shared', creates_study: false };
  }
}
