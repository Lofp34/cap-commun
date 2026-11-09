import {test} from 'node:test';import assert from 'node:assert/strict';import {planKanbanMove} from '../lib/kanban-move.js';
const people=[{id:'camille',kind:'human'},{id:'alex',kind:'human'},{id:'project-manager',kind:'agent'}];const task={id:'t',ownerId:'camille',status:'doing',dependencyIds:[],needsApproval:false};
test('déposer chez Alex réattribue sans modifier le statut',()=>assert.deepEqual(planKanbanMove(task,'other','camille',people),{kind:'assign',ownerId:'alex'}));
test('la colonne moi suit la personne connectée',()=>assert.deepEqual(planKanbanMove(task,'me','alex',people),{kind:'assign',ownerId:'alex'}));
test('choix de l’agent réel, aucun identifiant fictif',()=>assert.equal(planKanbanMove(task,'agents','camille',people).ownerId,'project-manager'));
test('plusieurs agents demandent un choix',()=>assert.equal(planKanbanMove(task,'agents','camille',[...people,{id:'another',kind:'agent'}]).kind,'editor'));
test('un dépôt ne supprime ni dépendance ni validation',()=>{assert.equal(planKanbanMove(task,'other','camille',people,true).kind,'editor');assert.equal(planKanbanMove({...task,needsApproval:true},'other','camille',people).kind,'editor')});
test('blocage et validation passent par les champs du formulaire',()=>{assert.equal(planKanbanMove(task,'blocked','camille',people).defaults.status,'blocked');assert.equal(planKanbanMove(task,'approval','camille',people).defaults.reviewerId,'camille')});
test('colonne identique et tâche terminée ne modifient rien',()=>{assert.equal(planKanbanMove(task,'me','camille',people).kind,'none');assert.equal(planKanbanMove({...task,status:'done'},'other','camille',people).kind,'none')});
