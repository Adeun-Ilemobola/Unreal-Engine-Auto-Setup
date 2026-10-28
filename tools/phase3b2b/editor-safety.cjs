'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process');
const repository=path.resolve(__dirname,'../..'),project=path.join(repository,'.local-test-projects/Phase3AIntegration');
async function main(){
 const marker=JSON.parse(await fs.readFile(path.join(project,'PHASE3A-OWNERSHIP.json')));if(marker.repository!==repository)throw new Error('Wrong fixture');
 await fs.mkdir('C:\\Dev\\Scratch\\UnrealAutoSetupTests',{recursive:true});
 const scratch=await fs.mkdtemp('C:\\Dev\\Scratch\\UnrealAutoSetupTests\\editor-');
 const env={...process.env,TEMP:scratch,TMP:scratch,TMPDIR:scratch};
 const filename=path.join(project,'Phase3AIntegration.uproject');
 const processApi=require(path.join(repository,'unreal-auto-setup/processes'));
 const before=await processApi.query(filename);if(before.state!=='Stopped')throw new Error('Editor test requires confirmed absence of an existing project Editor');
 const executable='C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor.exe';
 const editor=spawn(executable,[filename,'-NoSplash','-NoSound','-Unattended','-nullrhi','-abslog='+path.join(scratch,'editor.log')],{cwd:project,windowsHide:true,stdio:'ignore',env});
 const editorExit=new Promise((resolve,reject)=>{editor.once('close',resolve);editor.once('error',reject);});
 const record={scratch,editorPid:editor.pid};
 const until=Date.now()+45000;let observed;
 try {
  while(Date.now()<until){observed=await processApi.query(filename);if(observed.matches.some(p=>p.pid===editor.pid))break;if(editor.exitCode!==null)throw new Error('Test Editor exited early');await new Promise(r=>setTimeout(r,100));}
  if(!observed?.matches.some(p=>p.pid===editor.pid))throw new Error('Test Editor identity not established');record.identity=observed.matches.find(p=>p.pid===editor.pid);
  const ownership=require(path.join(repository,'unreal-auto-setup/operationOwnership')).create(path.join(scratch,'store'));
  const supervisor=require(path.join(repository,'unreal-auto-setup/processSupervisor'));
  const claim=await ownership.begin(filename,'build'),encoded=Buffer.from('# Operation '+claim.operationId+'\nStart-Sleep -Seconds 20','utf16le').toString('base64');await claim.spawnAttempted(encoded);
  const child=await supervisor.launch(claim,encoded);const done=new Promise((resolve,reject)=>{child.once('close',resolve);child.once('error',reject);});
  const deadline=Date.now()+10000;
  for(;;){try{await fs.access(path.join(claim.directory,'supervisor-started.json'));break;}catch{}if(Date.now()>deadline)throw new Error('Supervisor startup timeout');await new Promise(r=>setTimeout(r,50));}
  await child.cancel();await done;record.proof=child.proof;await claim.complete();
  const after=await processApi.query(filename);record.editorSurvived=editor.exitCode===null && after.matches.some(p=>p.pid===editor.pid);
  if(!record.editorSurvived)throw new Error('Independent test Editor did not survive job cancellation');
 }finally{
  // Node's ChildProcess retains the handle obtained by this exact spawn. No PID lookup or tree kill.
  if(editor.exitCode===null)editor.kill();record.editorExit=await editorExit;
  await fs.writeFile(path.join(repository,'docs/maintenance/runs/0008-phase3b2b/editor-safety.json'),JSON.stringify(record,null,2));
  if(record.editorSurvived)await fs.rm(scratch,{recursive:true,force:true,maxRetries:10,retryDelay:100});
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
