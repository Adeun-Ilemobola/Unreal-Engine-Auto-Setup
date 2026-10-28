'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),source=path.join(root,'unreal-auto-setup'),projectRoot=path.join(root,'.local-test-projects/Phase3AIntegration');
async function main(){
 const marker=JSON.parse(await fs.readFile(path.join(projectRoot,'PHASE3A-OWNERSHIP.json')));assert.equal(marker.repository,root);
 const scratch=await fs.mkdtemp('C:\\Dev\\Scratch\\UnrealAutoSetupTests\\creation-');process.env.TEMP=scratch;process.env.TMP=scratch;process.env.TMPDIR=scratch;
 const descriptor=path.join(projectRoot,'Phase3AIntegration.uproject');assert.equal(JSON.parse(await fs.readFile(descriptor)).EngineAssociation,'5.8');
 assert.equal((await require(path.join(source,'processes')).query(descriptor)).state,'Stopped');
 const module=(await require(path.join(source,'modules')).discover(projectRoot)).find(m=>m.name==='Phase3AIntegration'),templates=require(path.join(source,'classTemplates')),writer=require(path.join(source,'classFiles'));
 const before=await fs.readFile(module.buildFile,'utf8'),project={root:projectRoot,filename:descriptor},vscode={workspace:{isTrusted:true,workspaceFolders:[{uri:{fsPath:projectRoot}}],textDocuments:[]}},plans=[];
 const suffix=path.basename(scratch).replace(/[^a-zA-Z0-9]/g,'');
 for(const type of templates.registry){const plan=templates.plan(project,module,type.id,'Probe'+type.id[0].toUpperCase()+type.id.slice(1)+suffix,'Qualification3z','type');await writer.create(plan,vscode);plans.push(plan);}
 const record=process.env.UNREAL_VALIDATION_RECORD_DIR || path.join(root,'docs/maintenance/runs/0010-phase3b3z');await fs.writeFile(path.join(record,'generated.json'),JSON.stringify(plans.map(p=>({type:p.type.id,name:p.name,files:p.files})),null,2));
 const store=require(path.join(source,'operationOwnership')).create(path.join(scratch,'store')),claim=await store.begin(descriptor,'build');
 const spec=require(path.join(source,'build')).specification('C:\\Program Files\\Epic Games\\UE_5.8',descriptor,{target:'Phase3AIntegrationEditor',platform:'Win64',configuration:'Development'});spec.args.push('-NoUBA','-NoXGE','-NoFASTBuild','-NoSNDBS');
 const encoded=Buffer.from('# Operation '+claim.operationId+'\n'+require(path.join(source,'build')).script(spec),'utf16le').toString('base64');
 await claim.spawnAttempted(encoded);const processHandle=await require(path.join(source,'processSupervisor')).launch(claim,encoded);let output='';processHandle.stdout.on('data',b=>output+=b);processHandle.stderr.on('data',b=>output+=b);
 const exitCode=await new Promise((resolve,reject)=>{processHandle.once('close',resolve);processHandle.once('error',reject);});await fs.writeFile(path.join(record,'ubt.txt'),output);await fs.writeFile(path.join(record,'compile-result.json'),JSON.stringify({scratch,exitCode,proof:processHandle.proof,types:plans.length},null,2));await claim.complete();
 assert.equal(await fs.readFile(module.buildFile,'utf8'),before);assert.equal(exitCode,0,'UBT failed; sources retained for diagnosis');
 for(const plan of plans)for(const file of plan.files){assert.equal(await fs.readFile(file.path,'utf8'),file.text);await fs.unlink(file.path);}
 for(const dir of [...new Set(plans.flatMap(p=>p.files.map(f=>path.dirname(f.path))))])await fs.rmdir(dir);
 for(const dir of [...new Set(plans.flatMap(p=>p.files.map(f=>path.dirname(path.dirname(f.path)))))])await fs.rmdir(dir);
 await fs.rm(scratch,{recursive:true});console.log('Compiled all '+plans.length+' templates with UHT and UBT; owned sources and scratch cleaned.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
