'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const repository=path.resolve(__dirname,'../..'),project=path.join(repository,'.local-test-projects/Phase3AIntegration');
exports.activate=async context=>{
 const vscode=require('vscode'),scratch=process.env.UNREAL_AUTO_SETUP_INTEGRATION_ROOT,role=process.env.UNREAL_AUTO_SETUP_ROLE;
 const event=async data=>fs.appendFile(path.join(repository,'docs/maintenance/runs/0009-phase3b2c/cross-window.jsonl'),JSON.stringify({time:new Date().toISOString(),pid:process.pid,role,...data})+'\n');
 try{
 if(!scratch || !['a','b'].includes(role) || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath.toLowerCase()!==project.toLowerCase())throw new Error('Wrong test context');
 const ownership=require(path.join(repository,'unreal-auto-setup/operationOwnership')).create(path.join(scratch,'shared-store'));
 const build=require(path.join(repository,'unreal-auto-setup/build'));
 const service=build.createService(vscode,context,require(path.join(repository,'unreal-auto-setup/runtime')).createState(),{ownership,supervision:require(path.join(repository,'unreal-auto-setup/processSupervisor'))});
 const descriptor=path.join(project,'Phase3AIntegration.uproject'),other=path.join(scratch,'Other.uproject');
 const spec={kind:'generation',project:descriptor,cwd:project,executable:path.join(scratch,'TreeFixture.exe'),args:['child',path.join(scratch,'release'),path.join(scratch,'ready')]};
 const wait=async file=>{const until=Date.now()+25000;while(Date.now()<until){try{await fs.access(path.join(scratch,file));return;}catch{}await new Promise(resolve=>setTimeout(resolve,50));}throw new Error('Barrier timeout '+file);};
 if(role==='a'){
  const op=service.run(spec);await wait('ready');await fs.writeFile(path.join(scratch,'held'),'a');await event({phase:'holding',claim:await ownership.inspect(descriptor,{probe:true})});
  await wait('b-tried');await fs.writeFile(path.join(scratch,'release'),'release owned job');const result=await op.done;await event({phase:'released',result,claim:await ownership.inspect(descriptor,{probe:true})});
  if(!result.success)throw new Error('A failed');await fs.writeFile(path.join(scratch,'b-go'),'go');await wait('b-done');
 }else{
  await wait('held');const blocked=await service.run(spec).done;await event({phase:'blocked',blocked});if(blocked.success)throw new Error('Overlap admitted');
  const independent=await service.run({...spec,project:other,executable:require(path.join(repository,'unreal-auto-setup/processes')).powershell(),args:['-NoProfile','-Command','exit 0']}).done;await event({phase:'other-project',independent});if(!independent.success)throw new Error('Independent project blocked');
  await fs.writeFile(path.join(scratch,'b-tried'),'tried');await wait('b-go');
  const retry=await service.run({...spec,executable:require(path.join(repository,'unreal-auto-setup/processes')).powershell(),args:['-NoProfile','-Command','exit 0']}).done;await event({phase:'retry',retry,claim:await ownership.inspect(descriptor,{probe:true})});if(!retry.success)throw new Error('Retry failed');await fs.writeFile(path.join(scratch,'b-done'),'done');
 }
 await event({phase:'finished'});await fs.writeFile(path.join(scratch,'completed-'+role),'done');await vscode.commands.executeCommand('workbench.action.closeWindow');
 }catch(error){await event({phase:'error',error:error.stack});}
};
