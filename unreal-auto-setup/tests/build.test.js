const {test}=require('node:test');
const assert=require('node:assert/strict');
const build=require('../build');
const {createState}=require('../runtime');
const {fakeVSCode,child}=require('./helpers');
const spec=()=>build.specification('C:\\UE','C:\\Game\\Game.uproject',{target:'GameEditor',platform:'Win64',configuration:'DebugGame'});
test('cancellation during asynchronous supervisor launch waits for verified completion',async()=>{
  const f=fakeVSCode('C:\\Game');let attach,launched,requests=0,released=0;
  const entering=new Promise(resolve=>{launched=resolve;});
  const process=child();process.cancel=async()=>{requests++;};
  const claim={operationId:'test',spawnAttempted:async()=>{},complete:async()=>{released++;},exited:async()=>{throw new Error('Unexpected root-only completion');}};
  const service=build.createService(f.vscode,f.context,createState(),{ownership:{begin:async()=>claim},supervision:{launch:()=>{launched();return new Promise(resolve=>{attach=resolve;});}}});
  const operation=service.run(spec());await entering;
  const cancellation=operation.cancel();assert.equal(service.active,true);
  attach(process);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests,1);assert.equal(released,0);assert.equal(service.active,true);
  process.proof={activeProcesses:0};process.emit('close',1223);
  assert.equal((await operation.done).status,'Cancelled');assert.equal((await cancellation).state,'Exited');assert.equal(released,1);
});
test('managed build streams output, publishes Problems, records failure and clears old diagnostics on retry',async()=>{
  const f=fakeVSCode('C:\\Game'),state=createState(),children=[];
  const service=build.createService(f.vscode,f.context,state,{spawnProcess:()=>{const process=child();children.push(process);return process;}});
  const first=service.run(spec());
  children[0].stdout.emit('data','C:\\Game\\File.cpp(12,3): error C2039: missing');
  children[0].stdout.emit('data',' member\nFull unrelated build output\n');
  children[0].stderr.emit('data','Unable to build while Live Coding is active.\n');
  children[0].emit('close',6);
  const result=await first.done;
  assert.equal(result.success,false);assert.equal(result.exitCode,6);assert.equal(result.configuration,'DebugGame');assert.ok(result.startTime);assert.ok(result.completionTime);
  assert.equal(f.diagnostics.get('C:\\Game\\File.cpp')[0].range.start.line,11);
  assert.equal(f.diagnostics.get('C:\\Game\\File.cpp')[0].range.start.character,2);
  assert.match(f.terminals[0].output,/Full unrelated build output/);assert.equal(f.warnings.length,1);
  const second=service.run(spec());assert.equal(f.diagnostics.size,0);
  children[1].stdout.emit('data','C:\\Game\\Other.h(1): warning C4996: deprecated\n');children[1].emit('close',0);
  assert.equal((await second.done).success,true);assert.equal(state.get(spec().project).lastBuild.exitCode,0);assert.equal(f.diagnostics.size,1);
});
test('cancelled and failed-to-start builds complete with an explicit result',async()=>{
  const f=fakeVSCode('C:\\Game'),state=createState();let process,stopped;
  const service=build.createService(f.vscode,f.context,state,{spawnProcess:()=>{process=child();return process;},stopProcess:pid=>{stopped=pid;process.emit('close',null);}});
  const operation=service.run(spec());operation.cancel();assert.equal((await operation.done).status,'Cancelled');assert.equal(stopped,123);
  const failed=service.run(spec());process.emit('error',new Error('Cannot start'));assert.equal((await failed.done).status,'Failed');
});
test('Skybox and direct builds use the same target/platform/configuration specification',()=>{
  const selected={target:'Game',platform:'Win64',configuration:'Shipping'};
  assert.deepEqual(build.skyboxArguments(selected),{mode:'Build',...selected});
  assert.deepEqual(build.specification('C:\\UE','C:\\Game.uproject',selected).args.slice(0,3),['Game','Win64','Shipping']);
});
test('real managed PowerShell build streams a source error and returns its exit code', {skip:process.platform!=='win32'},async()=>{
  const fs=require('node:fs/promises'),path=require('node:path');const f=await require('./helpers').fixture();
  try {
    await fs.writeFile(path.join(f.root,'Engine','Build','BatchFiles','Build.bat'),'@echo off\r\necho '+path.join(f.root,'Source','Game.cpp')+'(2,4): error C2039: missing member\r\nexit /b 6\r\n');
    const service=build.createService(f.vscode,f.context,createState());
    const result=await service.run(build.specification(f.root,path.join(f.root,'Game.uproject'),{target:'GameEditor',platform:'Win64',configuration:'Development'})).done;
    assert.equal(result.exitCode,6);assert.equal(result.success,false);assert.equal(f.diagnostics.size,1);
    assert.match(f.terminals[0].output,/missing member/);
  } finally {await f.cleanup();}
});
