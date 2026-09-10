const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {scheduler,interval}=require('../runtimeWatcher'),{rows,create:sidebar}=require('../sidebar');
const explorer=require('../explorerClass'),classes=require('../classWizard'),{classFixture}=require('./classHelpers'),{register}=require('../runner');
for(const [value,expected] of [[undefined,30],[0,0],[1,30],[-1,30],[NaN,30],[10,10],[60,60],[4000,30],['10',30]]) test('runtime interval '+String(value),()=>assert.equal(interval(value),expected));
test('watcher config, serial refresh, coalescing, reset and disposal',async()=>{
  let seconds=10,resolve,calls=0,concurrent=0,max=0;const timers=new Map(),published=[];
  const s=scheduler({seconds:()=>seconds,collect:async()=>{calls++;max=Math.max(max,++concurrent);if(calls===1) await new Promise(r=>resolve=r);concurrent--;return {project:{name:'Game'},editor:calls};},publish:value=>published.push(value),setTimer:(fn,ms)=>{timers.set(ms,fn);return ms;},clearTimer:id=>timers.delete(id)});
  const first=s.refresh();s.refresh();resolve();await first;assert.equal(max,1);assert.equal(calls,2);assert.ok(timers.has(10000));
  seconds=0;await s.configure();assert.equal(timers.size,0);seconds=60;await s.configure();assert.ok(timers.has(60000));
  await s.reset();assert.ok(timers.has(60000));s.dispose();assert.equal(timers.size,0);const count=calls;await s.refresh();assert.equal(calls,count);
});
test('watcher never publishes disposed or old-workspace refresh results',async()=>{
  let release,count=0;const seen=[];const s=scheduler({collect:async()=>{const n=++count;if(n===1) await new Promise(r=>release=r);return {project:{name:String(n)}};},publish:x=>seen.push(x),seconds:()=>0});
  const first=s.refresh();s.reset();release();await first;assert.deepEqual(seen.map(x=>x.project.name),['2']);s.dispose();
});
test('no project disables periodic timer, manual refresh still works',async()=>{
  let hasProject=false,timer;const s=scheduler({collect:async()=>hasProject?{project:{}}:{},publish(){},setTimer:(fn,ms)=>{timer=ms;return ms;},clearTimer:()=>{timer=undefined;}});
  await s.refresh();assert.equal(timer,undefined);hasProject=true;await s.refresh();assert.equal(timer,30000);hasProject=false;await s.refresh();assert.equal(timer,undefined);s.dispose();
});
test('sidebar groups configuration, runtime and callable actions; changes fire TreeView event',async()=>{
  const f=await classFixture();try {
    const data={project:f.project,selected:{target:'GameEditor',platform:'Win64',configuration:'DebugGame'},editor:{state:'Running',matches:[{pid:9}]},session:{stale:true,lastBuild:{status:'Succeeded'}}};
    const view=sidebar(f.vscode,f.context);let events=0;view.provider.onDidChangeTreeData(()=>events++);view.update(data);assert.equal(events,1);
    const sections=view.provider.getChildren();assert.deepEqual(sections.map(x=>x.label),['Project','Build Configuration','Runtime','Actions','Creation','Dependencies','Navigation']);
    assert.equal(sections[1].children[2].description,'DebugGame');assert.equal(sections[1].children[0].command.command,'unrealSetup.selectTarget');assert.equal(sections[3].children[1].command.command,'unrealSetup.run');
    assert.equal(sections[2].children[1].description,'9');assert.equal(rows({})[0].description,'No active project');
  } finally {await f.cleanup();}
});
for(const mode of ['success','failure','running']) test('Run '+mode+' uses shared pipeline without duplicate launches',async()=>{
  const f=await classFixture();try {
    const specs=[];const services={poll:false,processes:{get:async()=>({state:mode==='running'?'Running':'Stopped',matches:mode==='running'?[{pid:9}]:[]})},builds:{run:spec=>{specs.push(spec);return {done:Promise.resolve({success:mode==='success',status:mode==='success'?'Succeeded':'Failed'})};}}};
    await register(f.vscode,f.context,()=>{},services);assert.deepEqual(f.buttons.map(b=>b.command),['unrealSetup.build','unrealSetup.run']);
    await f.commands.get('unrealSetup.run')();assert.equal(specs.length,mode==='running'?0:1);assert.equal(f.terminals.length,mode==='success'?1:0);
    if(specs.length) assert.equal(specs[0].target,'GameEditor');
    await f.commands.get('unrealSetup.refresh')();assert.equal(specs.length,mode==='running'?0:1);
  } finally {for(const d of f.context.subscriptions) d.dispose();await f.cleanup();}
});
test('Build, Run and regeneration share operation lock and reveal active terminal',async()=>{
  const f=await classFixture();try {
    let release,count=0,reveals=0;const services={poll:false,processes:{get:async()=>({state:'Stopped',matches:[]})},builds:{reveal:()=>reveals++,run:()=>{count++;return {done:new Promise(r=>release=r)};}}};
    await register(f.vscode,f.context,()=>{},services);const building=f.commands.get('unrealSetup.build')();
    while(!release) await new Promise(r=>setImmediate(r));
    await f.commands.get('unrealSetup.run')();await f.commands.get('unrealSetup.regenerate')();assert.equal(count,1);assert.equal(reveals,2);release({success:false,status:'Failed'});await building;
  } finally {for(const d of f.context.subscriptions) d.dispose();await f.cleanup();}
});
for(const split of [false,true]) for(const area of ['root','nested',...(split?['Public','Private']:[])]) test('Explorer mapping '+split+' '+area,async()=>{
  const f=await classFixture({split});try {
    const folder=area==='root'?f.module.root:area==='nested'?path.join(f.module.root,...(split?['Public']:[]),'Inventory'):path.join(f.module.root,area,'Inventory');
    await fs.mkdir(folder,{recursive:true});const result=await explorer.destination(f.project,{fsPath:folder});assert.equal(result.folder,area==='root'?'':'Inventory');
    if(split && area==='Private') assert.equal(require('../classTemplates').plan(f.project,result.module,'object','Item',result.folder).files[0].path,path.join(f.module.root,'Public','Inventory','Item.h'));
  } finally {await f.cleanup();}
});
test('Explorer rejects generated folders, unrelated paths, files and symlinks; menus enumerate safe folders only',async()=>{
  const f=await classFixture();try {
    for(const name of ['Binaries','Intermediate','Saved','DerivedDataCache']) {const folder=path.join(f.module.root,name);await fs.mkdir(folder);await assert.rejects(explorer.destination(f.project,{fsPath:folder}),/output/);}
    await assert.rejects(explorer.destination(f.project,{fsPath:f.root}),/not inside/);await assert.rejects(explorer.destination(f.project,{fsPath:f.module.buildFile}),/folder/);
    const link=path.join(f.module.root,'Linked');await fs.symlink(f.root,link,'junction');await assert.rejects(explorer.destination(f.project,{fsPath:link}),/symbolic/);
    const folders=await explorer.locations([f.module],f.vscode);assert.ok(folders.includes(f.module.root));assert.ok(!folders.some(p=>p.endsWith('Binaries') || p.endsWith('Linked')));
  } finally {await f.cleanup();}
});
for(const cancel of [true,false]) test('Explorer shared wizard '+(cancel?'cancellation':'creation and collision'),async()=>{
  const f=await classFixture({split:true});try {
    const folder=path.join(f.module.root,'Private','Inventory');await fs.mkdir(folder);let opened=0;
    f.vscode.workspace.openTextDocument=async uri=>({uri});f.vscode.window.showTextDocument=async()=>opened++;
    f.vscode.window.showQuickPick=async items=>{if(items[0].type){assert.equal(items.length,5);return cancel?undefined:items.find(item=>item.type.id==='object');}return items[0];};
    f.vscode.window.showInputBox=async options=>{assert.notEqual(options.title,'Logical subfolder');return 'InventoryItem';};
    f.vscode.window.showInformationMessage=async(text,options)=>options?.modal?'Create Class':undefined;
    const plan=await classes.wizard(f.vscode,f.context,{}, {uri:{fsPath:folder}});
    if(cancel) {assert.equal(plan,undefined);assert.equal(opened,0);} else {assert.equal(opened,1);assert.equal(plan.files[0].path,path.join(f.module.root,'Public','Inventory','InventoryItem.h'));await assert.rejects(classes.wizard(f.vscode,f.context,{}, {uri:{fsPath:folder}}),/already exists/);}
  } finally {await f.cleanup();}
});

