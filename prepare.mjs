import fs from 'node:fs';
const html=fs.readFileSync('legacy/index.html','utf8');
fs.mkdirSync('lib',{recursive:true});
const store=html.slice(html.indexOf('const CockpitStore ='),html.indexOf('/* Cap commun V1 — vue'));
fs.writeFileSync('lib/validate.js',store+'\nexport const validate = CockpitStore.validate;\n');
const seed=html.slice(html.indexOf('const CockpitSeed ='),html.indexOf('/*\n * Cockpit commun — persistance'));
fs.writeFileSync('lib/seed.js',seed+`\nexport function emptyData(){const d=CockpitSeed.create(new Date().toISOString().slice(0,10));for(const k of ['objectives','projects','deliverables','tasks','milestones','integrations'])d[k]=[];d.people=d.people.filter(p=>['camille','alex'].includes(p.id));d.people.push({id:'project-manager',name:'Gestionnaire de projet',short:'GP',kind:'agent',role:'Suivi des projets',color:'teal'});return d;}\n`);
fs.writeFileSync('lib/legacy-html.js','export default '+JSON.stringify(html)+';\n');
