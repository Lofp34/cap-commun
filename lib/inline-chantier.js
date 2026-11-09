const ADD_CHANTIER='__create_chantier__';
function chantierOptions(projectId,selected=null){return '<option value="">Sans chantier</option>'+options(data.deliverables.filter(d=>d.projectId===projectId),selected,'title')+'<option value="'+ADD_CHANTIER+'">+ Ajouter un chantier…</option>';}
function openInlineChantier(){
 const actionForm=$('#editor-form');if(actionForm?.dataset.kind!=='task')return;
 const projectId=actionForm.elements.projectId.value,select=actionForm.elements.deliverableId;
 if($('#inline-chantier'))return;
 const dialog=document.createElement('dialog');dialog.id='inline-chantier';dialog.className='modal';dialog.setAttribute('aria-labelledby','inline-chantier-title');
 const defaults={ownerId:project(projectId)?.ownerId||data.preferences.currentUser};
 dialog.innerHTML='<form id="inline-chantier-form"><div class="dialog-header"><div><div class="eyebrow">'+esc(project(projectId)?.name)+'</div><h2 id="inline-chantier-title">Ajouter un chantier</h2></div><button type="button" class="icon-button sm" data-inline-cancel aria-label="Fermer">'+icon('close')+'</button></div><div class="dialog-content"><p class="form-help">Votre action reste ouverte. Le nouveau chantier sera sélectionné à votre retour.</p><div class="form-error" role="alert" id="inline-chantier-error"></div>'+field('Nom du chantier','chantierTitle','','text','required maxlength="180" placeholder="Ex. Suivi des participants"')+textarea('Résultat attendu','chantierDescription')+'<div class="form-grid">'+selectField('Responsable','chantierOwner',selectPeople(defaults.ownerId),'required')+field('Échéance','chantierDate','','date','min="1900-01-01" max="2200-12-31"')+'</div></div><div class="dialog-footer"><button type="button" class="button ghost" data-inline-cancel>Annuler</button><button type="submit" class="button primary">Créer le chantier</button></div></form>';
 document.body.append(dialog);let busy=false;const id=uid('deliverable'),requestKey=crypto.randomUUID();
 const close=()=>{if(busy)return;dialog.close();dialog.remove();if(select.isConnected)select.focus({preventScroll:true});};
 dialog.querySelectorAll('[data-inline-cancel]').forEach(b=>b.addEventListener('click',close));
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.querySelector('form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  const values=new FormData(e.target),value={id,projectId,title:String(values.get('chantierTitle')||'').trim(),description:String(values.get('chantierDescription')||'').trim(),ownerId:String(values.get('chantierOwner')||''),status:'todo',dueDate:String(values.get('chantierDate')||'')||null,blockingReason:'',source:'user',externalRefs:[]};
  const candidate=clone(data);candidate.deliverables.push(value);const checked=CockpitStore.validate(candidate);const error=dialog.querySelector('#inline-chantier-error');if(!checked.ok){error.textContent=checked.errors[0];return;}
  busy=true;error.textContent='';dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   await capQueue;if(capFailed)throw new Error('La sauvegarde d’une autre modification a échoué. Exportez la saisie avant de recharger.');
   const result=await capPost('changes',{revision:capRevision,ops:[{collection:'deliverables',id,value}]},requestKey);
   data=result.data;capShadow=clone(data);capRevision=result.revision;render();
   if(actionForm.isConnected&&actionForm.elements.projectId.value===projectId){select.innerHTML=chantierOptions(projectId,id);select.value=id;select.dataset.previousValue=id;dirty=true;syncForm();}
   capLabel('Chantier enregistré dans la base partagée');busy=false;close();notify('Chantier créé et associé à votre action.');
  }catch(err){
   if(err.status===409){try{const r=await fetch('/api/v1/state',{cache:'no-store'});if(r.ok){const latest=await r.json();data=latest.data;capShadow=clone(data);capRevision=latest.revision;render();}}catch(_){} }
   error.textContent=err.status===409?'Le projet a changé entre-temps. Votre saisie est conservée ; vous pouvez réessayer.':err.message;
   busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);
  }
 });
 dialog.showModal();dialog.querySelector('input').focus({preventScroll:true});
}
