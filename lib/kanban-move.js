export function planKanbanMove(task,lane,me,people,blocked=false){
 if(!task||task.status==='done'||!['me','other','agents','approval','blocked'].includes(lane))return {kind:'none'};
 if(lane==='blocked')return blocked?{kind:'none'}:{kind:'editor',defaults:{status:'blocked'},message:'Précisez la raison du blocage dans la fiche.'};
 if(lane==='approval')return task.needsApproval&&!blocked?{kind:'none'}:{kind:'editor',defaults:{needsApproval:true,reviewerId:task.reviewerId||me},message:'Choisissez la personne qui doit valider cette action.'};
 let owner=lane==='me'?me:lane==='other'?(me==='camille'?'alex':'camille'):null;
 if(lane==='agents'){
  const agents=people.filter(p=>p.kind==='agent');
  if(!agents.length)return {kind:'none',message:'Aucun agent disponible pour cette action.'};
  if(agents.some(p=>p.id===task.ownerId))return {kind:'none'};
  if(agents.length>1)return {kind:'editor',defaults:{},message:'Choisissez l’agent responsable dans la fiche.'};
  owner=agents[0].id;
 }
 if(owner===task.ownerId)return {kind:'none'};
 if(blocked||task.needsApproval)return {kind:'editor',defaults:{ownerId:owner},message:'Vérifiez la réattribution et le blocage ou la validation dans la fiche.'};
 return {kind:'assign',ownerId:owner};
}
