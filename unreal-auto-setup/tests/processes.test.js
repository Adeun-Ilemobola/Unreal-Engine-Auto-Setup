const {test}=require('node:test');
const assert=require('node:assert/strict');
const {associate,query,createService}=require('../processes');
const project='C:\\Projects\\My Game\\MyGame.uproject';
const record=(pid,filename=project)=>({ProcessId:pid,Name:'UnrealEditor.exe',ExecutablePath:'C:\\UE\\UnrealEditor.exe',CommandLine:'"C:\\UE\\UnrealEditor.exe" "'+filename+'" -log'});
test('no Unreal Editor process reports Stopped',()=>assert.equal(associate([],project).state,'Stopped'));
test('matches an exact project path including spaces and case differences',()=>{const result=associate([record(10,project.toUpperCase())],project);assert.equal(result.state,'Running');assert.equal(result.matches[0].pid,10);});
test('ignores unrelated projects and substring lookalikes',()=>{assert.equal(associate([record(10,'C:\\Other\\MyGame.uproject'),record(11,project+'.uproject')],project).matches.length,0);});
test('retains multiple matching processes and supports -project arguments',()=>{const second=record(11);second.CommandLine='UnrealEditor.exe -project="'+project+'"';assert.deepEqual(associate([record(10),second],project).matches.map(item=>item.pid),[10,11]);});
test('unavailable and malformed process data yields Unknown, not a false Stopped result',async()=>{
  for(const records of [[null],[{ProcessId:1,CommandLine:null}],[{ProcessId:1,CommandLine:'"unterminated'}],[record(1,'relative.uproject')]]) assert.equal(associate(records,project).state,'Unknown');
  for(const execute of [async()=>{throw new Error('Access denied');},async()=>({stdout:'invalid'}),async()=>({stdout:'{}'})]) assert.equal((await query(project,{execute})).state,'Unknown');
});
test('process service reuses short-lived reads but explicit actions refresh',async()=>{
  let calls=0;const service=createService(async()=>{calls++;return associate([],project);});
  await Promise.all([service.get(project),service.get(project)]);assert.equal(calls,1);
  await service.get(project);assert.equal(calls,1);await service.get(project,{fresh:true});assert.equal(calls,2);
});
