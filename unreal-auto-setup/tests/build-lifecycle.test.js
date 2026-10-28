const {test}=require('node:test');
const assert=require('node:assert/strict');
const build=require('../build');
const {createState}=require('../runtime');
const {fakeVSCode,child}=require('./helpers');
const spec=kind=>({...build.specification('C:\\UE','C:\\Game\\Game.uproject',{target:'GameEditor',platform:'Win64',configuration:'Development'}),kind:kind || 'build'});
function fixture(stop) {
  const f=fakeVSCode('C:\\Game');let process,timer;
  const service=build.createService(f.vscode,f.context,createState(),{
    spawnProcess:()=>process=child(),stopProcess:stop || (()=>Promise.resolve()),
    setTimer:fn=>{timer=fn;return 1;},clearTimer:()=>{timer=undefined;}
  });
  return {...f,service,process:()=>process,timeout:()=>timer?.()};
}
test('completed operations retain a bounded subscription count and release emitters/listeners',async()=>{
  const f=fixture(),count=f.context.subscriptions.length,emitters=[];
  const Base=f.vscode.EventEmitter;f.vscode.EventEmitter=class extends Base {constructor(){super();emitters.push(this);}};
  for(let i=0;i<20;i++) {const op=f.service.run(spec());f.process().emit('close',0);await op.done;}
  assert.equal(f.context.subscriptions.length,count);
  assert.ok(emitters.every(e=>e.listeners.size===0));
  assert.equal(f.process().listenerCount('close'),0);
  assert.equal(f.process().stdout.listenerCount('data'),0);
});
test('terminal creation failure releases the operation gate and emitters',async()=>{
  const f=fixture(),create=f.vscode.window.createTerminal;
  f.vscode.window.createTerminal=()=>{throw new Error('terminal unavailable');};
  assert.equal((await f.service.run(spec()).done).status,'Failed');
  f.vscode.window.createTerminal=create;const next=f.service.run(spec());f.process().emit('close',0);assert.equal((await next.done).success,true);
});
for(const kind of ['build','generation']) test('unacknowledged cancellation blocks '+kind+' until process exit',async()=>{
  const f=fixture(),op=f.service.run(spec(kind));let done=false;op.done.then(()=>done=true);
  const cancel=op.cancel();await Promise.resolve();await Promise.resolve();f.timeout();
  assert.equal((await cancel).state,'Unconfirmed');assert.equal(done,false);
  assert.throws(()=>f.service.run(spec()),/active|termination/i);
  assert.equal(f.service.cancellation().state,'Unconfirmed');
  f.process().emit('close',null);assert.equal((await op.done).status,'Cancelled');
  const next=f.service.run(spec());f.process().emit('close',0);assert.equal((await next.done).success,true);
});
test('failed termination is reported, repeated cancellation is idempotent, later exit releases gate',async()=>{
  let calls=0;const f=fixture(()=>{calls++;return Promise.reject(new Error('Access denied'));});
  const op=f.service.run(spec()),first=op.cancel(),again=op.cancel();assert.equal(first,again);
  assert.equal((await first).state,'Failed');assert.equal(calls,1);assert.ok(f.warnings.some(m=>m.includes('Access denied')));
  assert.throws(()=>f.service.run(spec()),/active|termination/i);
  f.process().emit('close',0);assert.equal((await op.done).status,'Cancelled');
  assert.equal((await op.cancel()).state,'Exited');
});
test('normal cancellation confirms exit and already completed operations do not kill a PID',async()=>{
  let f,calls=0;f=fixture(()=>{calls++;f.process().emit('close',null);});
  const op=f.service.run(spec());assert.equal((await op.cancel()).state,'Exited');await op.done;
  await op.cancel();assert.equal(calls,1);
});
test('service disposal requests termination and prohibits subsequent operations',async()=>{
  const f=fixture(),op=f.service.run(spec());const disposal=f.service.dispose();
  await Promise.resolve();await Promise.resolve();f.timeout();
  await disposal;assert.throws(()=>f.service.run(spec()),/disposed/i);
  f.process().emit('close',null);await op.done;
  assert.equal(f.process().listenerCount('close'),0);
});
test('coordinator remains busy after cancellation timeout and recovers only on child close',async()=>{
  const f=fixture();const coordinator=require('../runtimeCoordinator').create({execute:()=>f.service.run(spec()).done});
  coordinator.switchProject('Game');const running=coordinator.run('build');
  const cancel=f.service.cancel();await Promise.resolve();await Promise.resolve();f.timeout();await cancel;
  assert.equal(coordinator.busy,true);assert.deepEqual(await coordinator.run('build'),{busy:true});
  f.process().emit('close',null);await running;assert.equal(coordinator.busy,false);
  assert.equal(coordinator.snapshot().history[0].status,'Cancelled');coordinator.dispose();
});
test('real Windows cancellation stops only the disposable owned PowerShell tree',{skip:process.platform!=='win32',timeout:15000},async()=>{
  const {spawn}=require('node:child_process');const {powershell}=require('../processes');
  const f=fakeVSCode(process.cwd());let ready,childProcess;
  const started=new Promise(resolve=>{ready=resolve;});
  const service=build.createService(f.vscode,f.context,createState(),{spawnProcess:(...args)=>{
    childProcess=spawn(...args);childProcess.stdout.on('data',data=>{if(String(data).includes('AUDIT_CHILD_READY'))ready();});return childProcess;
  }});
  const op=service.run({kind:'generation',cwd:process.cwd(),executable:powershell(),args:['-NoProfile','-Command',"Write-Output 'AUDIT_CHILD_READY'; Start-Sleep -Seconds 30"]});
  try {await started;assert.equal((await op.cancel()).state,'Exited');assert.equal((await op.done).status,'Cancelled');}
  finally {await service.dispose();}
});
