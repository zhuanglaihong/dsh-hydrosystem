import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createWorkspaceHandler } from '../packages/hydro-workspace/lib/host.js';

test('the workspace publishes the browser entry required by the DSH client loader',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../packages/hydro-workspace/package.json',import.meta.url),'utf8'));
 assert.equal(manifest.exports['./client'],'./lib/client.js');
 const client=await readFile(new URL('../packages/hydro-workspace/lib/client.js',import.meta.url),'utf8');
 assert.match(client,/__ModuleLoader__\.load/);
});

test('workspace HTTP reads real research records, derives evidence dependencies and refuses unrelated paths', async () => {
 const root=await mkdtemp(join(tmpdir(),'hydro-workspace-'));
 const study=join(root,'study'),state=join(root,'state');
 await mkdir(join(state,'projects'),{recursive:true}); await mkdir(join(study,'activities'),{recursive:true});await mkdir(join(study,'objects'));
 const bytes=Buffer.from('{"schema":"torchhydro.checkpoint/v1","kind":"checkpoint","value":42}\n');
 const hash=createHash('sha256').update(bytes).digest('hex');
 const ref={artifact_id:'sha256-'+hash,content_hash:hash,path:'objects/'+hash+'.json',format:'json',kind:'checkpoint',schema:'torchhydro.checkpoint/v1',schema_version:'0.2'};
 await writeFile(join(state,'projects','basin.json'),JSON.stringify({id:'basin',title:'Basin research',root:study}));
 await writeFile(join(study,'study.json'),JSON.stringify({kind:'hydrosystem.study',schema_version:'0.2',study_ref:'study-real',goal:'A fixed-checkpoint evaluation'}));
 await writeFile(join(study,ref.path),bytes);
 await writeFile(join(study,'activities','a.json'),JSON.stringify({activity_ref:'train-1',study_ref:'study-real',created_at:'2026-11-08T08:00:00Z',operation:'torchhydro.train',status:'succeeded',request:{},result:{checkpoint_ref:ref}}));
 await writeFile(join(study,'activities','b.json'),JSON.stringify({activity_ref:'eval-2',study_ref:'study-real',created_at:'2026-11-08T09:00:00Z',operation:'torchhydro.evaluate',status:'running',request:{checkpoint_ref:ref},result:null}));
 const before=await readFile(join(study,'study.json'));
 const handler=createWorkspaceHandler({stateRoot:state,maxRecords:100,maxPreviewBytes:1024,refreshMs:5000},req=>req.headers['x-test-access']==='yes');
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port+'/hydro-workspace';
 const get=path=>fetch(base+path,{headers:{'x-test-access':'yes'}});
 try{
  assert.equal((await fetch(base+'/snapshot')).status,403);
  const catalog=await (await get('/snapshot')).json();
  assert.equal(catalog.projects[0].id,'basin');
  const snap=await (await get('/snapshot?project=basin')).json();
  assert.equal(snap.study.study_ref,'study-real');assert.equal(snap.tasks.length,2);
  assert.deepEqual(snap.edges,[{from:'train-1',to:'eval-2',kind:'artifact'}]);
  assert.equal(snap.tasks.find(t=>t.id==='eval-2').status,'running');
  assert.equal(snap.artifacts.length,1);
  const preview=await get('/artifact?project=basin&id='+ref.artifact_id);assert.equal(preview.status,200);assert.equal(await preview.text(),bytes.toString());
  assert.equal((await get('/snapshot?project=..%2Foutside')).status,400);
  assert.equal((await get('/snapshot?project=missing')).status,404);
  assert.equal((await get('/artifact?project=basin&id=..%2Fstudy.json')).status,400);
  await writeFile(join(study,ref.path),'damaged');assert.equal((await get('/artifact?project=basin&id='+ref.artifact_id)).status,409);
  await writeFile(join(study,'activities','c.json'),'{bad');
  const warned=await (await get('/snapshot?project=basin')).json();assert.equal(warned.tasks.length,2);assert.equal(warned.warnings.length,1);
  await writeFile(join(study,'activities','c.json'),JSON.stringify({activity_ref:'plot-3',study_ref:'study-real',created_at:'2026-11-08T10:00:00Z',operation:'hydroutils_plot_timeseries',status:'failed',request:{checkpoint_ref:ref},failure:{code:'INVALID_INPUT',message:'Unknown field'}}));
  const updated=await (await get('/snapshot?project=basin')).json();assert.equal(updated.tasks.length,3);assert.equal(updated.tasks.find(t=>t.id==='plot-3').status,'failed');
  assert.deepEqual(await readFile(join(study,'study.json')),before);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(root,{recursive:true});}
});
