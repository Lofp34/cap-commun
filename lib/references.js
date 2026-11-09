// Shared by the API and the browser. Legacy values stay stored; only safe URLs render.
export function safeResourceUrl(value){
 if(typeof value!=='string'||value.length>2048||/[\u0000-\u0020\u007f]/.test(value))return null;
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return null;return u.href;}catch{return null;}
}
export function resourceRefs(row){
 const out=[],seen=new Set();
 const add=(r)=>{const url=safeResourceUrl(r.url);if(!url)return;const u=new URL(url),m=u.hostname==='drive.google.com'?u.pathname.match(/\/(?:folders|d)\/([\w-]+)/):null;const key=m?'drive:'+m[1]:url;if(seen.has(key))return;seen.add(key);out.push({...r,url});};
 if(row.driveUrl||row.driveId)add({id:'project-drive',label:'Dossier Drive',url:row.driveUrl||(typeof row.driveId==='string'&&/^[\w-]+$/.test(row.driveId)?'https://drive.google.com/drive/folders/'+row.driveId:''),type:'drive',visibility:'private',legacyDrive:true});
 for(const [i,r] of (row.externalRefs||[]).entries()){if(typeof r==='string')add({id:'legacy-'+i,label:'Ressource',url:r,visibility:'private',legacy:true});else if(r&&typeof r==='object')add({...r,id:r.id||'legacy-'+i,label:typeof r.label==='string'?r.label:'Ressource',url:r.url||r.href,visibility:r.visibility||'private'});}
 return out;
}
export function validateResourceChanges(old,row,actor,people=[]){
 const changed=(k)=>JSON.stringify(old?.[k])!==JSON.stringify(row[k]);
 const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
 if(changed('driveUrl')&&row.driveUrl!=null&&row.driveUrl!==''&&!safeResourceUrl(row.driveUrl))throw Error('Le dossier Drive doit avoir une URL HTTPS valide.');
 if(changed('driveId')&&row.driveId!=null&&row.driveId!==''&&(typeof row.driveId!=='string'||! /^[\w-]{1,200}$/.test(row.driveId)))throw Error('Identifiant Drive invalide.');
 if(changed('externalRefs')){
  if(!Array.isArray(row.externalRefs)||row.externalRefs.length>100)throw Error('100 références maximum.');
  const ids=new Set();
  for(const r of row.externalRefs){
   const unchanged=(old?.externalRefs||[]).some(x=>JSON.stringify(x)===JSON.stringify(r));
   if(unchanged)continue;
   if(!r||typeof r!=='object'||!text(r.id,180)||!text(r.label,180)||!safeResourceUrl(r.url)||!['private','project'].includes(r.visibility||'private')||(r.type!=null&&!['drive','gmail','document','website','other'].includes(r.type)))throw Error('Référence invalide : identifiant, libellé et URL HTTPS sont requis.');
   if(ids.has(r.id))throw Error('Identifiant de référence en double.');ids.add(r.id);
   if(actor.role!=='owner'&&r.visibility==='project'&&!(old?.externalRefs||[]).some(x=>x.id===r.id&&x.visibility==='project'&&JSON.stringify(x)===JSON.stringify(r)))throw Error('Seul Camille choisit les liens visibles par les membres du projet.');
  }
  const all=row.externalRefs.filter(x=>x&&typeof x==='object'&&x.id).map(x=>x.id);if(new Set(all).size!==all.length)throw Error('Identifiant de référence en double.');
 }
 if(changed('steering')&&row.steering!=null){
  const s=row.steering;if(typeof s!=='object'||Array.isArray(s)||Object.keys(s).some(k=>!['expectedResult','state','asOf','nextStep','nextOwnerId','nextTaskId','questions','visibility'].includes(k)))throw Error('Informations de pilotage invalides.');
  for(const k of ['expectedResult','state','nextStep'])if(s[k]!=null&&(typeof s[k]!=='string'||s[k].length>6000))throw Error('Texte de pilotage trop long ou invalide.');
  if(s.state&&!Number.isFinite(Date.parse(s.asOf)))throw Error('L’état actuel doit être daté.');
  if(s.asOf!=null&&s.asOf!==''&&(typeof s.asOf!=='string'||!Number.isFinite(Date.parse(s.asOf))))throw Error('Date de pilotage invalide.');
  if(s.nextOwnerId&&!people.some(p=>p.id===s.nextOwnerId))throw Error('Responsable de la prochaine étape inconnu.');
  if(s.questions!=null&&(!Array.isArray(s.questions)||s.questions.length>30||s.questions.some(q=>!text(q,2000))))throw Error('Questions de pilotage invalides.');
  if(!['private','project'].includes(s.visibility||'private'))throw Error('Visibilité du pilotage invalide.');
  if(actor.role!=='owner'&&s.visibility==='project'&&JSON.stringify(s)!==JSON.stringify(old?.steering))throw Error('Seul Camille choisit le pilotage visible par les membres du projet.');
 }
}
