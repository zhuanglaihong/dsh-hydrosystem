/** Read public 0.2 Study activity records without running science or rewriting them. */
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { createHash } from 'node:crypto';
import type { Artifact, Project, Task, WorkspaceConfig, WorkspaceSnapshot } from './model.js';

/** Structured API failure with an HTTP status and stable diagnostic code. */
export class WorkspaceError extends Error { constructor(readonly status:number,readonly code:string,message:string){super(message)} }
/** Narrow parsed JSON records at the durable file boundary. */
export function record(v:unknown):v is Record<string,unknown>{return v!==null&&typeof v==='object'&&!Array.isArray(v)}
const ID=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/;
/** Reject transport IDs that could select filesystem locations. */
export function identifier(v:string):string{if(!ID.test(v))throw new WorkspaceError(400,'INVALID_ID','Invalid research or task ID.');return v}
async function missing(path:string):Promise<boolean>{try{await stat(path);return false}catch(e){if(record(e)&&e.code==='ENOENT')return true;throw e}}
async function inside(root:string,path:string):Promise<string>{const base=await realpath(root),target=await realpath(path),rel=relative(base,target);if(rel.startsWith('..')||isAbsolute(rel))throw new WorkspaceError(403,'OUTSIDE_RESEARCH','The file is outside the selected research.');return target}
async function json(path:string,max:number):Promise<unknown>{if((await stat(path)).size>max)throw new WorkspaceError(413,'METADATA_TOO_LARGE','The metadata exceeds the configured preview size.');return JSON.parse(await readFile(path,'utf8'))}
/** Extract complete references from bounded public records; ignore scalar IDs and partial references. */
function refs(value:unknown):Artifact[]{const found=new Map<string,Artifact>();const visit=(v:unknown,depth:number)=>{if(depth>64)return;if(Array.isArray(v)){for(const item of v)visit(item,depth+1);return}if(!record(v))return;if(['artifact_id','content_hash','path','format','kind','schema','schema_version'].every(k=>typeof v[k]==='string')){const ref=v as object as Artifact;found.set(ref.artifact_id,ref);return}for(const item of Object.values(v))visit(item,depth+1)};visit(value,0);return [...found.values()]}
/** Read configured project declarations and current Study evidence, preserving invalid-record warnings. */
export async function snapshot(config:WorkspaceConfig,id?:string):Promise<WorkspaceSnapshot>{
 const directory=join(config.stateRoot,'projects'),projects:Project[]=[];
 if(!await missing(directory)){for(const file of (await readdir(directory)).filter(x=>x.endsWith('.json')).sort()){
  const raw=await json(await inside(directory,join(directory,file)),config.maxPreviewBytes);
  if(!record(raw)||typeof raw.id!=='string'||typeof raw.title!=='string'||typeof raw.root!=='string'||!isAbsolute(raw.root))throw new WorkspaceError(409,'INVALID_PROJECT','A project declaration is invalid; preserve it for diagnosis.');
  projects.push({id:identifier(raw.id),title:raw.title,root:raw.root,...(record(raw.source)?{source:raw.source}:{})});
  if(projects.length>config.maxRecords)throw new WorkspaceError(413,'TOO_MANY_PROJECTS','The project list exceeds the configured limit.');
 }}
 const out:WorkspaceSnapshot={projects,project:null,study:null,tasks:[],edges:[],artifacts:[],warnings:[],refreshMs:config.refreshMs};
 if(id===undefined)return out;identifier(id);const project=projects.find(p=>p.id===id);if(!project)throw new WorkspaceError(404,'UNKNOWN_PROJECT','Select an available research project.');out.project=project;
 if(await missing(join(project.root,'study.json')))return out;
 const study=await json(await inside(project.root,join(project.root,'study.json')),config.maxPreviewBytes);
 if(!record(study)||study.kind!=='hydrosystem.study'||study.schema_version!=='0.2'||typeof study.study_ref!=='string')throw new WorkspaceError(409,'UNSUPPORTED_STUDY','This Study record is not supported.');out.study=study;
 const activities=join(project.root,'activities');if(await missing(activities))return out;
 const files=(await readdir(activities)).filter(x=>x.endsWith('.json')).sort();
 if(files.length>config.maxRecords)throw new WorkspaceError(413,'TOO_MANY_ACTIVITIES','The activity list exceeds the configured limit.');
 for(const file of files){try{const raw=await json(await inside(project.root,join(activities,file)),Math.max(config.maxPreviewBytes,16*1024*1024));if(!record(raw)||raw.study_ref!==study.study_ref||typeof raw.activity_ref!=='string'||typeof raw.operation!=='string'||typeof raw.status!=='string'||!record(raw.request))throw new Error('Invalid activity record');
 const inputs=refs(raw.request),inputIds=new Set(inputs.map(r=>r.artifact_id));
 out.tasks.push({id:identifier(raw.activity_ref),operation:raw.operation,status:raw.status,createdAt:typeof raw.created_at==='string'?raw.created_at:'',inputs,outputs:refs(raw.result).filter(r=>!inputIds.has(r.artifact_id)),request:raw.request,result:raw.result??null,failure:raw.failure??null});
 }catch(e){out.warnings.push(`${file}: ${e instanceof Error?e.message:String(e)}`)}}
 out.tasks.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
 const producers=new Map<string,string>(),trials=new Map<string,string>(),artifacts=new Map<string,Artifact>();
 for(const t of out.tasks){const connected=new Set<string>();for(const ref of t.inputs){const parent=producers.get(ref.artifact_id);if(parent&&!connected.has(parent)){out.edges.push({from:parent,to:t.id,kind:'artifact'});connected.add(parent)}}const trial=typeof t.request.trial_ref==='string'?trials.get(t.request.trial_ref):undefined;if(trial&&!connected.has(trial))out.edges.push({from:trial,to:t.id,kind:'trial'});
 for(const ref of t.outputs){if(!producers.has(ref.artifact_id)){producers.set(ref.artifact_id,t.id);artifacts.set(ref.artifact_id,ref)}}if(record(t.result)&&typeof t.result.trial_ref==='string'&&!trials.has(t.result.trial_ref))trials.set(t.result.trial_ref,t.id);}
 out.artifacts=[...artifacts.values()];return out;
}
/** Read only a whitelisted artifact, checking canonical location, size and content hash. */
export async function artifact(config:WorkspaceConfig,projectId:string,artifactId:string):Promise<{bytes:Buffer;type:string}>{
 if(!/^sha256-[a-f0-9]{64}$/.test(artifactId))throw new WorkspaceError(400,'INVALID_ARTIFACT','Use an artifact returned by the selected research.');
 const view=await snapshot(config,projectId),ref=view.artifacts.find(r=>r.artifact_id===artifactId);if(!ref||!view.project)throw new WorkspaceError(404,'UNKNOWN_ARTIFACT','The artifact is not part of the selected research.');
 const path=await inside(view.project.root,resolve(view.project.root,ref.path));if((await stat(path)).size>config.maxPreviewBytes)throw new WorkspaceError(413,'PREVIEW_TOO_LARGE','The artifact is too large to preview.');
 const bytes=await readFile(path);if(createHash('sha256').update(bytes).digest('hex')!==ref.content_hash)throw new WorkspaceError(409,'ARTIFACT_HASH_MISMATCH','The artifact content hash does not match its reference.');
 const type=ref.format==='png'?'image/png':ref.format==='json'?'application/json; charset=utf-8':'application/octet-stream';return{bytes,type};
}
