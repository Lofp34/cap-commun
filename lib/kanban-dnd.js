// Integrated in CockpitApp: uses the same commit/validation/save path as the editor.
function moveCoordTask(id,lane){
 const current=task(id),plan=planKanbanMove(current,lane,data.preferences.currentUser,data.people,current?isBlocked(current):false);
 if(plan.kind==='editor'){openTask(id,plan.defaults);notify(plan.message);return;}
 if(plan.kind==='assign')commit(()=>{current.ownerId=plan.ownerId;current.updatedAt=now();},'Action attribuée à '+person(plan.ownerId)?.name+'.',true);
 else if(plan.message)notify(plan.message);
}
let coordDrag=null,coordClickUntil=0;
function installCoordDrag(){
 const holdDelay=420,moveTolerance=9;
 const cardAt=target=>target instanceof Element?target.closest('.coord-task[data-action="edit-task"]'):null;
 const cancelPending=()=>{if(coordDrag?.timer)clearTimeout(coordDrag.timer);};
 function announce(text){if(coordDrag?.live)coordDrag.live.textContent=text;}
 function targetLane(column){
  if(!coordDrag)return;
  const next=column?.dataset.coordLane||null;
  if(next===coordDrag.target)return;
  document.querySelectorAll('.coord-drop-target').forEach(x=>x.classList.remove('coord-drop-target'));
  coordDrag.target=next;
  if(column){column.classList.add('coord-drop-target');announce('Déposer dans '+column.querySelector('.column-heading')?.textContent.trim()+'.');}
 }
 function locate(){if(coordDrag?.active&&!coordDrag.keyboard)targetLane(document.elementFromPoint(coordDrag.x,coordDrag.y)?.closest('.coord-column[data-coord-lane]'));}
 function frame(){
  const d=coordDrag;if(!d?.active||d.keyboard)return;
  const rect=d.board.getBoundingClientRect();
  if(d.y>=rect.top&&d.y<=rect.bottom){
   const left=Math.max(rect.left,0),right=Math.min(rect.right,innerWidth),edge=48;
   const delta=d.x<left+edge?-Math.ceil((left+edge-d.x)/4):d.x>right-edge?Math.ceil((d.x-right+edge)/4):0;
   if(delta)d.board.scrollLeft+=Math.max(-16,Math.min(16,delta));
  }
  if(d.y<48)window.scrollBy(0,-10);else if(d.y>innerHeight-48)window.scrollBy(0,10);
  locate();d.frame=requestAnimationFrame(frame);
 }
 function activate(){
  const d=coordDrag;if(!d||!d.card.isConnected)return cleanup(false);
  d.active=true;coordClickUntil=Date.now()+800;
  const rect=d.card.getBoundingClientRect();d.offsetX=d.x-rect.left;d.offsetY=d.y-rect.top;
  d.card.classList.add('coord-drag-source');d.board.classList.add('coord-dragging');document.body.classList.add('coord-dragging-body');
  d.live=document.createElement('div');d.live.className='coord-drag-live';d.live.setAttribute('role','status');d.live.setAttribute('aria-live','polite');document.body.append(d.live);
  if(!d.keyboard){d.ghost=d.card.cloneNode(true);d.ghost.removeAttribute('id');d.ghost.removeAttribute('data-action');d.ghost.setAttribute('aria-hidden','true');d.ghost.className='coord-task coord-drag-ghost';d.ghost.style.width=rect.width+'px';d.ghost.style.left=rect.left+'px';d.ghost.style.top=rect.top+'px';document.body.append(d.ghost);d.frame=requestAnimationFrame(frame);}
  targetLane(d.card.closest('[data-coord-lane]'));
 }
 function cleanup(drop){
  const d=coordDrag;if(!d)return;
  cancelPending();if(d.frame)cancelAnimationFrame(d.frame);
  const target=d.target,id=d.id,active=d.active,source=d.source;
  d.card.classList.remove('coord-drag-source');d.board.classList.remove('coord-dragging');d.ghost?.remove();d.live?.remove();document.body.classList.remove('coord-dragging-body');
  document.querySelectorAll('.coord-drop-target').forEach(x=>x.classList.remove('coord-drop-target'));
  coordDrag=null;
  if(active){coordClickUntil=Date.now()+600;if(drop&&target&&target!==source)moveCoordTask(id,target);else if(d.keyboard)d.card.focus({preventScroll:true});}
 }
 function start(card,x,y,type,keyboard=false){
  if(coordDrag)return;
  const board=card.closest('.coord-board');if(!board||$('dialog[open]'))return;
  const t=task(card.dataset.id);if(!t||t.status==='done')return;
  coordDrag={card,board,id:t.id,source:card.closest('[data-coord-lane]')?.dataset.coordLane,x,y,startX:x,startY:y,type,keyboard,active:false};
  if(keyboard)activate();else coordDrag.timer=setTimeout(activate,holdDelay);
 }
 function move(x,y){
  const d=coordDrag;if(!d)return;
  d.x=x;d.y=y;
  if(!d.active){if(Math.hypot(x-d.startX,y-d.startY)>moveTolerance){if(d.type==='mouse')activate();else cleanup(false);}return;}
  if(d.ghost){d.ghost.style.left=(x-d.offsetX)+'px';d.ghost.style.top=(y-d.offsetY)+'px';}locate();
 }
 document.addEventListener('touchstart',e=>{if(e.touches.length!==1){cleanup(false);return;}const card=cardAt(e.target);if(card)start(card,e.touches[0].clientX,e.touches[0].clientY,'touch');},{passive:true});
 document.addEventListener('touchmove',e=>{if(!coordDrag||coordDrag.type!=='touch')return;if(e.touches.length!==1){cleanup(false);return;}if(coordDrag.active)e.preventDefault();move(e.touches[0].clientX,e.touches[0].clientY);},{passive:false});
 document.addEventListener('touchend',e=>{if(coordDrag?.type!=='touch')return;const active=coordDrag.active;if(active)e.preventDefault();cleanup(active);},{passive:false});
 document.addEventListener('touchcancel',()=>cleanup(false),{passive:true});
 document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0)return;const card=cardAt(e.target);if(card)start(card,e.clientX,e.clientY,'mouse');});
 document.addEventListener('pointermove',e=>{if(coordDrag?.type!=='mouse')return;move(e.clientX,e.clientY);if(coordDrag?.active)e.preventDefault();});
 document.addEventListener('pointerup',()=>{if(coordDrag?.type==='mouse')cleanup(true);});
 document.addEventListener('pointercancel',e=>{if(e.pointerType!=='touch')cleanup(false);});
 document.addEventListener('contextmenu',e=>{if(cardAt(e.target))e.preventDefault();});
 document.addEventListener('click',e=>{if(Date.now()<coordClickUntil&&cardAt(e.target)){e.preventDefault();e.stopImmediatePropagation();}},true);
 document.addEventListener('keydown',e=>{
  const card=cardAt(e.target);
  if(e.key==='Escape'&&coordDrag){e.preventDefault();e.stopImmediatePropagation();cleanup(false);return;}
  if(!coordDrag&&card&&e.key===' '){e.preventDefault();e.stopImmediatePropagation();const r=card.getBoundingClientRect();start(card,r.left+r.width/2,r.top+r.height/2,'keyboard',true);return;}
  if(!coordDrag?.keyboard)return;
  if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
   e.preventDefault();e.stopImmediatePropagation();const cols=[...coordDrag.board.querySelectorAll('[data-coord-lane]')];const index=cols.findIndex(x=>x.dataset.coordLane===coordDrag.target);const next=e.key==='Home'?0:e.key==='End'?cols.length-1:Math.max(0,Math.min(cols.length-1,index+(e.key==='ArrowRight'?1:-1)));targetLane(cols[next]);cols[next].scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  }else if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopImmediatePropagation();cleanup(true);}
 },true);
 window.addEventListener('blur',()=>cleanup(false));document.addEventListener('visibilitychange',()=>{if(document.hidden)cleanup(false);});
 document.addEventListener('dragstart',e=>{if(cardAt(e.target))e.preventDefault();});
}
installCoordDrag();
