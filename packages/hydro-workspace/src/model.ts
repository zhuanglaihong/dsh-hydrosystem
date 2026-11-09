/** JSON-only views shared by the read-only Host API and workspace renderer. */
export interface Project { id:string; title:string; root:string; source?:Record<string,unknown> }
/** A complete public scientific artifact reference. */
export interface Artifact { artifact_id:string; content_hash:string; path:string; format:string; kind:string; schema:string; schema_version:string }
/** One recorded scientific activity, without inferred execution or conversation ownership. */
export interface Task { id:string; operation:string; status:string; createdAt:string; inputs:Artifact[]; outputs:Artifact[]; request:Record<string,unknown>; result:unknown; failure:unknown }
/** Current bounded view of one explicitly selected research. */
export interface WorkspaceSnapshot { projects:Project[]; project:Project|null; study:Record<string,unknown>|null; tasks:Task[]; edges:{from:string;to:string;kind:'artifact'|'trial'}[]; artifacts:Artifact[]; warnings:string[]; refreshMs:number }
/** Host deployment controls; preview and count limits are enforced before returning content. */
export interface WorkspaceConfig { stateRoot:string; maxRecords:number; maxPreviewBytes:number; refreshMs:number }
