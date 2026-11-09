/** Authenticated read-only HTTP routes; no shell, model, mutation or science execution. */
import type { IncomingMessage,ServerResponse } from 'node:http';
import type { WorkspaceConfig } from './model.js';
import { snapshot,artifact,WorkspaceError } from './catalog.js';
/** Create the deployment-owned route handler with the Host's request-admission policy. */
export function createWorkspaceHandler(config:WorkspaceConfig,allowed:(req:IncomingMessage)=>boolean){
 return async(req:IncomingMessage,res:ServerResponse):Promise<void>=>{
  const reply=(status:number,value:unknown)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(value))};
  if(!allowed(req)){reply(403,{error:{code:'FORBIDDEN',message:'Access denied.'}});return}if(req.method!=='GET'){reply(405,{error:{code:'READ_ONLY',message:'This workspace API is read-only.'}});return}
  try{const url=new URL(req.url??'/','http://dsh.internal'),id=url.searchParams.get('project')??undefined;
   if(url.pathname==='/hydro-workspace/snapshot'){reply(200,await snapshot(config,id));return}
   if(url.pathname==='/hydro-workspace/artifact'&&id){const result=await artifact(config,id,url.searchParams.get('id')??'');res.writeHead(200,{'content-type':result.type,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"});res.end(result.bytes);return}
   throw new WorkspaceError(404,'NOT_FOUND','Unknown workspace request.');
  }catch(e){reply(e instanceof WorkspaceError?e.status:500,{error:{code:e instanceof WorkspaceError?e.code:'READ_FAILED',message:e instanceof Error?e.message:'Research metadata could not be read.'}})}
 };
}
