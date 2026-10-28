'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{promisify}=require('node:util'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),project=path.join(root,'.local-test-projects/Phase3AIntegration'),descriptor=path.join(project,'Phase3AIntegration.uproject');
exports.activate=async()=>{
 const vscode=require('vscode'),scratch=process.env.UNREAL_AUTO_SETUP_INTEGRATION_ROOT;
 const event=async value=>fs.appendFile(path.join(root,'docs/maintenance/runs/0009-phase3b2c/installed-host.jsonl'),JSON.stringify({time:new Date().toISOString(),hostPid:process.pid,...value})+'\n');
 try {
 assert.equal(JSON.parse(await fs.readFile(path.join(project,'PHASE3A-OWNERSHIP.json'))).repository,root);
 const extension=vscode.extensions.getExtension('local-tools.unreal-project-tools');assert.ok(extension.extensionPath.toLowerCase().startsWith(path.join(scratch,'extensions').toLowerCase()));
 const api=await extension.activate(),load=name=>require(path.join(extension.extensionPath,name));
 const helper=await load('processSupervisor').verifyHelper(),processes=load('processes');
 const store=load('operationOwnership').create(path.join(scratch,'profile/User/globalStorage/local-tools.unreal-project-tools/operations-v1'));
 const discovered=await load('project').readProject(vscode,{interactive:false});assert.equal(discovered.filename.toLowerCase(),descriptor.toLowerCase());
 await event({phase:'activated',extensionPath:extension.extensionPath,version:extension.packageJSON.version,helper,project:discovered.filename,engineAssociation:discovered.association,vscode:vscode.version});
 assert.equal((await processes.query(descriptor)).state,'Stopped');
 async function build(command,label){const result=await vscode.commands.executeCommand(command);const claim=await store.inspect(descriptor,{probe:true});await event({phase:label,result,claim,diagnostics:vscode.languages.getDiagnostics().map(([uri,items])=>({file:uri.fsPath,count:items.length}))});assert.equal(result?.success,true);assert.equal(result.target,'Phase3AIntegrationEditor');assert.equal(claim.state,'Clear');}
 if(await fs.access(path.join(scratch,'resume-after-close')).then(()=>true,()=>false)) {
  await event({phase:'verified-editor-stopped-on-resume'});await build('unrealSetup.build','after-editor-close');
  await fs.writeFile(path.join(scratch,'completed.json'),'{}');await event({phase:'finished'});await vscode.commands.executeCommand('workbench.action.closeWindow');return;
 }
 await build('unrealSetup.build','first-build');await build('unrealSetup.build','second-build');
 const launchTime=Date.now();await build('unrealSetup.buildAndRun','build-and-run');
 let editor;const deadline=Date.now()+60000;
 while(Date.now()<deadline){const found=await processes.query(descriptor);if(found.matches.length===1){editor=found.matches[0];break;}await new Promise(r=>setTimeout(r,500));}
 assert.ok(editor,'Editor did not launch');
 const identity=await load('operationOwnership').query(editor.pid);assert.ok(Date.parse(identity.creation)>=launchTime-2000);assert.equal(identity.executable.toLowerCase(),editor.executable.toLowerCase());
 await event({phase:'editor-launched',editor,identity});
 await api.refresh();const reused=await vscode.commands.executeCommand('unrealSetup.run');assert.equal(reused?.status,'Reused');
 const blocked=await vscode.commands.executeCommand('unrealSetup.build');assert.equal(blocked?.status,'Blocked');
 assert.equal((await processes.query(descriptor)).matches[0].pid,editor.pid);await event({phase:'reuse-and-guard',reused,blocked,editorPid:editor.pid});
 // Open and retain a handle before validating identity and closing this test's Editor.
 const quote=s=>"'"+s.replace(/'/g,"''")+"'";
 const script="$ErrorActionPreference='Stop'; $p=[Diagnostics.Process]::GetProcessById("+editor.pid+"); $h=$p.Handle; if([Math]::Abs($p.StartTime.ToUniversalTime().Ticks - [DateTime]::Parse("+quote(identity.creation)+").ToUniversalTime().Ticks) -gt 9 -or $p.MainModule.FileName -ne "+quote(identity.executable)+"){throw 'Editor identity changed'}; if(!$p.CloseMainWindow()){throw 'Editor has no closeable main window'}; if(!$p.WaitForExit(30000)){throw 'Owned Editor did not close'}; $p.Dispose()";
 await promisify(cp.execFile)(processes.powershell(),['-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:40000});
 assert.equal((await processes.query(descriptor)).state,'Stopped');await event({phase:'editor-closed'});
 await build('unrealSetup.build','after-editor-close');
 await fs.writeFile(path.join(scratch,'completed.json'),'{}');await event({phase:'finished'});await vscode.commands.executeCommand('workbench.action.closeWindow');
 }catch(error){await event({phase:'error',error:error.stack});}
};
