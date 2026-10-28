const {test}=require('node:test');
const assert=require('node:assert/strict');
const {attach,detach,configuration}=require('../debugger');
const {fakeVSCode}=require('./helpers');
const project={name:'Game.uproject',filename:'C:\\Game\\Game.uproject',folder:{name:'Game'}};
const one={pid:100,executable:'C:\\UE\\UnrealEditor.exe',commandLine:'UnrealEditor.exe C:\\Game\\Game.uproject'};
function service(matches){return {get:async()=>({state:matches.length?'Running':'Stopped',matches})};}
test('one matching Editor starts a dynamic cppvsdbg attach session',async()=>{
  const {vscode}=fakeVSCode('C:\\Game');let config;
  vscode.debug.startDebugging=async(folder,value)=>{assert.equal(folder,project.folder);config=value;return true;};
  assert.equal(await attach(vscode,project,service([one])),true);assert.equal(config.type,'cppvsdbg');assert.equal(config.request,'attach');assert.equal(config.processId,'100');assert.equal(config.preLaunchTask,undefined);
});
test('attach reports no Editor and unavailable C/C++ clearly',async()=>{
  const {vscode}=fakeVSCode('C:\\Game');await assert.rejects(attach(vscode,project,service([])),/Start Unreal Editor/);
  vscode.extensions.getExtension=()=>undefined;await assert.rejects(attach(vscode,project,service([one])),/missing or disabled/);
});
test('multiple Editors use a PID picker and cancelled selection does not attach',async()=>{
  const {vscode,picks}=fakeVSCode('C:\\Game');let pid;
  const two={...one,pid:200};picks.push({process:two});vscode.debug.startDebugging=async(folder,config)=>{pid=config.processId;return true;};
  await attach(vscode,project,service([one,two]));assert.equal(pid,'200');pid=undefined;
  assert.equal(await attach(vscode,project,service([one,two])),false);assert.equal(pid,undefined);
});
test('attach rejects disappeared processes, failed queries and refused debug sessions',async()=>{
  const {vscode}=fakeVSCode('C:\\Game');let reads=0;
  await assert.rejects(attach(vscode,project,{get:async()=>({state:'Running',matches:reads++?[ ]:[one]})}),/disappeared/);
  await assert.rejects(attach(vscode,project,{get:async()=>({state:'Unknown',matches:[]})}),/unavailable/);
  vscode.debug.startDebugging=async()=>false;await assert.rejects(attach(vscode,project,service([one])),/could not start/);
});
test('duplicate attach to same Editor PID is rejected',async()=>{
  const {vscode}=fakeVSCode('C:\\Game');
  vscode.debug.activeDebugSession={name:'Unreal Attach',type:'cppvsdbg',configuration:{processId:'100'}};
  await assert.rejects(attach(vscode,project,service([one])),/already attached/);
});
test('detach refuses unrelated launch sessions',async()=>{
 const {vscode}=fakeVSCode('C:\\Game');let called=false;vscode.debug.stopDebugging=async()=>{called=true;};
 await assert.rejects(detach(vscode,{type:'cppvsdbg',configuration:{request:'launch',name:'Other'}}),/Refusing/);assert.equal(called,false);
});
test('concurrent attaches cannot both dispatch',async()=>{
 const {vscode}=fakeVSCode('C:\\Game');let release,entered;
 const ready=new Promise(r=>entered=r);vscode.debug.startDebugging=async()=>{entered();return new Promise(r=>release=r);};
 const first=attach(vscode,project,service([one]));await ready;await assert.rejects(attach(vscode,project,service([one])),/in progress/);release(true);assert.equal(await first,true);
});
test('detach stops active debug session, leaves editor running, and reattachment succeeds',async()=>{
  const {vscode,events}=fakeVSCode('C:\\Game');let stoppedSession,editorRunning=true;
  const editorService={get:async()=>({state:editorRunning?'Running':'Stopped',matches:editorRunning?[one]:[]})};
  vscode.debug.stopDebugging=async session=>{
    stoppedSession=session;
    vscode.debug.activeDebugSession=undefined;
    events.debugEnd.fire(session);
  };
  vscode.debug.startDebugging=async(folder,config)=>{
    vscode.debug.activeDebugSession={name:config.name,type:config.type,configuration:config};
    events.debugStart.fire(vscode.debug.activeDebugSession);
    return true;
  };
  // 1. Initial attach
  assert.equal(await attach(vscode,project,editorService),true);
  assert.ok(vscode.debug.activeDebugSession);
  assert.equal(vscode.debug.activeDebugSession.configuration.processId,'100');
  // 2. Detach
  assert.equal(await detach(vscode),true);
  assert.equal(stoppedSession.configuration.processId,'100');
  assert.equal(vscode.debug.activeDebugSession,undefined);
  // Editor is still alive and running independently
  assert.equal(editorRunning,true);
  assert.equal((await editorService.get()).state,'Running');
  // 3. Re-attach to the same PID succeeds
  assert.equal(await attach(vscode,project,editorService),true);
  assert.ok(vscode.debug.activeDebugSession);
  assert.equal(vscode.debug.activeDebugSession.configuration.processId,'100');
  // 4. Detach again
  assert.equal(await detach(vscode),true);
  assert.equal(vscode.debug.activeDebugSession,undefined);
  // 5. Detach with no active session returns false
  assert.equal(await detach(vscode),false);
});