test('package contributions use scoped Explorer action, native view and checked keyboard chord',()=>{
  const p=require('../package.json'),c=p.contributes;
  assert.equal(c.keybindings[0].key,'ctrl+k ctrl+alt+n');assert.equal(c.keybindings[0].command,'unrealSetup.newClass');
  assert.ok(c.commands.some(item=>item.command==='unrealSetup.newClass'));assert.ok(c.views.unrealSetup.some(item=>item.id==='unrealSetup.controlCenter'));
  const menu=c.menus['explorer/context'];assert.equal(menu.length,2);assert.match(menu[0].when,/explorerResourceIsFolder.*resourcePath in unrealSetup.classFolders/);
  assert.equal(c.configuration.properties['unrealSetup.runtimeRefreshInterval'].default,30);assert.equal(c.configuration.properties['unrealSetup.autoBuild'],undefined);
});
test('watcher reconciles structural changes and refreshes process state without builds',async()=>{
  const f=await classFixture();try {
    let running=false;const services={poll:false,state:require('../runtime').createState(),processes:{get:async()=>({state:running?'Running':'Stopped',matches:running?[{pid:77}]:[]})}};
    const watcher=require('../runtimeWatcher').create(f.vscode,f.context,services,()=>{});
    await watcher.refresh();assert.equal(watcher.snapshot().editor.state,'Stopped');
    await fs.appendFile(f.module.buildFile,'\n// changed dependency rules\n');running=true;await watcher.refresh();
    assert.equal(watcher.snapshot().editor.state,'Running');assert.equal(watcher.snapshot().session.stale,true);assert.equal(f.terminals.length,0);
    for(const d of f.context.subscriptions) d.dispose();const old=watcher.snapshot();await watcher.refresh();assert.equal(watcher.snapshot(),old);
  } finally {await f.cleanup();}
});

