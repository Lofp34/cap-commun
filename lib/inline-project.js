const ADD_PROJECT='__create_project__';
function projectOptions(projects,selected){return '<option value="">Choisir un projet</option>'+options(projects,selected,'shortName')+(CAP.actor.role==='owner'?'<option value="'+ADD_PROJECT+'">+ Ajouter un projet…</option>':'');}
function openInlineProject(){
 const actionForm=$('#editor-form');if(actionForm?.dataset.kind!=='task'||CAP.actor.role!=='owner')return;
 const projectId=actionForm.elements.projectId.value,select=actionForm.elements.projectId;
 if($('#inline-project'))return;
 const dialog=document.createElement('dialog');dialog.id='inline-project';dialog.className='modal';dialog.setAttribute('aria-labelledby','inline-project-title');
 const defaults={ownerId:project(projectId)?.ownerId||data.preferences.currentUser};
 dialog.innerHTML='<form id="inline-project-form"><div class="dialog-header"><div><div class="eyebrow">'+'Nouveau projet'+'</div><h2 id="inline-project-title">Ajouter un projet</h2></div><button type="button" class="icon-button sm" data-inline-cancel aria-label="Fermer">'+icon('close')+'</button></div><div class="dialog-content"><p class="form-help">Votre action reste ouverte. Le projet sera créé en brouillon et sélectionné à votre retour.</p><div class="form-error" role="alert" id="inline-project-error"></div>'+field('Nom du projet','projectName','','text','required maxlength="180" placeholder="Ex. Suivi des participants"')+textarea('Pourquoi ce projet existe','projectPurpose')+textarea('Résultat attendu','projectOutcome')+'<div class="form-grid">'+selectField('Responsable','projectOwner',selectPeople(defaults.ownerId),'required')+field('Échéance','projectDate','','date','min="1900-01-01" max="2200-12-31"')+'</div></div><div class="dialog-footer"><button type="button" class="button ghost" data-inline-cancel>Annuler</button><button type="submit" class="button primary">Créer le projet</button></div></form>';
 document.body.append(dialog);let busy=false;const id=uid('project'),requestKey=crypto.randomUUID();
 const close=()=>{if(busy)return;dialog.close();dialog.remove();if(select.isConnected)select.focus({preventScroll:true});};
 dialog.querySelectorAll('[data-inline-cancel]').forEach(b=>b.addEventListener('click',close));
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.querySelector('form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  const values=new FormData(e.target),value={id,name:String(values.get('projectName')||'').trim(),shortName:String(values.get('projectName')||'').trim().slice(0,100),purpose:String(values.get('projectPurpose')||'').trim(),outcome:String(values.get('projectOutcome')||'').trim(),ownerId:String(values.get('projectOwner')||''),dueDate:String(values.get('projectDate')||'')||null,priorities:[],goalId:null,color:'#157c7c',archived:false,order:data.projects.length,source:'user',detailsSource:'user',externalRefs:[],lifecycle:'draft',members:[]};
  const candidate=clone(data);candidate.projects.push(value);const checked=CockpitStore.validate(candidate);const error=dialog.querySelector('#inline-project-error');if(!checked.ok){error.textContent=checked.errors[0];return;}
  busy=true;error.textContent='';dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   await capQueue;if(capFailed)throw new Error('La sauvegarde d’une autre modification a échoué. Exportez la saisie avant de recharger.');
   const result=await capPost('changes',{revision:capRevision,ops:[{collection:'projects',id,value}]},requestKey);
   data=result.data;capShadow=clone(data);capRevision=result.revision;render();
   if(actionForm.isConnected&&actionForm.elements.projectId.value===projectId){select.innerHTML=projectOptions(activeProjects(),id);select.value=id;select.dataset.previousValue=id;actionForm.elements.deliverableId.innerHTML=chantierOptions(id);actionForm.elements.deliverableId.dataset.previousValue='';dirty=true;syncForm();}
   capLabel('Brouillon de projet enregistré dans la base partagée');busy=false;close();notify('Projet créé en brouillon et sélectionné pour votre action.');
  }catch(err){
   if(err.status===409){try{const r=await fetch('/api/v1/state',{cache:'no-store'});if(r.ok){const latest=await r.json();data=latest.data;capShadow=clone(data);capRevision=latest.revision;render();}}catch(_){} }
   error.textContent=err.status===409?'Le projet a changé entre-temps. Votre saisie est conservée ; vous pouvez réessayer.':err.message;
   busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);
  }
 });
 dialog.showModal();dialog.querySelector('input').focus({preventScroll:true});
}
