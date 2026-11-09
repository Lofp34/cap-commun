import {test} from 'node:test';import assert from 'node:assert/strict';import {safeResourceUrl,resourceRefs,validateResourceChanges} from '../lib/references.js';
test('ancien dossier et référence normalisée ne s’affichent qu’une fois',()=>{
 const row={driveId:'abc',driveUrl:'https://drive.google.com/drive/folders/abc',externalRefs:[{id:'same',label:'Dossier',url:'https://drive.google.com/drive/folders/abc?usp=sharing'},'https://example.com/notice',{id:'bad',url:'javascript:alert(1)'}]};const r=resourceRefs(row);assert.equal(r.length,2);assert.equal(r[0].label,'Dossier Drive');assert.equal(resourceRefs({}).length,0);
});
test('URL et structure de référence contrôlées côté navigateur et serveur',()=>{assert.equal(safeResourceUrl('data:text/html,abc'),null);assert.equal(safeResourceUrl('https://example.com/\nfoo'),null);assert.throws(()=>validateResourceChanges({}, {externalRefs:[{id:'ref',label:'',url:'https://example.com'}]}, {role:'owner'}),/Référence invalide/);});