test('transient refresh errors retain fallback reconciliation for a previously valid project',async()=>{
  let fail=false,period;const s=scheduler({collect:async()=>{if(fail) throw new Error('Transient filesystem error');return {project:{}};},publish(){},setTimer:(fn,ms)=>period=ms,clearTimer:()=>period=undefined});
  await s.refresh();fail=true;await s.refresh();assert.equal(period,30000);fail=false;await s.refresh();s.dispose();assert.equal(period,undefined);
});
test('workspace changes replace filesystem watcher and disposal releases it',async()=>{
  const f=await classFixture();try {
    let created=0,disposed=0;const original=f.vscode.workspace.createFileSystemWatcher;
    f.vscode.workspace.createFileSystemWatcher=(...args)=>{created++;const w=original(...args);w.dispose=()=>disposed++;return w;};
    const watcher=require('../runtimeWatcher').create(f.vscode,f.context,{poll:false,state:require('../runtime').createState(),processes:{get:async()=>({state:'Stopped',matches:[]})}},()=>{});
    await watcher.refresh();f.events.folders.fire();await watcher.refresh();assert.equal(created,2);assert.equal(disposed,1);
    for(const d of f.context.subscriptions) d.dispose();assert.equal(disposed,2);
  } finally {await f.cleanup();}
});
