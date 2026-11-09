/** Companion workspace Host: mounts read-only research routes beside the capability plugin. */
import type { Context } from '@deepseek-ai/cordis';
import '@deepseek-ai/dsh-host-webserver';
import '@deepseek-ai/dsh-session-projection';
import z from '@deepseek-ai/schemastery';
import { isAbsolute,join } from 'node:path';
import type { IncomingMessage } from 'node:http';
import { createWorkspaceHandler } from './host.js';
import { record } from './catalog.js';
import { evidenceProjection } from './projection.js';
export const name='hydro-workspace';
export const inject=['webServer','connection','sessionProjections'];
/** Deployment-owned paths and preview limits; web requests cannot override them. */
export const Config=z.object({stateRoot:z.string(),maxRecords:z.number().min(1).max(10000).default(1000),maxPreviewBytes:z.number().min(1024).max(16777216).default(1048576),refreshMs:z.number().min(1000).max(60000).default(5000)});
/** Register an authenticated API and remove it with this plugin's lifetime. */
export async function apply(ctx:Context,config:{stateRoot?:string;maxRecords?:number;maxPreviewBytes?:number;refreshMs?:number}):Promise<void>{
 const profile:unknown=ctx.get('profileContext');const directory=record(profile)&&typeof profile.dir==='string'?profile.dir:process.env.DSH_PROFILE_DIR;
 const stateRoot=config.stateRoot??(directory?join(directory,'hydrosystem'):undefined);if(!stateRoot||!isAbsolute(stateRoot))throw new Error('Hydro workspace requires an absolute stateRoot or a profile directory.');
 const access=ctx.get('connection') as {requestRejection(req:IncomingMessage):unknown};
 await ctx.sessionProjections.register(evidenceProjection);
 ctx.effect(()=>ctx.webServer.register({kind:'prefix',path:'/hydro-workspace',handler:createWorkspaceHandler({stateRoot,maxRecords:config.maxRecords??1000,maxPreviewBytes:config.maxPreviewBytes??1048576,refreshMs:config.refreshMs??5000},req=>access.requestRejection(req)===undefined)}));
}
