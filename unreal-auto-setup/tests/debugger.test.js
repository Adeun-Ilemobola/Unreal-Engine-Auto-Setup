const {test}=require('node:test');
const assert=require('node:assert/strict');
const {attach}=require('../debugger');
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
