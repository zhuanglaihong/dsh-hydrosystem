/** Probe all four domains using an explicit scientific interpreter and source. */
import { Context } from '@deepseek-ai/cordis';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import * as plugin from '../packages/hydrosystem-plugin/lib/index.js';
import { exerciseScience } from '../tests/fixtures/science-workflow.mjs';

const spec=JSON.parse(await readFile(process.argv[2],'utf8'));
const stateRoot=resolve(process.argv[3]);
await mkdir(stateRoot,{recursive:true});
const tools=new Map(),jobs=new Map(),ctx=new Context(),calls=[];
ctx.provide('tools',{guard(){return()=>{};},register(tool){tools.set(tool.name,tool);return()=>tools.delete(tool.name);}});
ctx.provide('jobs',{start(spec){const id='hydrosystem-'+jobs.size;jobs.set(id,spec.run({updateProgress(){}}));return id;}});
const fork=ctx.plugin(plugin,{mode:'existing',python:process.env.HYDROSYSTEM_TEST_PYTHON,projectRoot:process.env.HYDROSYSTEM_TEST_SOURCE,stateRoot});
let result;
try {
  for (;;) {
    const status=await tools.get('hydrosystem_environment')?.execute({});
    if(status?.status==='failed')throw new Error(status.detail);
    if(status?.status==='ready')break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  const call=async(name,args)=>{
    console.log(name);
    const value=await tools.get(name).execute(args,{agent:{id:'science-acceptance'},signal:new AbortController().signal});
    const outcome=value?.kind==='background'?await jobs.get(value.job_id).done:null;
    calls.push({name,args,...(outcome?{outcome}:{value})});
    if(outcome&&outcome.status!=='completed')throw new Error(JSON.stringify(outcome));
    return outcome?JSON.parse(outcome.result):value;
  };
  result={outcome:'passed',result:await exerciseScience(call,spec)};
} catch(error){result={outcome:'failed',message:String(error),stack:error.stack};process.exitCode=1;}
finally {await fork.dispose();await writeFile(join(stateRoot,'science-result.json'),JSON.stringify({...result,calls},null,2)+'\n');}
console.log(JSON.stringify({outcome:result.outcome,message:result.message}));
