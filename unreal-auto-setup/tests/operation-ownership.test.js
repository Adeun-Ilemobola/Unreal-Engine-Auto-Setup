'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const ownership=require('../operationOwnership');
async function fixture(t) {
 const root=await fs.mkdtemp(path.join(require('./testTemp').root(),'ownership-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const project=path.join(root,'Game.uproject');await fs.writeFile(project,'{}');
 return {root,project,store:ownership.create(root)};
}
test('reload before spawn retains intent and blocks a second window',async t=>{
 const f=await fixture(t);await f.store.begin(f.project,'build');
 const recovered=await ownership.create(f.root).inspect(f.project);
 assert.equal(recovered.state,'Unknown');
 await assert.rejects(ownership.create(f.root).begin(f.project,'build'),/recovery|claim/i);
});
test('only the original owner can release positively unspawned work',async t=>{
 const f=await fixture(t),claim=await f.store.begin(f.project,'build');
 await claim.abandonBeforeSpawn();assert.equal((await f.store.inspect(f.project)).state,'Clear');
 const next=await f.store.begin(f.project,'build');await next.spawnAttempted('encoded-command');
 await assert.rejects(next.abandonBeforeSpawn(),/spawn/i);
});
test('wrapper exit, cancellation and old age never certify tree completion',async t=>{
 const f=await fixture(t),claim=await f.store.begin(f.project,'build');
 await claim.spawnAttempted('tag');await claim.exited(0);
 assert.equal((await ownership.create(f.root).inspect(f.project)).state,'Unknown');
 await assert.rejects(f.store.begin(f.project,'generation'),/recovery|claim/i);
});
test('corrupt, missing and partial intent fail closed; unrelated projects remain clear',async t=>{
 const f=await fixture(t),claim=await f.store.begin(f.project,'generation');
 for(const bytes of ['{','{}',JSON.stringify({schema:999})]) {
 await fs.writeFile(path.join(claim.directory,'intent.json'),bytes);
 assert.equal((await f.store.inspect(f.project)).state,'Unknown');
 }
 await fs.unlink(path.join(claim.directory,'intent.json'));
 assert.equal((await f.store.inspect(f.project)).state,'Unknown');
 const other=path.join(f.root,'Other.uproject');await fs.writeFile(other,'{}');
 assert.equal((await f.store.inspect(other)).state,'Clear');
});
test('concurrent claim acquisition has one winner without sleeps',async t=>{
 const f=await fixture(t);const results=await Promise.allSettled(Array.from({length:8},()=>ownership.create(f.root).begin(f.project,'build')));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
});
const expected={pid:10,creation:'2026-10-28T01:00:00Z',executable:'C:\\Windows\\powershell.exe',command:'exact nonce project command'};
test('identity requires all evidence and never treats absence as completion',()=>{
 assert.equal(ownership.classify(expected,expected),'Observed active');
 for(const field of Object.keys(expected)) {
 assert.equal(ownership.classify(expected,{...expected,[field]:field==='pid'?11:'wrong'}),'Unknown');
 assert.equal(ownership.classify(expected,{...expected,[field]:undefined}),'Unknown');
 }
 assert.equal(ownership.classify(expected,null),'Unknown');
});

test('bounded repeated unspawned operations clean up without accumulating history',async t=>{
 const f=await fixture(t);
 for(let i=0;i<25;i++) await (await f.store.begin(f.project,'build')).abandonBeforeSpawn();
 assert.deepEqual(await fs.readdir(f.root).then(items=>items.filter(name=>name!== 'Game.uproject')),[]);
});
test('active identity is observation only; recovered process is never granted termination authority',async t=>{
 const f=await fixture(t),store=ownership.create(f.root,{queryProcess:async()=>expected});
 const claim=await store.begin(f.project,'build');
 await fs.writeFile(path.join(claim.directory,'identity.json'),JSON.stringify(expected));
 const recovered=await store.inspect(f.project,{probe:true});
 assert.equal(recovered.observation,'Observed active');assert.equal(recovered.state,'Unknown');assert.equal(store.cancel,undefined);
});
test('oversized records and inaccessible identity do not unblock operations',async t=>{
 const f=await fixture(t),claim=await f.store.begin(f.project,'build');
 await fs.writeFile(path.join(claim.directory,'intent.json'),' '.repeat(32769));
 assert.equal((await f.store.inspect(f.project,{probe:true})).state,'Unknown');
});
test('managed adapter persists intent before spawn and retains quarantine after root close',async t=>{
 const f=await fixture(t),{fakeVSCode,child}=require('./helpers'),build=require('../build');
 const ui=fakeVSCode(f.root);let childProcess,spawned;
 const ready=new Promise(resolve=>{spawned=resolve;});
 const service=build.createService(ui.vscode,ui.context,require('../runtime').createState(),{ownership:f.store,spawnProcess:()=>{childProcess=child();spawned();return childProcess;},stopProcess:async()=>{}});
 const spec={kind:'build',project:f.project,cwd:f.root,executable:'tool.exe',args:[],target:'Game'};
 const operation=service.run(spec);await ready;
 assert.equal((await f.store.inspect(f.project)).state,'Unknown');
 childProcess.emit('close',0);assert.equal((await operation.done).success,true);
 const blocked=service.run(spec);assert.equal((await blocked.done).success,false);
 assert.equal((await f.store.inspect(f.project)).state,'Unknown');
 await service.dispose();
});
