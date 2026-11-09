import {validateResourceChanges} from './references.js';
import {validate} from './validate.js';
import {emptyData} from './seed.js';
export const collections=['people','objectives','projects','deliverables','milestones','tasks','integrations'];
const fail=(code,message)=>{throw Object.assign(new Error(message),{code})};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function identity(request,env){
 const bearer=request.headers.get('authorization');
 if(env.CAP_AGENT_TOKEN && bearer===`Bearer ${env.CAP_AGENT_TOKEN}`)return {id:'project-manager',role:'agent'};
 const id=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email')?.toLowerCase();
 if(!id||!email)fail(401,'Connexion requise.');
 if(email===env.CAP_OWNER_EMAIL?.toLowerCase())return {id:'camille',role:'owner',siteId:id};
 if(env.CAP_ALEX_EMAIL&&email===env.CAP_ALEX_EMAIL.toLowerCase())return {id:'alex',role:'member',siteId:id};
 fail(403,'Compte non autorisé.');
}
export async function read(db){
 await db.prepare('INSERT OR IGNORE INTO cockpit(id,revision,payload,operation) VALUES(1,0,?,?)').bind(JSON.stringify(emptyData()),'init').run();
 const row=await db.prepare('SELECT * FROM cockpit WHERE id=1').first();return {data:JSON.parse(row.payload),revision:row.revision};
}
export function view(data,actor){
 const d=structuredClone(data);d.preferences.currentUser=actor.role==='member'?'alex':'camille';
 if(actor.role==='member'){
  d.projects=d.projects.filter(p=>p.lifecycle==='active'&&(p.members||[]).includes('alex'));
  const ids=new Set(d.projects.map(p=>p.id));
  for(const k of ['tasks','deliverables','milestones'])d[k]=d[k].filter(x=>ids.has(x.projectId));
  const goals=new Set(d.projects.map(p=>p.goalId));d.objectives=d.objectives.filter(x=>goals.has(x.id));
  for(const k of ['projects','tasks','deliverables','milestones','objectives'])d[k]=d[k].map(({evidence,privateSources,externalRefs,driveId,driveUrl,proposals,missingInformation,steering,...x})=>({...x,externalRefs:(externalRefs||[]).filter(r=>r&&typeof r==='object'&&r.visibility==='project'),...(steering?.visibility==='project'?{steering}:{})}));
 }
 return d;
}
export function apply(data,ops,actor){
 if(!Array.isArray(ops)||ops.length>1000)fail(400,'Liste de modifications invalide.');
 const d=structuredClone(data);
 for(const op of ops){
  if(!collections.includes(op.collection)||typeof op.id!=='string'||op.id.length>180)fail(400,'Modification invalide.');
  const rows=d[op.collection],idx=rows.findIndex(x=>x.id===op.id),old=rows[idx];
  if(actor.role==='member'){
   if(!['tasks','deliverables'].includes(op.collection)||(!old&&op.collection!=='deliverables'))fail(403,'Modification réservée à Camille.');
   const project=d.projects.find(p=>p.id===(old?.projectId||op.value?.projectId));
   if(project?.lifecycle!=='active'||!project.members?.includes('alex'))fail(403,'Projet non partagé.');
   if(op.remove||op.value?.projectId!==(old?.projectId||project?.id))fail(403,'Déplacement ou suppression réservé à Camille.');if(op.value?.deliverableId&&!d.deliverables.some(x=>x.id===op.value.deliverableId&&x.projectId===(old?.projectId||project?.id)))fail(403,'Chantier non accessible.');if(op.value?.dependencyIds?.some(id=>!d.tasks.some(t=>t.id===id&&d.projects.some(p=>p.id===t.projectId&&p.lifecycle==='active'&&p.members?.includes('alex')))))fail(403,'Dépendance non accessible.');
   if(!old){const allowed=['id','title','description','projectId','ownerId','dueDate','status','blockingReason','source','externalRefs'];if(Object.keys(op.value||{}).some(k=>!allowed.includes(k)))fail(403,'Champ protégé.');}
   for(const key of Object.keys(op.value||{}))if(['evidence','privateSources','externalRefs'].includes(key))continue;else if(!['title','description','ownerId','dueDate','status','priority','blocker','blockedById','deliverableId','dependencyIds','needsApproval','reviewerId','updatedAt','completedAt','source'].includes(key)&&old&&!equal(op.value[key],old[key]))fail(403,'Champ protégé.');
  }
  if(actor.role==='agent'){
   if(op.remove||['people','objectives','integrations'].includes(op.collection))fail(403,'Opération non autorisée pour cet agent.');
   if(!Array.isArray(op.value?.evidence)||!op.value.evidence.length||op.value.evidence.some(e=>!e||typeof e.sourceId!=='string'||!e.sourceId||typeof e.sourceType!=='string'||!Number.isFinite(Date.parse(e.observedAt))||!['fact','proposal','inference'].includes(e.kind)))fail(400,'Une source identifiée et datée est obligatoire.');
   if(op.collection==='projects'){
    if(!old&&op.value.lifecycle!=='draft')fail(403,'Le nouveau projet doit être un brouillon.');
    if(old && (op.value.lifecycle!==old.lifecycle||!equal(op.value.members,old.members)))fail(403,'Validation et partage réservés à Camille.');
   }else if(!d.projects.some(p=>p.id===op.value.projectId))fail(400,'Projet absent.');
   if(old?.manualFields?.some(k=>!equal(old[k],op.value[k])))fail(409,'Une correction humaine nécessite un arbitrage.');
   if(op.collection==='tasks'&&op.value.status==='done')fail(403,'Utiliser la clôture vérifiée de l’exécution.');
  }
  if(op.remove){if(idx>=0)rows.splice(idx,1);continue;}
  if(!op.value||op.value.id!==op.id)fail(400,'Identifiant incohérent.');
  let value=structuredClone(op.value);if(actor.role==='agent'&&old){value.manualFields=old.manualFields;if(old.needsApproval&&value.needsApproval!==true)fail(403,'Validation humaine requise.');}
  if(actor.role==='member')value={...old,...value,evidence:old?.evidence,externalRefs:old?.externalRefs||[]};
  if(op.collection==='projects'){
   value.lifecycle=value.lifecycle||old?.lifecycle||'draft';
   if(!['draft','active','archived'].includes(value.lifecycle))fail(400,'État du projet invalide.');
   if(value.lifecycle==='active'&&old?.lifecycle!=='active')fail(403,'Utiliser la validation du projet.');
   value.members=value.members||old?.members||[];
   if(!Array.isArray(value.members)||value.members.some(x=>x!=='alex'))fail(400,'Membres invalides.');
  }
  if(actor.role!=='agent')value.manualFields=[...new Set([...(old?.manualFields||[]),...Object.keys(value).filter(k=>!['updatedAt','manualFields','source'].includes(k)&&!equal(old?.[k],value[k]))])];
  try{validateResourceChanges(old,value,actor,d.people);}catch(e){fail(400,e.message);}
  if(value.steering?.nextTaskId&&!d.tasks.some(t=>t.id===value.steering.nextTaskId&&t.projectId===(op.collection==='projects'?value.id:value.projectId)))fail(400,'La prochaine action doit appartenir au même projet.');
  value.revision=(old?.revision||0)+1;
  if(idx>=0)rows[idx]=value;else rows.push(value);
 }
 const check=validate(d);if(!check.ok)fail(400,check.errors[0]);
 for(const p of d.projects)if(p.goalId&&!d.objectives.some(x=>x.id===p.goalId))fail(400,'Objectif absent.');
 return d;
}
export async function write(db,data,revision,actor,key,detail){
 if(typeof key!=='string'||key.length<8||key.length>160)fail(400,'Clé d’idempotence requise.');
 const prior=await db.prepare('SELECT actor FROM audit WHERE id=?').bind(key).first();
 if(prior){if(prior.actor!==actor.id)fail(409,'Clé déjà utilisée.');return {replayed:true};}
 const results=await db.batch([
 db.prepare('UPDATE cockpit SET payload=?,revision=revision+1,operation=? WHERE id=1 AND revision=?').bind(JSON.stringify(data),key,revision),
 db.prepare('INSERT INTO audit(id,at,actor,detail) SELECT ?,?,?,? FROM cockpit WHERE id=1 AND operation=?').bind(key,new Date().toISOString(),actor.id,JSON.stringify(detail),key)
 ]);
 if(!results[0].meta.changes)fail(409,'Les données ont changé. Rechargez avant de réessayer.');
 return {revision:revision+1};
}
export async function handle(request,env){
 try{
 const actor=identity(request,env),db=env.DB;if(!db)fail(503,'Base indisponible.');
 const url=new URL(request.url),path=url.pathname.replace('/api/v1/','');
 if(request.method!=='GET'&&actor.role!=='agent'&&request.headers.get('origin')!==url.origin)fail(403,'Origine invalide.');
 const snapshot=await read(db);
 if(request.method==='GET'){
  if(path==='state')return reply({...snapshot,data:view(snapshot.data,actor),actor});
  if(path==='tasks/assigned'&&actor.role==='agent')return reply({revision:snapshot.revision,tasks:snapshot.data.tasks.filter(t=>t.ownerId===actor.id&&t.status!=='done'&&snapshot.data.projects.some(p=>p.id===t.projectId&&p.lifecycle==='active'))});
  if(path==='backup'&&['owner','agent'].includes(actor.role))return reply({...snapshot,exportedAt:new Date().toISOString(),audit:(await db.prepare('SELECT * FROM audit ORDER BY at').all()).results,jobs:(await db.prepare('SELECT * FROM jobs').all()).results});
  fail(404,'Route inconnue.');
 }
 if(Number(request.headers.get('content-length')||0)>5*1024*1024)fail(413,'Fichier trop volumineux.');
 const raw=await request.text();if(raw.length>5*1024*1024)fail(413,'Fichier trop volumineux.');
 const body=JSON.parse(raw),key=request.headers.get('idempotency-key');
 if(path==='changes'&&request.method==='POST'){
  const previous=await db.prepare('SELECT actor FROM audit WHERE id=?').bind(key||'').first();
  if(previous){if(previous.actor!==actor.id)fail(409,'Clé déjà utilisée.');return reply({replayed:true,...snapshot,data:view(snapshot.data,actor)});}
  if(body.revision!==snapshot.revision)fail(409,'Conflit : une autre modification est intervenue.');
  const data=apply(snapshot.data,body.ops,actor);
  const result=await write(db,data,body.revision,actor,key,{kind:'changes',entities:body.ops.map(x=>[x.collection,x.id])});
  return reply({...result,data:view(data,actor)});
 }
 if(path==='entities/details'&&request.method==='POST'){
  if(actor.role!=='owner')fail(403,'Modification des ressources et du pilotage réservée à Camille.');
  const prior=await db.prepare('SELECT actor FROM audit WHERE id=?').bind(key||'').first();
  if(prior){if(prior.actor!==actor.id)fail(409,'Clé déjà utilisée.');return reply({replayed:true,...snapshot,data:view(snapshot.data,actor)});}
  if(!['projects','deliverables','tasks'].includes(body.collection)||!body.patch||typeof body.patch!=='object'||Array.isArray(body.patch)||Object.keys(body.patch).some(k=>!['externalRefs','driveUrl','driveId','steering'].includes(k)))fail(400,'Modification ciblée invalide.');
  const old=snapshot.data[body.collection].find(x=>x.id===body.id);if(!old)fail(404,'Fiche introuvable.');
  if(body.revision!==snapshot.revision||body.entityRevision!==(old.revision||0))fail(409,'Cette fiche a changé. Relisez la version actuelle avant de réappliquer votre saisie.');
  const data=apply(snapshot.data,[{collection:body.collection,id:old.id,value:{...old,...body.patch}}],actor);
  const result=await write(db,data,snapshot.revision,actor,key,{kind:'entity_details',collection:body.collection,id:old.id,fields:Object.keys(body.patch)});
  return reply({...result,data:view(data,actor)});
 }
 if(path==='projects/validate'&&actor.role==='owner'){
  if(body.revision!==snapshot.revision)fail(409,'Le brouillon a changé. Relisez-le.');
  const p=snapshot.data.projects.find(x=>x.id===body.id);if(!p||p.lifecycle!=='draft')fail(400,'Brouillon absent.');
  if(!p.name||!p.purpose||!p.outcome||!p.ownerId)fail(400,'Précisez le nom, la raison d’être, le résultat attendu et le responsable.');
  p.lifecycle='active';p.validatedAt=new Date().toISOString();p.validatedBy=actor.id;p.revision=(p.revision||0)+1;
  return reply(await write(db,snapshot.data,body.revision,actor,key,{kind:'project_validated',id:p.id}));
 }
 if(path==='tasks/claim'&&actor.role==='agent'){
  const t=snapshot.data.tasks.find(x=>x.id===body.id),p=snapshot.data.projects.find(p=>p.id===t?.projectId);
  if(!t||p?.lifecycle!=='active'||t.ownerId!==actor.id||t.status==='done'||t.status==='blocked'||t.needsApproval||t.dependencyIds?.some(id=>snapshot.data.tasks.find(x=>x.id===id)?.status!=='done'))fail(403,'Tâche non exécutable.');
  const token=crypto.randomUUID(),until=Date.now()+3600000;
  const r=await db.prepare("INSERT INTO jobs(task_id,token,until,status) VALUES(?,?,?,'running') ON CONFLICT(task_id) DO UPDATE SET token=excluded.token,until=excluded.until,status='running' WHERE jobs.status='failed'").bind(t.id,token,until).run();
  if(!r.meta.changes)fail(409,'Tâche déjà réservée ou terminée ; arbitrage nécessaire en cas d’exécution interrompue.');
  await db.prepare('UPDATE jobs SET result=? WHERE task_id=? AND token=?').bind(JSON.stringify({taskRevision:t.revision||0}),t.id,token).run();return reply({token,until,task:t});
 }
 if(path==='tasks/result'&&actor.role==='agent'){
  const job=await db.prepare('SELECT * FROM jobs WHERE task_id=? AND token=?').bind(body.id,body.token).first();
  if(!job)fail(403,'Réservation inconnue.');
  if(job.status==='done')return reply({replayed:true});
  const t=snapshot.data.tasks.find(x=>x.id===body.id),p=snapshot.data.projects.find(p=>p.id===t?.projectId);
  if(!t||t.ownerId!==actor.id||p?.lifecycle!=='active'||t.needsApproval||(JSON.parse(job.result||'{}').taskRevision!==undefined&&JSON.parse(job.result).taskRevision!==(t.revision||0)))fail(409,'La tâche a changé ; vérification humaine nécessaire.');
  if(!body.evidence?.length||!body.verification)fail(400,'Preuve et vérification requises.');
  t.status=body.success?'done':'blocked';t.blocker=body.success?'':String(body.verification);t.evidence=body.evidence;t.updatedAt=new Date().toISOString();t.completedAt=body.success?t.updatedAt:null;
  const result=await write(db,snapshot.data,snapshot.revision,actor,key,{kind:'execution',id:t.id,verification:body.verification});
  await db.prepare('UPDATE jobs SET status=?,result=? WHERE task_id=? AND token=?').bind(body.success?'done':'failed',JSON.stringify(body),body.id,body.token).run();
  return reply(result);
 }
 fail(403,'Opération non autorisée.');
 }catch(e){return reply({error:e.code?e.message:'Erreur serveur. Aucune confirmation de sauvegarde.'},e.code||500);}
}
export function reply(value,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
