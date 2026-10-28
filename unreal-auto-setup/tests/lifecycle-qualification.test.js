'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const ownership=require('../operationOwnership'),supervisor=require('../processSupervisor');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
async function wait(read){for(let i=0;i<400;i++){const v=await read();if(v)return v;await new Promise(r=>setTimeout(r,25));}throw new Error('Lifecycle barrier timeout');}
test('bounded native lifecycle measurements and interrupted release',{skip:process.platform!=='win32',timeout:60000},async t=>{
 const root=await fs.mkdtemp(path.join(require('./testTemp').root(),'lifecycle-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const project=path.join(root,'Game.uproject');await fs.writeFile(project,'{}');const store=ownership.create(path.join(root,'store')),samples=[];
 for(let i=0;i<6;i++){
 const start=performance.now(),claim=await store.begin(project,'build'),acquired=performance.now();
 const encoded=Buffer.from('# Operation '+claim.operationId+'\nStart-Sleep -Milliseconds 1800; exit 0','utf16le').toString('base64');await claim.spawnAttempted(encoded);const child=await supervisor.launch(claim,encoded);child.stdout.resume();child.stderr.resume();
 const done=new Promise((resolve,reject)=>{child.once('close',code=>{child.removeListener('error',reject);resolve(code);});child.once('error',reject);});
 const identity=await wait(async()=>{try{return JSON.parse(await fs.readFile(path.join(claim.directory,'supervisor-started.json')));}catch{return false;}}),started=performance.now();
 const script='$p=Get-Process -Id '+identity.pid+'; @{handles=$p.HandleCount;workingSet=$p.WorkingSet64;privateBytes=$p.PrivateMemorySize64;cpuMs=$p.TotalProcessorTime.TotalMilliseconds}|ConvertTo-Json -Compress';
 const output=await promisify(execFile)(require('../processes').powershell(),['-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:5000});
 assert.equal(await done,0);const completed=performance.now();
 if(i===0){await fs.mkdir(path.join(claim.directory,'release-lock'));assert.equal((await store.inspect(project,{probe:true})).state,'Unknown');await assert.rejects(store.begin(project,'build'));await fs.rmdir(path.join(claim.directory,'release-lock'));} // Remove only this test's known injected fault.
 await claim.complete();const released=performance.now();assert.deepEqual(await fs.readdir(path.join(root,'store')),[]);await wait(async()=>!await ownership.query(identity.pid));
 assert.equal(child.listenerCount('close'),0);assert.equal(child.listenerCount('error'),0);
 samples.push({acquisitionMs:acquired-start,startupMs:started-acquired,completionMs:completed-start,releaseMs:released-completed,...JSON.parse(output.stdout)});
 }
 console.log('Lifecycle measurements: '+JSON.stringify(samples));
});
