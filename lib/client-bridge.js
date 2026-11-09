function capBootError(status){
 const box=document.createElement('main');box.style.cssText='max-width:560px;margin:12vh auto;padding:24px;font-family:system-ui';
 const title=document.createElement('h1'),detail=document.createElement('p'),link=document.createElement('a');
 if(status===401){title.textContent='Connexion à Cap commun requise';detail.textContent='Connectez-vous avec votre compte ChatGPT autorisé.';link.textContent='Se connecter avec ChatGPT';link.href='/signin-with-chatgpt?return_to=/';link.target='_top';}
 else if(status===403){title.textContent='Votre compte est connecté, mais son accès est refusé';detail.textContent='La connexion ChatGPT a réussi. Demandez à Camille de vérifier l’adresse autorisée pour votre accès à Cap commun.';link.textContent='Changer de compte ChatGPT';link.href='/signout-with-chatgpt?return_to=/';link.target='_top';}
 else{title.textContent='Cap commun est temporairement indisponible';detail.textContent='La connexion à l’application a échoué. Réessayez dans quelques instants ; vous n’avez pas besoin de vous reconnecter à ChatGPT.';link.textContent='Réessayer';link.href='/';}
 box.append(title,detail,link);document.body.replaceChildren(box);
}
let capBootResponse;
try{capBootResponse=await fetch('/api/v1/state',{cache:'no-store'});}catch(error){capBootError(503);throw error;}
if(!capBootResponse.ok){capBootError(capBootResponse.status);throw new Error('Accès à Cap commun indisponible');}
if(!capBootResponse.headers.get('content-type')?.includes('application/json')){capBootError(capBootResponse.redirected?401:503);throw new Error('Réponse de connexion inattendue');}
const CAP=await capBootResponse.json();let capShadow=structuredClone(CAP.data),capRevision=CAP.revision,capQueue=Promise.resolve(),capPending=0,capFailed=false;
const capStatus=document.createElement('div');capStatus.setAttribute('role','status');capStatus.style.cssText='position:sticky;top:0;z-index:100;background:#eff8f5;color:#165b4d;padding:8px 16px;font-size:12px';document.body.prepend(capStatus);
const capLabel=message=>{capStatus.textContent=message};capLabel('Base partagée · Connecté : '+CAP.actor.id);
async function capPost(path,body,key=crypto.randomUUID()){const r=await fetch('/api/v1/'+path,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Object.assign(new Error(j.error||'Sauvegarde impossible'),{status:r.status});return j;}
function capSave(next){
 const snapshot=structuredClone(next),ops=[];
 for(const k of ['people','objectives','projects','deliverables','tasks','milestones','integrations']){
  for(const row of snapshot[k])if(JSON.stringify(row)!==JSON.stringify(capShadow[k].find(x=>x.id===row.id)))ops.push({collection:k,id:row.id,value:row});
  for(const row of capShadow[k])if(!snapshot[k].some(x=>x.id===row.id))ops.push({collection:k,id:row.id,remove:true});
 }
 capShadow=snapshot;if(!ops.length)return {ok:true};capPending++;capLabel('Enregistrement dans la base…');
 capQueue=capQueue.then(async()=>{if(capFailed)return;try{const result=await capPost('changes',{revision:capRevision,ops});capRevision=result.revision;capLabel('Enregistré dans la base partagée');}catch(e){capFailed=true;capLabel('NON ENREGISTRÉ — '+e.message+' · Exportez votre saisie avant de recharger.');}finally{capPending--;}});
 return {ok:true};
}
