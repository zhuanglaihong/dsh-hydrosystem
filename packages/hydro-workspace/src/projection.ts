/** Session-owned recovery of conversation-to-scientific-evidence links. */
import {z} from 'zod';
import type {ProjectionDefinition} from '@deepseek-ai/dsh-session-projection';
import type {ResearchEvidence} from './evidence.js';
const isRecord=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const schema=z.object({references:z.array(z.string())});
type EvidenceDefinition=ProjectionDefinition<'hydro.workspace.evidence',ResearchEvidence>&{wire:NonNullable<ProjectionDefinition<'hydro.workspace.evidence',ResearchEvidence>['wire']>};
/** Persist reference identities, never transcript text, thoughts, runtime handles or scientific outputs. */
export const evidenceProjection:EvidenceDefinition={
 key:'hydro.workspace.evidence',stateVersion:1,stateSchema:schema,
 init:()=>({references:[]}),
 apply(state,event){
  if(event.type!=='tool/result'||event.data.message.isError)return state;
  const references=new Set(state.references);
  const visit=(value:unknown,depth:number)=>{if(depth>64)return;if(Array.isArray(value)){for(const child of value)visit(child,depth+1);return}if(!isRecord(value))return;
   if(typeof value.artifact_id==='string'&&/^sha256-[a-f0-9]{64}$/.test(value.artifact_id)&&typeof value.schema==='string'&&/^(hydrosystem|hydromodel|torchhydro)\./.test(value.schema))references.add(value.artifact_id);
   for(const child of Object.values(value))visit(child,depth+1);
  };
  for(const block of event.data.message.content){if(block.type!=='text')continue;let value:unknown;
   try{value=JSON.parse(block.text.replace(/\n\[status: [^\]]+\]\s*$/,''))}catch(_error){continue /* Other tools may return ordinary prose instead of JSON. */}
   visit(value,0);
  }
  return references.size===state.references.length?state:{references:[...references]};
 },
 wire:{viewSchema:schema,view:state=>state},
};
