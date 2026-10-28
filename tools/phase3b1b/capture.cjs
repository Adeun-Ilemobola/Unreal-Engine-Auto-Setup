'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const recovery=require('../../unreal-auto-setup/generationRecovery');
const root=path.resolve(__dirname,'../..'), projectRoot=path.join(root,'.local-test-projects/Phase3AIntegration');
async function main(){
 const label=process.argv[2];if(!/^(ordinary|saved)-(before|after)$/.test(label))throw new Error('Invalid snapshot label');
 const owner=JSON.parse(await fs.readFile(path.join(projectRoot,'PHASE3A-OWNERSHIP.json'),'utf8'));
 if(owner.repository!==root || owner.purpose!=='Phase3AIntegration')throw new Error('Wrong fixture');
 const project={root:projectRoot,filename:path.join(projectRoot,'Phase3AIntegration.uproject')},engine='C:/Program Files/Epic Games/UE_5.8';
 const records=await recovery.capture(project,engine);let backup;
 if(label.endsWith('before'))backup=(await recovery.begin(path.join(projectRoot,'phase3b1b-baseline-'+label),project,engine,records)).location;
 const out={label,captured:new Date().toISOString(),backup,entries:[...records.values()].map(({content,...entry})=>entry)};
 await fs.writeFile(path.join(root,'docs/maintenance/runs/0006-phase3b1b-2026-10-28',label+'.json'),JSON.stringify(out,null,2),{flag:'wx'});
 console.log(JSON.stringify({label,files:out.entries.filter(item=>item.kind==='file').length,backup}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
