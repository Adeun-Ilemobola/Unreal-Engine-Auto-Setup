'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),project=path.join(root,'.local-test-projects/Phase3AIntegration');
const evidence=path.join(root,'docs/maintenance/runs/0008-phase3b2b');
const scratch=process.env.UNREAL_AUTO_SETUP_INTEGRATION_ROOT;
if(!scratch || !path.resolve(scratch).toLowerCase().startsWith(path.resolve('C:/Dev/Scratch/UnrealAutoSetupTests').toLowerCase()+path.sep))throw new Error('Integration scratch must be explicitly scoped');
const profile=path.join(scratch,'profile');
exports.activate=async context=>{
 const vscode=require('vscode');
 const event=async value=>fs.appendFile(path.join(evidence,'host-events.jsonl'),JSON.stringify({time:new Date().toISOString(),hostPid:process.pid,...value})+'\n');
 try {
 if(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath.toLowerCase()!==project.toLowerCase())throw new Error('Wrong fixture');
 const marker=JSON.parse(await fs.readFile(path.join(project,'PHASE3A-OWNERSHIP.json')));if(marker.repository!==root)throw new Error('Wrong ownership');
 if(!vscode.workspace.isTrusted)throw new Error('Fixture not trusted');
 const api=await vscode.extensions.getExtension('local-tools.unreal-project-tools').activate();
 await event({phase:'activation',vscode:vscode.version,node:process.version});
 const descriptor=path.join(project,'Phase3AIntegration.uproject');
 const store=require(path.join(root,'unreal-auto-setup/operationOwnership')).create(path.join(profile,'User/globalStorage/local-tools.unreal-project-tools/operations-v1'));
 const supervisor=require(path.join(root,'unreal-auto-setup/processSupervisor'));
 const stateFile=path.join(scratch,'stage.json'),release=path.join(scratch,'release'),ready=path.join(scratch,'ready');
 const barrier=async read=>{const deadline=Date.now()+20000;for(;;){const value=await read();if(value)return value;if(Date.now()>deadline)throw new Error('Barrier timeout');await new Promise(resolve=>setTimeout(resolve,50));}};
 const exists=async file=>{try{await fs.access(file);return true;}catch{return false;}};
 let state;try{state=JSON.parse(await fs.readFile(stateFile));}catch{}
 async function build(label){const start=performance.now();const result=await vscode.commands.executeCommand('unrealSetup.build');await api.refresh();const claim=await store.inspect(descriptor,{probe:true});await event({phase:label,result,claim,elapsedMs:performance.now()-start});if(!result?.success || claim.state!=='Clear')throw new Error(label+' failed');}
 if(state?.mode==='ubtReload') {
  const recovered=await store.inspect(descriptor,{probe:true});await event({phase:'real-ubt-reload-recovery',recovered});
  if(recovered.state!=='Clear')await barrier(async()=>{await new Promise(resolve=>setTimeout(resolve,100));return (await store.inspect(descriptor,{probe:true})).state==='Clear';});
  await build('managed-build-after-real-ubt-reload');
  await fs.writeFile(path.join(scratch,'completed.json'),JSON.stringify({complete:true}));
  await event({phase:'finished',storeEntries:await fs.readdir(path.join(profile,'User/globalStorage/local-tools.unreal-project-tools/operations-v1'))});
  await vscode.commands.executeCommand('workbench.action.closeWindow');return;
 }
 if(!state){
  await build('managed-build-1');await build('managed-build-2');
  const executable=path.join(scratch,'TreeFixture.exe');
  cp.execFileSync(path.join(process.env.SystemRoot,'Microsoft.NET/Framework64/v4.0.30319/csc.exe'),['/nologo','/target:exe','/out:'+executable,path.join(root,'tools/phase3b2b/TreeFixture.cs')]);
  const claim=await store.begin(descriptor,'build');
  const script="# Operation "+claim.operationId+"\n& '"+executable+"' root '"+release+"' '"+ready+"'; exit $LASTEXITCODE";
  const encoded=Buffer.from(script,'utf16le').toString('base64');await claim.spawnAttempted(encoded);
  const child=await supervisor.launch(claim,encoded);child.on('error',error=>void event({phase:'supervisor-error',error:error.message}));
  await barrier(()=>exists(ready));await barrier(()=>exists(path.join(claim.directory,'supervisor-root-exit.json')));
  await fs.writeFile(stateFile,JSON.stringify({directory:claim.directory,operationId:claim.operationId}));
  await event({phase:'before-reload',operationId:claim.operationId,rootExited:true,proofExists:await exists(path.join(claim.directory,'tree-complete.json'))});
  child.detach();await vscode.commands.executeCommand('workbench.action.reloadWindow');
 }else{
  const start=performance.now(),active=await store.inspect(descriptor,{probe:true});
  const blocked=await vscode.commands.executeCommand('unrealSetup.build');await event({phase:'recovered-active',active,blocked,elapsedMs:performance.now()-start});
  if(active.state==='Clear'||blocked?.status!=='Blocked')throw new Error('Active work was not blocked');
  await fs.writeFile(release,'release owned descendant');
  await barrier(()=>exists(path.join(state.directory,'tree-complete.json')));
  const complete=await store.inspect(descriptor,{probe:true});await event({phase:'recovered-completion',complete});if(complete.state!=='Clear')throw new Error('Completion not released');
  await build('managed-build-after-reload');
  // Real compiler diagnostic, then repair only this exclusively created fixture file.
  const bad=path.join(project,'Source/Phase3AIntegration/Phase3b2bFailure.cpp'),bytes='#error Phase3B2b controlled compiler failure\n';
  await fs.writeFile(bad,bytes,{flag:'wx'});
  try {const failure=await vscode.commands.executeCommand('unrealSetup.build');await event({phase:'controlled-compile-failure',result:failure});if(failure?.success)throw new Error('Expected compiler failure');}
  finally {if(await fs.readFile(bad,'utf8')===bytes)await fs.unlink(bad);else throw new Error('Fixture changed externally; retained');}
  await build('managed-build-after-failure');
  const running=vscode.commands.executeCommand('unrealSetup.build');running.catch(error=>void event({phase:'reload-build-error',error:error.message}));
  let activeDirectory;
  await barrier(async()=>{const status=await store.inspect(descriptor);if(status.directory && await exists(path.join(status.directory,'supervisor-started.json'))) {activeDirectory=status.directory;return true;}return false;});
  await fs.writeFile(stateFile,JSON.stringify({mode:'ubtReload',directory:activeDirectory}));
  await event({phase:'real-ubt-before-reload',directory:activeDirectory,proofExists:await exists(path.join(activeDirectory,'tree-complete.json'))});
  await vscode.commands.executeCommand('workbench.action.reloadWindow');
 }
 }catch(error){await event({phase:'error',error:error.stack});}
};
