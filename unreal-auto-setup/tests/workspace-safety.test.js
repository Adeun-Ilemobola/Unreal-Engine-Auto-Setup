const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const projects=require('../project'),watchers=require('../runtimeWatcher');
const {fixture,Emitter}=require('./helpers');
function barrier(){let entered,release;return {entered:new Promise(r=>entered=r),wait:()=>{entered();return new Promise(r=>release=r);},release:()=>release()};}
test('workspace switch during reconciliation cannot mutate old coordinator/state',async()=>{
  const a=await fixture(),b=await fixture(),gate=barrier(),switches=[],published=[];let first=true;
  const coordinator={switchProject:p=>switches.push(p),configure(){},mark(){},reconcile(){},snapshot:()=>({})};
  const watcher=watchers.create(a.vscode,a.context,{poll:false,state:require('../runtime').createState(),coordinator,processes:{get:async()=>{if(first){first=false;await gate.wait();}return {state:'Stopped',matches:[]};}}},s=>published.push(s));
  try {
    const pending=watcher.refresh();await gate.entered;
    a.vscode.workspace.workspaceFolders=b.vscode.workspace.workspaceFolders;a.values['unrealEngine.enginePath']=b.root;
    a.events.folders.fire();gate.release();await pending;
    assert.ok(!switches.includes(path.join(a.root,'Game.uproject')),'stale collector must not switch coordinator back to old project');
    assert.equal(published.at(-1).project.root,b.root);
  } finally {for(const d of a.context.subscriptions)d.dispose();await a.cleanup();await b.cleanup();}
});
test('project selection change in the same folder invalidates a pending collection',async()=>{
  const f=await fixture(),gate=barrier(),switches=[],published=[];let first=true;
  await fs.writeFile(path.join(f.root,'Other.uproject'),'{"EngineAssociation":"5.8"}');f.values['unrealEngine.defaultProject']='Game.uproject';
  const watcher=watchers.create(f.vscode,f.context,{poll:false,state:require('../runtime').createState(),coordinator:{switchProject:p=>switches.push(p),configure(){},mark(){},reconcile(){},snapshot:()=>({})},processes:{get:async()=>{if(first){first=false;await gate.wait();}return {state:'Stopped',matches:[]};}}},s=>published.push(s));
  try {const pending=watcher.refresh();await gate.entered;f.values['unrealEngine.defaultProject']='Other.uproject';f.events.configuration.fire();gate.release();await pending;
    assert.ok(!switches.includes(path.join(f.root,'Game.uproject')));assert.equal(published.at(-1).project.name,'Other.uproject');
  }finally {for(const d of f.context.subscriptions)d.dispose();await f.cleanup();}
});
for(const value of [null,[],{Modules:{}},{Plugins:'bad'},{Modules:[null]},{Plugins:[{Name:4}]}]) test('malformed project descriptor '+JSON.stringify(value),async()=>{
  const f=await fixture();try {await fs.writeFile(path.join(f.root,'Game.uproject'),JSON.stringify(value));await assert.rejects(projects.readProject(f.vscode),/descriptor.*(?:object|Modules|Plugins)|(?:Modules|Plugins).*array/i);}
  finally {await f.cleanup();}
});
test('dependency document parse rejection is caught and reported after Build.cs deletion',async()=>{
  const f=await require('./classHelpers').classFixture(),event=new Emitter();
  let reported;const notified=new Promise(resolve=>{reported=resolve;});
  f.vscode.workspace.onDidChangeTextDocument=event.event;
  f.vscode.window.showWarningMessage=message=>reported(message);
  const service=require('../dependencyActions').create(f.vscode,f.context,{state:require('../runtime').createState()});
  try {
    await service.sync({project:f.project,modules:[f.module]});await fs.unlink(f.module.buildFile);
    event.fire({document:{uri:{fsPath:f.module.buildFile}}});
    const message=await notified;assert.match(message,/dependency.*ENOENT|dependency.*no such/i);
  } finally {for(const d of f.context.subscriptions)d.dispose();await f.cleanup();}
});
