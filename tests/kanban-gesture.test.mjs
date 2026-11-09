import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import {planKanbanMove} from '../lib/kanban-move.js';
function harness(){
 const handlers={},timers=new Map();let seq=0,commits=0,pointTarget;
 class FakeElement{constructor(){this.classList={add(){},remove(){}};this.style={};this.isConnected=true;}append(){}remove(){}setAttribute(){}removeAttribute(){}focus(){}getBoundingClientRect(){return {left:10,top:100,width:200,height:100}}cloneNode(){return new FakeElement()}}
 const board=new FakeElement(),source=new FakeElement(),target=new FakeElement(),card=new FakeElement();source.dataset={coordLane:'me'};target.dataset={coordLane:'other'};card.dataset={id:'task'};
 source.closest=target.closest=function(){return this};source.querySelector=target.querySelector=()=>({textContent:'Alex'});pointTarget=target;
 card.closest=selector=>selector.includes('coord-task')?card:selector.includes('coord-board')?board:source;
 const listeners=(type,fn)=>{(handlers[type]||=[]).push(fn)};
 const doc={addEventListener:listeners,createElement:()=>new FakeElement(),querySelectorAll:()=>[],elementFromPoint:()=>pointTarget,body:new FakeElement()};
 const current={id:'task',status:'todo',ownerId:'camille',needsApproval:false};
 const context={document:doc,window:{addEventListener(){},scrollBy(){}},Element:FakeElement,innerWidth:390,innerHeight:860,Date,Math,setTimeout(fn){timers.set(++seq,fn);return seq},clearTimeout(id){timers.delete(id)},requestAnimationFrame(){return 1},cancelAnimationFrame(){},task:()=>current,data:{preferences:{currentUser:'camille'},people:[{id:'camille',kind:'human'},{id:'alex',kind:'human'}]},planKanbanMove,isBlocked:()=>false,person:id=>({name:id}),commit(fn){fn();commits++},notify(){},openTask(){},now:()=>new Date().toISOString(),$:()=>null};
 vm.runInNewContext(fs.readFileSync('lib/kanban-dnd.js','utf8'),context);
 function fire(type,x=30,y=140){const e={target:card,touches:type==='touchend'?[]:[{clientX:x,clientY:y}],prevented:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){}};for(const fn of handlers[type]||[])fn(e);return e}
 return {fire,hold(){for(const fn of [...timers.values()])fn();timers.clear()},get commits(){return commits},get owner(){return current.ownerId},outside(){pointTarget=null},timers};
}
test('appui court conserve le clic et ne déplace pas',()=>{const h=harness();h.fire('touchstart');h.fire('touchend');assert.equal(h.commits,0);assert.equal(h.fire('click').prevented,false)});
test('défilement avant appui long annule le déplacement sans bloquer le scroll',()=>{const h=harness();h.fire('touchstart');assert.equal(h.fire('touchmove',32,170).prevented,false);h.hold();h.fire('touchend');assert.equal(h.commits,0)});
test('appui long puis déplacement réattribue une seule fois et supprime le clic fantôme',()=>{const h=harness();h.fire('touchstart');h.hold();assert.equal(h.fire('touchmove',300,150).prevented,true);h.fire('touchend');assert.equal(h.commits,1);assert.equal(h.owner,'alex');assert.equal(h.fire('click').prevented,true)});
test('annulation tactile ou dépôt hors colonne ne change rien',()=>{for(const cancel of [true,false]){const h=harness();h.fire('touchstart');h.hold();if(cancel)h.fire('touchcancel');else{h.outside();h.fire('touchmove',390,150);h.fire('touchend')}assert.equal(h.commits,0)}});
