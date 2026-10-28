'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const ownership=require('../operationOwnership'),supervisor=require('../processSupervisor');
const {powershell}=require('../processes');
async function waitFor(read) {
  const deadline=Date.now()+15000;
  for(;;){const result=await read();if(result)return result;if(Date.now()>deadline)throw new Error('Barrier timed out');await new Promise(resolve=>setTimeout(resolve,25));}
}
async function exists(file){try{await fs.access(file);return true;}catch{return false;}}
async function fixture(t) {
 const root=await fs.mkdtemp(path.join(require('./testTemp').root(),'supervision-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const project=path.join(root,'Game.uproject');await fs.writeFile(project,'{}');
 const store=ownership.create(path.join(root,'store'));
 async function start(script) {
  const claim=await store.begin(project,'build');
  const encoded=Buffer.from('# Operation '+claim.operationId+'\n'+script,'utf16le').toString('base64');
  await claim.spawnAttempted(encoded);const process=await supervisor.launch(claim,encoded);
  const done=new Promise((resolve,reject)=>{process.on('close',resolve);process.on('error',reject);});
  return {claim,process,done};
 }
 return {root,project,store,start};
}
test('native job retains a root-exited descendant until release; repeated operations clean claims',{skip:process.platform!=='win32',timeout:25000},async t=>{
 const f=await fixture(t),release=path.join(f.root,'release'),ready=path.join(f.root,'ready');
 const executable=path.join(f.root,'TreeFixture.exe');
 assert.ok(executable.startsWith(require('./testTemp').root()+path.sep));
 console.log('Compiled test fixture: '+executable);
 require('node:child_process').execFileSync(path.join(process.env.SystemRoot,'Microsoft.NET/Framework64/v4.0.30319/csc.exe'),['/nologo','/target:exe','/out:'+executable,path.resolve(__dirname,'../../tools/phase3b2b/TreeFixture.cs')]);
 const script="& '"+executable+"' root '"+release+"' '"+ready+"'; exit $LASTEXITCODE";
 const op=await f.start(script);
 try {
  await waitFor(()=>exists(ready));await waitFor(()=>exists(path.join(op.claim.directory,'supervisor-root-exit.json')));
  assert.equal(await exists(path.join(op.claim.directory,'tree-complete.json')),false);
  assert.equal((await f.store.inspect(f.project,{probe:true})).state,'Running');
  await assert.rejects(f.store.begin(f.project,'build'),/Recovery|claim/i);
  await fs.writeFile(release,'go');assert.equal(await op.done,0);
  const result=await f.store.inspect(f.project,{probe:true});assert.equal(result.state,'Clear');assert.equal(result.previous.activeProcesses,0);
  const second=await f.start('exit 0');assert.equal(await second.done,0);await second.claim.complete();
  const failed=await f.start('exit 7');assert.equal(await failed.done,7);await failed.claim.complete();
  const retry=await f.start('exit 0');assert.equal(await retry.done,0);await retry.claim.complete();
  assert.deepEqual(await fs.readdir(path.join(f.root,'store')),[]);
 }finally{await fs.writeFile(release,'cleanup');}
});
test('native cancellation uses private job and permits a subsequent operation',{skip:process.platform!=='win32',timeout:25000},async t=>{
 const f=await fixture(t),op=await f.start('Start-Sleep -Seconds 20');
 await waitFor(()=>exists(path.join(op.claim.directory,'supervisor-started.json')));
 await op.process.cancel();await op.process.cancel();await op.done;
 assert.equal(op.process.proof.cancelled,true);assert.equal(op.process.proof.activeProcesses,0);await op.claim.complete();
 const next=await f.start('exit 0');assert.equal(await next.done,0);await next.claim.complete();
});
test('completion proof binds operation, descriptor, helper and exact launch',{skip:process.platform!=='win32',timeout:15000},async t=>{
 const f=await fixture(t),op=await f.start('exit 0');await op.done;
 const file=path.join(op.claim.directory,'tree-complete.json'),bytes=await fs.readFile(file,'utf8');
 const intent=JSON.parse(await fs.readFile(path.join(op.claim.directory,'intent.json')));
 for(const [key,value] of Object.entries({operationId:'wrong',project:'wrong',helperHash:'wrong',commandHash:'wrong',activeProcesses:1,rootExited:false,containment:'wrong',exitCode:null})) {
  await fs.writeFile(file,JSON.stringify({...JSON.parse(bytes),[key]:value}));await assert.rejects(supervisor.outcome(op.claim.directory,intent));
 }
 await fs.writeFile(file,'{');assert.equal((await f.store.inspect(f.project,{probe:true})).state,'Unknown');
 await fs.writeFile(file,bytes);await op.claim.complete();
});
test('legacy root-exit record remains quarantined and is never promoted to tree completion',async t=>{
 const f=await fixture(t),claim=await f.store.begin(f.project,'build');await claim.spawnAttempted('legacy');await claim.exited(0);
 assert.equal((await f.store.inspect(f.project,{probe:true})).state,'Unknown');await assert.rejects(claim.complete());
});
module.exports={waitFor};

test('native job refuses explicit breakaway',{skip:process.platform!=='win32',timeout:20000},async t=>{
 const f=await fixture(t),executable=path.join(f.root,'TreeFixture.exe');
 require('node:child_process').execFileSync(path.join(process.env.SystemRoot,'Microsoft.NET/Framework64/v4.0.30319/csc.exe'),['/nologo','/target:exe','/out:'+executable,path.resolve(__dirname,'../../tools/phase3b2b/TreeFixture.cs')]);
 const op=await f.start("& '"+executable+"' breakaway '"+path.join(f.root,'release')+"' '"+path.join(f.root,'ready')+"'; exit $LASTEXITCODE");
 assert.equal(await op.done,0);assert.equal(await exists(path.join(f.root,'ready')),false);await op.claim.complete();
});
test('supervisor loss closes the private job but never fabricates durable completion',{skip:process.platform!=='win32',timeout:25000},async t=>{
 const f=await fixture(t),op=await f.start('Start-Sleep -Seconds 20');
 const failed=assert.rejects(op.done,/identity lost|without verified/i);
 await waitFor(()=>exists(path.join(op.claim.directory,'supervisor-started.json')));
 const started=JSON.parse(await fs.readFile(path.join(op.claim.directory,'supervisor-started.json'),'utf8'));
 const helper=(await supervisor.verifyHelper()).executable;
 const script="$p=Get-Process -Id "+started.pid+"; $null=$p.Handle; if($p.StartTime.ToUniversalTime().ToString('o') -ne '"+started.creation+"' -or $p.MainModule.FileName -ne '"+helper+"'){throw 'Wrong test supervisor'}; $p.Kill(); $p.WaitForExit()";
 require('node:child_process').execFileSync(powershell(),['-NoLogo','-NoProfile','-Command',script],{windowsHide:true,timeout:8000});
 await failed;
 await waitFor(async()=>!await ownership.query(started.rootPid));
 assert.equal(await exists(path.join(op.claim.directory,'tree-complete.json')),false);
 assert.equal((await f.store.inspect(f.project,{probe:true})).state,'Unknown');
});
