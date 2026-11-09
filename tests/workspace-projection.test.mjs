import test from 'node:test';
import assert from 'node:assert/strict';
import {Context} from '@deepseek-ai/cordis';
import SessionStore from '@deepseek-ai/dsh-session';
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection';
import {evidenceProjection} from '../packages/hydro-workspace/lib/projection.js';

test('DSH restores scientific conversation links from results without replaying tools',async()=>{
 const ctx=new Context(),store=ctx.plugin(SessionStore),registry=ctx.plugin(SessionProjectionRegistry);
 let handle;
 try{
  await new Promise(resolve=>ctx.inject(['sessions','sessionProjections'],()=>{resolve()}));
  const session=ctx.sessions.create('research-parent');
  const id='sha256-'+'a'.repeat(64);
  const data={turn:1,step:0,message:{id:'result-1',role:'tool',source:{kind:'tool',callId:'call-1'},toolCallId:'call-1',content:[{type:'text',text:JSON.stringify({checkpoint_ref:{artifact_id:id,content_hash:'a'.repeat(64),schema:'torchhydro.checkpoint/v1',format:'json',path:'objects/a.json',kind:'checkpoint',schema_version:'0.2'}})+'\n[status: completed]'}],isError:false}};
  session.append('tool/result',data,{surfaceOp:'append'});
  handle=await ctx.sessionProjections.register(evidenceProjection);
  assert.deepEqual(handle.stateOf(session).references,[id]);
  const previous=handle.stateOf(session);session.append('tool/result',{...data,message:{...data.message,id:'result-2',toolCallId:'call-2',content:[{type:'text',text:'{}'}]}},{surfaceOp:'append'});
  assert.equal(handle.stateOf(session),previous);
  const checkpoint=ctx.sessionProjections.checkpoint(session);
  assert.ok(checkpoint);
  await handle.dispose();handle=await ctx.sessionProjections.register(evidenceProjection);
  assert.deepEqual(handle.stateOf(session).references,[id]);
  assert.deepEqual(ctx.sessionProjections.snapshot(session).values['hydro.workspace.evidence'],{references:[id]});
 }finally{await handle?.dispose();await registry.dispose();await store.dispose()}
});
