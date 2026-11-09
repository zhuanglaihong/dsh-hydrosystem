/** Native DSH sidebar entry, real task canvas and reusable Conversation content. */
import React,{useCallback,useEffect,useRef,useState} from 'react';
import type {Context} from '@deepseek-ai/cordis';
import {Modal,IconBranchOutlineRegular,IconDatabaseOutlineRegular,IconFlatListOutlineRegular,IconDataOutlineRegular,IconListPenOutlineRegular,IconSettingsOutlineRegular,IconSparkleRegular,IconFolderOpenOutlineRegular,IconPanelLeftOutlineRegular,IconRefreshOutlineRegular} from '@deepseek-ai/dsh-client-ui-primitives';
import type {} from '@deepseek-ai/dsh-client-locale/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import type {} from '@deepseek-ai/dsh-client-ui-session/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type {SessionReference} from '@deepseek-ai/dsh-api-session-controller/client';
import type {SessionId} from '@deepseek-ai/dsh-session/types';
import type {MainPanelId} from '@deepseek-ai/dsh-client-ui-layout/client';
import type {PropsRuntime,PropsLocale,PropsRenderSlots,PropsRenderFactories} from '@deepseek-ai/dsh-client-ui-slots';
import type {WorkspaceSnapshot,Task,Artifact} from './model.js';
import {zh,en,type TextKey} from './locales.js';
import css from './workspace.css';
import type {} from './evidence.js';
const NS='hydro.workspace',PANEL='hydro-workspace' as MainPanelId;
declare module '@deepseek-ai/dsh-client-ui-slots'{interface LocaleNamespaceMap{'hydro.workspace':TextKey}interface SlotMap{'hydro.workspace.chat':{kind:'single';scope:'session-maybe'}}}
declare module '@deepseek-ai/dsh-api-session-controller/client'{interface SessionReferenceSourceMap{hydroWorkspace:unknown}}
/** Required native client extension services; no account provider or custom model loop. */
export const inject=['slots','locale','sessions'];
type T=PropsLocale<typeof NS>['t'];
interface Actions {load:(id:string|undefined,signal:AbortSignal)=>Promise<WorkspaceSnapshot>;preview:(project:string,id:string,signal:AbortSignal)=>Promise<{type:string;bytes:Blob}>;retain:(id:SessionId)=>SessionReference;create:()=>Promise<SessionId>;recoverLink:(id:SessionId)=>Promise<void>}
type Props=PropsRuntime<'main'>&PropsLocale<typeof NS>&PropsRenderSlots<'hydro.workspace.chat'>&Actions;
type Panel='files'|'artifacts'|'experiments';
type Page='overview'|'data'|'experiments'|'results'|'notes'|'environment'|'assistant'|'task';
const pages=['overview','data','experiments','results','notes','environment'] as const;
const pageIcons={overview:IconBranchOutlineRegular,data:IconDatabaseOutlineRegular,experiments:IconFlatListOutlineRegular,results:IconDataOutlineRegular,notes:IconListPenOutlineRegular,environment:IconSettingsOutlineRegular};
function isRecord(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value)}
function readable(value:unknown):string{return typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.filter(v=>typeof v==='string'||typeof v==='number').join(' · '):'—'}
function artifactName(t:T,a:Artifact){return t(a.format==='png'?'figure':a.kind.includes('parameter')?'parameters':a.kind.includes('checkpoint')?'checkpoint':a.kind.includes('metric')||a.kind.includes('evaluation')?'evaluationArtifact':a.kind.includes('resolved')?'reproduction':a.kind.includes('series')?'seriesArtifact':'researchArtifact')}
function date(value:string){return value?new Date(value).toLocaleString():''}
function operation(t:T,name:string){return t(name.includes('train')?'train':name.includes('evaluate')?'evaluate':name.includes('calibrat')?'calibrate':name.includes('simulat')?'simulate':name.includes('plot')||name.includes('metric')?'plot':'prepare')}
function status(t:T,value:string){return t(['succeeded','running','failed','cancelled','pending'].includes(value)?value as TextKey:'unknown')}
/** Render a retained DSH Session with its existing tools, composer and model controls. */
function ResearchChat({renderFactorySlot,useSession}:PropsRuntime<'hydro.workspace.chat'>&PropsRenderFactories){const open=useSession(s=>s?.openState);return renderFactorySlot('conversation.content',{variant:'embedded',hero:false,phase:open==='open'?'active':'settling'})}
/** Sidebar glyph rendered at the host-requested size. */
function WorkspaceIcon({size}:PropsRuntime<'sidebar.panellist'>){return <IconBranchOutlineRegular size={size}/>}
function Canvas({tasks,edges,selected,onSelect,t}:{tasks:Task[];edges:WorkspaceSnapshot['edges'];selected:string;onSelect:(id:string)=>void;t:T}){
 const ref=useRef<HTMLDivElement>(null),[paths,setPaths]=useState<string[]>([]);
 useEffect(()=>{const el=ref.current;if(!el)return;const draw=()=>{const base=el.getBoundingClientRect(),boxes=new Map([...el.querySelectorAll<HTMLButtonElement>('[data-task]')].map(n=>[n.dataset.task,n.getBoundingClientRect()]));setPaths(edges.flatMap(e=>{const a=boxes.get(e.from),b=boxes.get(e.to);if(!a||!b)return[];const x1=a.right-base.left,y1=a.top+a.height/2-base.top,x2=b.left-base.left,y2=b.top+b.height/2-base.top;const mid=x2>x1?(x1+x2)/2:base.width-6;return[`M${x1},${y1} H${mid} V${y2} H${x2}`]}))};const observer=new ResizeObserver(draw);observer.observe(el);draw();return()=>observer.disconnect()},[tasks,edges]);
 return <div className="hw-graph" ref={ref}><svg className="hw-edges" aria-hidden="true">{paths.map((d,i)=><path d={d} key={i}/>)}</svg>{tasks.map((task,i)=><button className="hw-node" data-task={task.id} key={task.id} aria-pressed={selected===task.id} onClick={()=>onSelect(task.id)}><span className="hw-node-top"><span>#{i+1}</span><span data-status={task.status}>{status(t,task.status)}</span></span><strong>{operation(t,task.operation)}</strong><span className="hw-sub">{date(task.createdAt)}</span><span className="hw-node-action">{t('inspect')} →</span></button>)}</div>
}
/** Research page keeps selections local and only embeds a Session explicitly selected by the user. */
function Workspace({t,load,preview,retain,create,recoverLink,useSessions,SessionProvider,renderSlot}:Props){
 const [data,setData]=useState<WorkspaceSnapshot>(),[project,setProject]=useState<string>(),[error,setError]=useState('');
 const [page,setPage]=useState<Page>('overview'),[returnPage,setReturnPage]=useState<Page>('overview'),[navOpen,setNavOpen]=useState(false),[logs,setLogs]=useState(false);
 const [allRecords,setAllRecords]=useState(false),[panel,setPanel]=useState<Panel|null>(null),[selected,setSelected]=useState(''),[revision,setRevision]=useState(0);
 const [artifact,setArtifact]=useState<Artifact>(),[previewText,setPreviewText]=useState(''),[previewImage,setPreviewImage]=useState(''),[previewError,setPreviewError]=useState('');
 const [sessionId,setSessionId]=useState<SessionId>(),[reference,setReference]=useState<{id:SessionId;ref:SessionReference}>(),[chatError,setChatError]=useState(''),[context,setContext]=useState<Task>(),[copied,setCopied]=useState(false);
 const sessions=useSessions(s=>s);
 const recoveredLinks=useRef(new Set<SessionId>());
 const linkIds=sessions.ids.join(',');
 useEffect(()=>{
  if(!project)return;
  const abort=new AbortController();
  const ids=sessions.ids.filter(id=>!recoveredLinks.current.has(id));
  void(async()=>{for(const id of ids){
   if(abort.signal.aborted)return;
   try{await recoverLink(id);recoveredLinks.current.add(id)}
   catch(error){if(!abort.signal.aborted)setChatError(error instanceof Error?error.message:String(error))}
  }})();
  return()=>abort.abort();
 },[project,linkIds,recoverLink]);
 useEffect(()=>{const abort=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let busy=false;
 const refresh=async()=>{if(busy||abort.signal.aborted)return;busy=true;try{const next=await load(project,abort.signal);if(abort.signal.aborted)return;setData(next);setError('');timer=setTimeout(()=>void refresh(),next.refreshMs)}catch(e){if(!abort.signal.aborted){setError(e instanceof Error?e.message:t('unsupported'));timer=setTimeout(()=>void refresh(),5000)}}finally{busy=false}};
 void refresh();return()=>{abort.abort();clearTimeout(timer)}},[load,project,revision,t]);
 useEffect(()=>{if(!artifact||!project)return;const abort=new AbortController();let image:string|undefined;setPreviewText('');setPreviewImage('');setPreviewError('');void preview(project,artifact.artifact_id,abort.signal).then(async result=>{if(abort.signal.aborted)return;if(result.type.startsWith('image/')){image=URL.createObjectURL(result.bytes);setPreviewImage(image)}else if(result.type.includes('json')){const text=await result.bytes.text();if(!abort.signal.aborted)setPreviewText(text)}else setPreviewText(t('binary'))}).catch(e=>{if(!abort.signal.aborted)setPreviewError(e instanceof Error?e.message:String(e))});return()=>{abort.abort();if(image)URL.revokeObjectURL(image)}},[artifact,project,preview,t]);
 useEffect(()=>{if(!sessionId)return;let active=true;const ref=retain(sessionId);setReference(undefined);setChatError('');void ref.ready.then(()=>{if(active)setReference({id:sessionId,ref})}).catch(e=>{if(active)setChatError(e instanceof Error?e.message:String(e))});return()=>{active=false;ref.release()}},[retain,sessionId]);
 const task=data?.tasks.find(x=>x.id===selected);
 const computationTasks=(data?.tasks??[]).filter(x=>/(calibrat|simulat|train$|evaluate$|plot)/.test(x.operation));
 const canvasTasks=allRecords?data?.tasks??[]:computationTasks;
 const canvasIds=new Set(canvasTasks.map(x=>x.id));
 const canvasEdges=(data?.edges??[]).filter(e=>canvasIds.has(e.from)&&canvasIds.has(e.to));
 const linked=task?sessions.ids.map(id=>sessions.byId[id]).filter(row=>row&&task.outputs.some(ref=>row.projectionValues?.['hydro.workspace.evidence']?.references.includes(ref.artifact_id))):[];
 const evidenceIds=new Set(data?.artifacts.map(a=>a.artifact_id)??[]);
 const researchSessions=sessions.ids.map(id=>sessions.byId[id]).filter(row=>row?.projectionValues?.['hydro.workspace.evidence']?.references.some(id=>evidenceIds.has(id)));
 const source=data?.project?.source;
 const onSelect=useCallback((id:string)=>{setSelected(id);setPage('task');setPanel(null);setNavOpen(false)},[]);
 const navigate=(next:Page)=>{if(next==='assistant'&&page!=='assistant')setReturnPage(page);setPage(next);setNavOpen(false);setPanel(null)};
 const selectProject=(id:string)=>{setProject(id||undefined);setData(undefined);setSelected('');setArtifact(undefined);setContext(undefined);setCopied(false);setPanel(null);setPage('overview')};
 const newChat=async()=>{try{const id=await create();setSessionId(id);navigate('assistant')}catch(e){setChatError(e instanceof Error?e.message:String(e));navigate('assistant')}};
 const showConversation=(id:SessionId)=>{setSessionId(id);navigate('assistant')};
 const discuss=()=>{setContext(task);setCopied(false);navigate('assistant')};
 const copyContext=async()=>{if(!context)return;try{await navigator.clipboard.writeText(JSON.stringify({project:project??null,study_ref:data?.study?.study_ref,activity_ref:context.id,operation:context.operation,status:context.status,outputs:context.outputs},null,2));setCopied(true)}catch(e){setChatError(e instanceof Error?e.message:String(e))}};
 const taskList=(items:Task[])=><div className="hw-experiments">{items.map(item=><button key={item.id} onClick={()=>onSelect(item.id)}><span><strong>{operation(t,item.operation)}</strong><small>{date(item.createdAt)}</small></span><span className="hw-badge" data-status={item.status}>{status(t,item.status)}</span></button>)}</div>;
 const artifactList=(items:Artifact[])=><div className="hw-artifacts">{items.map((a,i)=><button key={a.artifact_id} onClick={()=>{setArtifact(a);setPanel('artifacts')}}><span><strong>{artifactName(t,a)}</strong><small>{a.format.toUpperCase()} · {i+1}</small></span><span aria-hidden="true">↗</span></button>)}</div>;
 const previewBody=artifact&&<section className="hw-preview" key={artifact.artifact_id}><h3>{artifactName(t,artifact)}</h3>{previewError?<p role="alert">{t('previewFailed')}</p>:previewImage?<img src={previewImage} alt={artifactName(t,artifact)}/>:previewText?<p className="hw-sub">{t('verifiedPreview')}</p>:<p>{t('loading')}</p>}<details><summary>{t('reproduction')}</summary><p className="hw-sub">{artifact.path}</p>{previewError?<pre>{previewError}</pre>:<pre>{previewText||JSON.stringify(artifact,null,2)}</pre>}</details></section>;
 const sessionSelector=<label className="hw-session-select">{t('selectSession')}<select value={sessionId??''} onChange={e=>{const row=sessions.ids.map(id=>sessions.byId[id]).find(s=>s?.id===e.currentTarget.value);setSessionId(row?.id)}}><option value="">{t('noSession')}</option>{sessions.ids.map(id=><option key={id} value={id}>{sessions.byId[id]?.displayTitle??id}</option>)}</select></label>;
 const objective=isRecord(task?.result)&&isRecord(task.result.objective)?task.result.objective:undefined;
 return <div className="hydro-workspace" data-testid="hydro-workspace">
  <aside className="hw-sidebar" data-open={navOpen}>
   <div className="hw-brand"><IconBranchOutlineRegular size={20}/><strong>{t('panel')}</strong></div>
   <section className="hw-project"><label>{t('project')}<select value={project??''} onChange={e=>selectProject(e.currentTarget.value)}><option value="">{t('choose')}</option>{data?.projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label></section>
   <nav className="hw-navigation" aria-label={t('researchNavigation')}>{pages.map(p=>{const Icon=pageIcons[p];return <button key={p} aria-current={page===p?'page':undefined} onClick={()=>navigate(p)}><Icon size={17}/>{t(p)}</button>})}</nav>
   <section className="hw-sidebar-conversation"><span className="hw-sub">{t('researchConversations')}</span><button aria-current={page==='assistant'?'page':undefined} onClick={()=>navigate('assistant')}><IconSparkleRegular size={17}/>{t('assistant')}</button>{researchSessions.slice(0,3).map(row=>row&&<button className="hw-conversation-link" key={row.id} onClick={()=>showConversation(row.id)}>{row.displayTitle}</button>)}</section>
   <div className="hw-sidebar-bottom"><span>{t('managedEnvironment')}</span><span className="hw-sub">{t('environmentCheck')}</span></div>
  </aside>
  <div className="hw-center">
   <header className="hw-header"><div className="hw-header-label"><button className="hw-mobile-nav" aria-label={t('toggleNavigation')} aria-expanded={navOpen} onClick={()=>setNavOpen(v=>!v)}><IconPanelLeftOutlineRegular size={17}/></button><span>{data?.project?.title??t('title')}</span></div><nav aria-label={t('utilities')}>{(['files','artifacts','experiments'] as const).map(p=><button key={p} aria-pressed={panel===p} onClick={()=>setPanel(p)}>{p==='files'?<IconFolderOpenOutlineRegular size={16}/>:p==='artifacts'?<IconDataOutlineRegular size={16}/>:<IconFlatListOutlineRegular size={16}/>}<span>{t(p)}</span></button>)}<button aria-pressed={logs} onClick={()=>setLogs(v=>!v)}><span aria-hidden="true">›_</span>{t('terminal')}</button><button aria-label={t('refresh')} onClick={()=>setRevision(x=>x+1)}><IconRefreshOutlineRegular size={16}/></button></nav></header>
   {error&&<div role="alert" className="hw-error">{t('unsupported')}<button onClick={()=>setRevision(x=>x+1)}>{t('retry')}</button><details><summary>{t('diagnostics')}</summary><p>{error}</p></details></div>}
   <main className="hw-page" hidden={page==='assistant'}>
    {!data&&!error?<p>{t('loading')}</p>:!project?<div className="hw-empty"><h1>{t(data?.projects.length?'choose':'empty')}</h1><p>{t(data?.projects.length?'pickHint':'emptyHint')}</p><button className="hw-primary" onClick={()=>void newChat()}>{t('newChat')}</button><p className="hw-sub">{t('noAutomatic')}</p></div>:<>
     <div className="hw-heading"><div><span className="hw-sub">{t('panel')}</span><h1>{page==='overview'?(typeof data?.study?.goal==='string'?data.study.goal:data?.project?.title):page==='task'&&task?operation(t,task.operation):t(page as TextKey)}</h1><p className="hw-sub">{t(page==='overview'?'overviewHint':page==='task'?'taskDetailHint':page==='data'?'dataHint':page==='results'?'resultsHint':page==='notes'?'notesHint':page==='environment'?'envHint':'experimentHint')}</p></div><button className="hw-primary" onClick={()=>navigate('assistant')}><IconSparkleRegular size={16}/>{t('discuss')}</button></div>
     {!!data?.warnings.length&&<details className="hw-error"><summary>{t('warning')}</summary>{data.warnings.map(w=><p key={w}>{w}</p>)}</details>}
     {page==='overview'?<><div className="hw-section-heading"><h2>{t('tasks')}</h2><button className="hw-text-button" onClick={()=>setAllRecords(x=>!x)}>{t(allRecords?'computationOnly':'allRecords')}</button></div>{canvasTasks.length?<Canvas tasks={canvasTasks} edges={canvasEdges} selected={selected} onSelect={onSelect} t={t}/>:<p className="hw-empty">{data?.study?t('noTasks'):t('noStudy')}</p>}<div className="hw-overview-bottom"><section><div className="hw-section-heading"><h2>{t('recentResults')}</h2><button className="hw-text-button" onClick={()=>navigate('results')}>{t('viewAll')}</button></div>{artifactList((data?.artifacts??[]).slice(-3).reverse())}</section><section><h2>{t('researchActivity')}</h2>{taskList(computationTasks.slice(-2).reverse())}</section></div><details className="hw-space"><summary>{t('canvasAbout')}</summary><p>{t('taskHint')}</p></details></>
     :page==='data'?<><h2>{t('source')}</h2><dl className="hw-facts"><div><dt>{t('dataset')}</dt><dd>{readable(source?.dataset_id)}</dd></div><div><dt>{t('basins')}</dt><dd>{readable(source?.basin_ids)}</dd></div><div><dt>{t('period')}</dt><dd>{readable(source?.period)}</dd></div><div><dt>{t('calibrationPeriod')}</dt><dd>{readable(source?.calibration_period)}</dd></div><div><dt>{t('validationPeriod')}</dt><dd>{readable(source?.validation_period)}</dd></div></dl><details><summary>{t('reproduction')}</summary><pre>{JSON.stringify(source??{},null,2)}</pre></details></>
     :page==='experiments'?taskList(data?.tasks??[])
     :page==='results'?<>{artifactList(data?.artifacts??[])}{!data?.artifacts.length&&<p className="hw-empty">{t('noResult')}</p>}</>
     :page==='notes'?<>{researchSessions.map(row=>row&&<button className="hw-note" key={row.id} onClick={()=>showConversation(row.id)}><IconListPenOutlineRegular size={19}/><span><strong>{row.displayTitle}</strong><small>{t('openResearchConversation')}</small></span><span aria-hidden="true">↗</span></button>)}{!researchSessions.length&&<p className="hw-empty">{t('noResearchNotes')}</p>}</>
     :page==='environment'?<><div className="hw-environment"><IconSettingsOutlineRegular size={24}/><div><h2>{t('managedEnvironment')}</h2><p>{t('environmentCheck')}</p></div></div><button onClick={()=>navigate('assistant')}>{t('checkInConversation')}</button><details className="hw-space"><summary>{t('deploymentDetails')}</summary><p className="hw-sub">{data?.project?.root}</p></details></>
     :page==='task'&&task?<section key={task.id} className="hw-task-detail"><button className="hw-text-button" onClick={()=>navigate('experiments')}>← {t('backToExperiments')}</button><div className="hw-task-summary"><span className="hw-badge" data-status={task.status}>{status(t,task.status)}</span><span className="hw-sub">{date(task.createdAt)}</span></div>{task.status==='failed'&&<p role="alert">{t('failedHint')}</p>}{objective&&typeof objective.value==='number'&&Number.isFinite(objective.value)&&<div className="hw-metric"><span className="hw-sub">{t('calibrationObjective')} · {readable(objective.name)}</span><strong>{objective.value.toFixed(3)}</strong></div>}<div className="hw-section-heading hw-space"><h2>{t('linked')}</h2></div>{linked.length?linked.map(row=>row&&<button className="hw-note" key={row.id} onClick={()=>showConversation(row.id)}><IconSparkleRegular size={17}/><span>{row.displayTitle}</span><span>{t('inspectChat')} ↗</span></button>):<p className="hw-sub">{t('noLinked')}</p>}<div className="hw-task-actions"><button className="hw-primary" onClick={discuss}>{t('discussTask')}</button><button onClick={()=>setLogs(true)}>{t('viewLogs')}</button></div><h2>{t('taskArtifacts')}</h2>{artifactList(task.outputs)}<details className="hw-space"><summary>{t('reproduction')}</summary><pre>{JSON.stringify(task,null,2)}</pre></details></section>:null}
    </>}
   </main>
   <section className="hw-chat-page" hidden={page!=='assistant'} aria-label={t('assistant')}>
    <header className="hw-chat-heading"><div><h1>{t('assistant')}</h1><span className="hw-sub">{t('nativeChat')}</span></div><button className="hw-text-button" onClick={()=>navigate(returnPage)}>{t('backToResearch')} ↗</button></header>
    <div className="hw-chat-controls">{sessionSelector}<button onClick={()=>void newChat()}>{t('newChat')}</button></div>
    <details className="hw-chat-binding"><summary>{t('bindingNote')}</summary><p>{t('sessionNote')}</p></details>
    {context&&<div className="hw-context"><span>{t('selectedExperiment')} · {operation(t,context.operation)}</span><button onClick={()=>void copyContext()}>{t(copied?'contextCopied':'copyContext')}</button><button onClick={()=>{setContext(undefined);setCopied(false)}}>{t('removeContext')}</button><span className="hw-sub">{t('contextHint')}</span></div>}
    {chatError&&<div role="alert" className="hw-error">{t('conversationFailed')}<details><summary>{t('diagnostics')}</summary><p>{chatError}</p></details></div>}
    <div className="hw-chat-content">{reference&&reference.id===sessionId?<SessionProvider key={sessionId} session={reference.ref}>{renderSlot('hydro.workspace.chat',{})}</SessionProvider>:<div className="hw-chat-empty"><IconSparkleRegular size={30}/><h2>{t('startDiscussing')}</h2><p>{t('chatHint')}</p><button className="hw-primary" onClick={()=>void newChat()}>{t('newChat')}</button></div>}</div>
   </section>
   {logs&&<section className="hw-terminal" aria-label={t('logs')}><header><h2>{t('logs')}</h2><button onClick={()=>setLogs(false)}>{t('close')}</button></header><p className="hw-sub">{t('logsHint')}</p>{task?<><p>{operation(t,task.operation)} · {status(t,task.status)}</p><details><summary>{t('reproduction')}</summary><pre>{JSON.stringify({operation:task.operation,status:task.status,request:task.request,failure:task.failure},null,2)}</pre></details></>:<p>{t('selectTaskForLogs')}</p>}</section>}
   <footer><span>{t('recordedResearch')}</span><span>{t('nativeChat')}</span></footer>
  </div>
  <Modal open={navOpen} onClose={()=>setNavOpen(false)} title={t('researchNavigation')} closeLabel={t('close')} className="hw-nav-modal"><nav className="hw-navigation" aria-label={t('researchNavigation')}>{[...pages,'assistant' as const].map(p=><button key={p} onClick={()=>navigate(p)}>{t(p)}</button>)}</nav></Modal>
  <Modal open={panel!==null} onClose={()=>setPanel(null)} title={t(panel??'files')} closeLabel={t('close')} className="hw-modal" contentClassName="hw-modal-content" backdropBlur={false}>
   {panel==='files'?<><p className="hw-sub">{t('fileHint')}</p><button className="hw-note" onClick={()=>navigate('data')}><IconDatabaseOutlineRegular size={18}/>{t('source')}</button><button className="hw-note" onClick={()=>navigate('experiments')}><IconFlatListOutlineRegular size={18}/>{t('experiments')}</button>{artifactList(data?.artifacts??[])}</>:panel==='artifacts'?<><p className="hw-sub">{t('previewHint')}</p>{previewBody}{artifactList(data?.artifacts??[])}</>:panel==='experiments'?taskList(data?.tasks??[]):null}
  </Modal>
 </div>;
}
/** Register the workspace entry and its private embedded Conversation seat reversibly. */
export function apply(ctx:Context):void{
 ctx.effect(()=>ctx.locale.register(NS,{zh,en}));
 ctx.effect(()=>{const style=document.createElement('style');style.textContent=css;style.dataset.plugin='hydro-workspace';document.head.append(style);return()=>style.remove()});
 const url=(path:string)=>new URL('hydro-workspace/'+path,new URL('./',document.baseURI)).href;
 const actions:Actions={async load(id,signal){const response=await fetch(url('snapshot'+(id?'?project='+encodeURIComponent(id):'')),{signal,credentials:'same-origin'});const value=await response.json();if(!response.ok)throw new Error(value.error?.message??'READ_FAILED');return value as WorkspaceSnapshot},async preview(project,id,signal){const response=await fetch(url('artifact?project='+encodeURIComponent(project)+'&id='+encodeURIComponent(id)),{signal,credentials:'same-origin'});if(!response.ok){const value=await response.json();throw new Error(value.error?.message??'READ_FAILED')}return{type:response.headers.get('content-type')??'',bytes:await response.blob()}},retain:id=>ctx.sessions.retain(ctx.sessions.subagentAddress(id)??id,{source:'hydroWorkspace'}),create:()=>ctx.sessions.create({agentPreset:'hydrology-expert'}),recoverLink:id=>ctx.sessions.refreshProjections(id)};
 ctx.slots.inject('main',function*(){yield ctx.slots.register({name:'main',key:PANEL,locale:NS,inject:()=>actions,children:{'hydro.workspace.chat':{kind:'single',scope:'session-maybe'}}},Workspace);yield ctx.slots.register({name:'hydro.workspace.chat'},ResearchChat)});
 ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:PANEL,order:15,locale:NS,label:()=>ctx.locale.bind(NS)('panel')},WorkspaceIcon));
}
