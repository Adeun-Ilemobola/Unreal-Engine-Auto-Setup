'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
exports.run=async()=>{
 const vscode=require('vscode'),repository=path.resolve(__dirname,'../..'),projectRoot=path.join(repository,'.local-test-projects/Phase3AIntegration'),descriptor=path.join(projectRoot,'Phase3AIntegration.uproject');
 const scratch=process.env.UNREAL_AUTO_SETUP_INTEGRATION_ROOT,events=[];let editor,exit;
 const record={evidenceKind:'Real VS Code debug API and locally installed Microsoft cppvsdbg adapter',events};
 const subscriptions=[];
 const wait=async read=>{const deadline=Date.now()+90000;while(Date.now()<deadline){const value=await read();if(value)return value;await new Promise(r=>setTimeout(r,100));}throw Error('Debug lifecycle barrier timeout');};
 try{
 assert.equal(JSON.parse(await fs.readFile(path.join(projectRoot,'PHASE3A-OWNERSHIP.json'))).repository.toLowerCase(),repository.toLowerCase());
 await vscode.extensions.getExtension('local-tools.unreal-project-tools').activate();
 const cpp=vscode.extensions.getExtension('ms-vscode.cpptools');assert.ok(cpp);await cpp.activate();record.adapterExtension={path:cpp.extensionPath,version:cpp.packageJSON.version};
 const api=require(path.join(repository,'unreal-auto-setup/processes')),debuggerApi=require(path.join(repository,'unreal-auto-setup/debugger'));
 assert.equal((await api.query(descriptor)).state,'Stopped');
 const executable='C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor.exe';
 editor=spawn(executable,[descriptor,'-NoSplash','-NoSound','-Unattended','-nullrhi','-abslog='+path.join(scratch,'editor.log')],{cwd:projectRoot,stdio:'ignore',windowsHide:true});
 exit=new Promise((resolve,reject)=>{editor.once('close',resolve);editor.once('error',reject);});record.editorPid=editor.pid;
 await wait(async()=>{assert.equal(editor.exitCode,null);return (await api.query(descriptor)).matches.find(p=>p.pid===editor.pid);});
 subscriptions.push(vscode.debug.onDidStartDebugSession(s=>events.push({event:'start',id:s.id,type:s.type,configuration:s.configuration})),vscode.debug.onDidTerminateDebugSession(s=>events.push({event:'end',id:s.id})));
 subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory('cppvsdbg',{createDebugAdapterTracker:session=>({onDidSendMessage:message=>{
  if(message.type==='response' && ['attach','disconnect','initialize'].includes(message.command))events.push({event:'adapter-response',id:session.id,command:message.command,success:message.success,message:message.message});
  if(message.type==='event' && ['initialized','process','terminated'].includes(message.event))events.push({event:'adapter-'+message.event,id:session.id,body:message.body});
 }})}));
 for(let iteration=0;iteration<2;iteration++){
  const prior=events.length;await vscode.commands.executeCommand('unrealSetup.attachDebugger');
  const started=await wait(()=>events.slice(prior).find(e=>e.event==='start'&&e.type==='cppvsdbg'&&String(e.configuration.processId)===String(editor.pid)));
  const session=await wait(()=>vscode.debug.activeDebugSession?.id===started.id&&vscode.debug.activeDebugSession);
  assert.equal(session.configuration.request,'attach');
  // Session-start precedes adapter attachment. Require the actual DAP attach response.
  const attached=await wait(()=>events.find(e=>e.id===session.id && e.event==='adapter-response' && e.command==='attach'));
  assert.equal(attached.success,true,attached.message);
  assert.equal(await debuggerApi.detach(vscode,session),true);await wait(()=>events.some(e=>e.event==='end'&&e.id===started.id));
  assert.equal(editor.exitCode,null);assert.ok((await api.query(descriptor)).matches.some(p=>p.pid===editor.pid));
  events.push({event:'editor-survived',iteration,pid:editor.pid});
 }
 assert.equal(vscode.debug.activeDebugSession,undefined);record.status='Passed';
 }catch(error){record.status='Failed';record.error=error.stack;throw error;}
 finally{
  for(const subscription of subscriptions)subscription.dispose();
  // Retained handle from this exact spawn, not a recovered PID.
  if(editor){if(editor.exitCode===null)editor.kill();record.editorExit=await exit;}
  await fs.writeFile(path.join(repository,'docs/maintenance/runs/0013-phase4e-review/real-debugger.json'),JSON.stringify(record,null,2));
  if(record.status==='Passed')await fs.writeFile(path.join(scratch,'completed.json'),'{}');
 }
};
