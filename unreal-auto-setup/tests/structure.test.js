const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const {classFixture}=require('./classHelpers');
const descriptors=require('../descriptors'),templates=require('../moduleTemplates'),creation=require('../creation'),modules=require('../modules');
for(const value of ['',' ','123Bad','Bad/Name','Bad\\Name','Bad-Name','class','CON','Bad__Name','string','ModuleRules']) test('structure name rejects '+JSON.stringify(value),()=>assert.throws(()=>templates.validateName(value)));
test('module API names support letters digits underscores',()=>{assert.equal(templates.validateName('RPGX_Inventory2'),'RPGX_Inventory2');assert.equal(templates.render('root','RPGX_Inventory2').api,'RPGX_INVENTORY2_API');});
for(const type of templates.types) test('module template '+type,()=>{
  const p=templates.render('root','Combat',type,'Public / Private','PostEngineInit');
  assert.equal(p.entry.Type,type);assert.equal(p.entry.LoadingPhase,'PostEngineInit');
  assert.match(p.files[0].text,/public Combat\(ReadOnlyTargetRules Target\) : base\(Target\)/);
  assert.match(p.files[1].text,/COMBAT_API FCombatModule : public IModuleInterface/);
  assert.match(p.files[2].text,/IMPLEMENT_MODULE\(FCombatModule, Combat\)/);
  assert.match(p.files[1].path,/Public/);assert.match(p.files[2].path,/Private/);
  if(type==='Program') assert.doesNotMatch(p.files[0].text,/"Engine"/);
});
test('flat module and invalid enum validation',()=>{const p=templates.render('root','Combat','Runtime','Flat');assert.equal(path.dirname(p.files[1].path),'root');assert.throws(()=>templates.render('root','Combat','Wrong'));assert.throws(()=>templates.render('root','Combat','Runtime','Flat','Wrong'));});
for(const original of ['{}','{\n\t"EngineAssociation": "5.8",\n\t"Plugins": [{"Name":"Other","Enabled":false}],\n\t"Unknown": {"future":true}\n}','{"Modules":[],"Unknown":12}','{"Modules":[{"Name":"Old","Type":"Runtime","Future":7}]}']) test('descriptor append preserves original fields '+original,()=>{
  const before=JSON.parse(original);const text=descriptors.append(original,'Modules',{Name:'Combat',Type:'Runtime',LoadingPhase:'Default'}),after=JSON.parse(text);
  assert.deepEqual(after,{...before,Modules:[...(before.Modules || []),{Name:'Combat',Type:'Runtime',LoadingPhase:'Default'}]});
  if(original.includes('"Unknown": {"future":true}')) assert.ok(text.includes('"Unknown": {"future":true}'));
  assert.throws(()=>descriptors.append(text,'Modules',{Name:'combat'}),/already/);
});
for(const text of ['{bad','[]','{"Modules":42}','{"Modules":[null]}','{"Modules":[],"Modules":[]}']) test('invalid descriptor rejected '+text,()=>assert.throws(()=>descriptors.append(text,'Modules',{Name:'X'})));
test('plugin descriptor is neutral and preserves friendly description through JSON escaping',()=>{
  const p=JSON.parse(templates.pluginDescriptor('Combat','Combat "Tools"','Line\nTwo',templates.render('r','Combat','Editor','Flat','PostDefault')));
  assert.equal(p.FileVersion,3);assert.equal(p.FriendlyName,'Combat "Tools"');assert.equal(p.Description,'Line\nTwo');assert.equal(p.CanContainContent,false);assert.equal(p.EnabledByDefault,true);assert.equal(p.CreatedBy,undefined);assert.equal(p.Modules[0].LoadingPhase,'PostDefault');
});
for(const kind of ['module','plugin']) for(const layout of ['Flat','Public / Private']) test(kind+' creation immediately discovers '+layout,async()=>{
  const f=await classFixture();try {
    const plan=await creation.plan(f.project,{kind,name:'Combat',layout});await creation.commit(plan,f.vscode);
    const module=(await modules.discover(f.root)).find(m=>m.name==='Combat');assert.equal(module.api,'COMBAT_API');assert.equal(module.layout,layout);
    assert.equal(require('../classTemplates').plan(f.project,module,'actor','Pickup').api,'COMBAT_API');
    if(kind==='plugin') {assert.equal(await fs.readFile(f.project.filename,'utf8'),plan.original);assert.equal((await modules.plugins(f.root))[0].name,'Combat');}
    else assert.equal(JSON.parse(await fs.readFile(f.project.filename,'utf8')).Modules[0].Name,'Combat');
  } finally {await f.cleanup();}
});
test('existing modules, Source directories and plugin descriptors collide case-insensitively',async()=>{
  const f=await classFixture();try {
    await assert.rejects(creation.plan(f.project,{name:'gameplay'}),/existing/);
    await fs.mkdir(path.join(f.root,'Source','Combat'));await assert.rejects(creation.plan(f.project,{name:'combat'}),/exists/);
    await fs.mkdir(path.join(f.root,'Plugins','Existing'),{recursive:true});await fs.writeFile(path.join(f.root,'Plugins','Existing','Other.uplugin'),'{"FileVersion":3}');
    await assert.rejects(creation.plan(f.project,{kind:'plugin',name:'existing'}),/exists/);await assert.rejects(creation.plan(f.project,{kind:'plugin',name:'Other'}),/existing/);
  } finally {await f.cleanup();}
});
for(const failure of ['Build.cs','.h','.cpp','descriptor','afterDescriptor']) test('transaction rollback for '+failure,async()=>{
  const f=await classFixture();try {
    const p=await creation.plan(f.project,{name:'Combat'});
    const io={...fs,open:async(filename,flags)=>{
      if(failure!=='descriptor' && failure!=='afterDescriptor' && filename.endsWith(failure)) throw new Error('Injected write failure');return fs.open(filename,flags);
    },rename:async(from,to)=>{if(failure==='descriptor') throw new Error('Injected descriptor failure');return fs.rename(from,to);}};
    await assert.rejects(creation.commit(p,f.vscode,{io,afterDescriptor:async()=>{if(failure==='afterDescriptor') throw new Error('Injected completion failure');}}),/Injected/);
    assert.equal(await fs.readFile(f.project.filename,'utf8'),p.original);await assert.rejects(fs.stat(p.newRoot),{code:'ENOENT'});
    assert.ok((await fs.stat(f.module.buildFile)).isFile());assert.ok(!(await fs.readdir(f.root)).some(n=>n.startsWith('.unreal-descriptor')));
  } finally {await f.cleanup();}
});
test('concurrent user changes are preserved during rollback',async()=>{
  const f=await classFixture();try {
    const p=await creation.plan(f.project,{name:'Combat'});
    await assert.rejects(creation.commit(p,f.vscode,{afterDescriptor:async()=>{await fs.writeFile(f.project.filename,'{"UserEdit":true}');await fs.writeFile(p.files[0].path,'user edit');throw new Error('failure');}}),/Rollback incomplete/);
    assert.equal(await fs.readFile(f.project.filename,'utf8'),'{"UserEdit":true}');assert.equal(await fs.readFile(p.files[0].path,'utf8'),'user edit');
  } finally {await f.cleanup();}
});
test('preflight rejects unsaved, untrusted, changed and symlink destinations',async()=>{
  const f=await classFixture();try {
    const p=await creation.plan(f.project,{name:'Combat'});f.vscode.workspace.isTrusted=false;await assert.rejects(creation.commit(p,f.vscode),/Trust/);f.vscode.workspace.isTrusted=true;
    f.vscode.workspace.textDocuments=[{isDirty:true,uri:{fsPath:f.project.filename}}];await assert.rejects(creation.commit(p,f.vscode),/unsaved/);f.vscode.workspace.textDocuments=[];
    await fs.writeFile(f.project.filename,'{}');await assert.rejects(creation.commit(p,f.vscode),/changed/);await fs.writeFile(f.project.filename,p.original);
    await fs.symlink(f.module.root,p.newRoot,'junction');await assert.rejects(creation.commit(p,f.vscode),/symbolic|exists/);
  } finally {await f.cleanup();}
});

test('partial plugin source write rolls back plugin descriptor and preserves existing content',async()=>{
  const f=await classFixture();try {
    await fs.mkdir(path.join(f.root,'Plugins'),{recursive:true});const keep=path.join(f.root,'Plugins','keep.txt');await fs.writeFile(keep,'keep');
    const p=await creation.plan(f.project,{kind:'plugin',name:'Fresh',moduleName:'FreshCode',layout:'Flat'});
    const io={...fs,open:async(filename,flags)=>{
      const h=await fs.open(filename,flags);if(!filename.endsWith('.cpp')) return h;
      return {stat:()=>h.stat(),close:()=>h.close(),sync:()=>h.sync(),writeFile:async()=>{await h.writeFile('partial');throw new Error('partial failure');}};
    }};
    await assert.rejects(creation.commit(p,f.vscode,{io}),/partial failure/);
    assert.equal(await fs.readFile(keep,'utf8'),'keep');assert.equal(await fs.readFile(f.project.filename,'utf8'),p.original);await assert.rejects(fs.stat(p.newRoot),{code:'ENOENT'});
  } finally {await f.cleanup();}
});
test('plugin module can use a distinct safe name',async()=>{
  const f=await classFixture();try {
    const p=await creation.plan(f.project,{kind:'plugin',name:'Tools',moduleName:'ToolsRuntime'});await creation.commit(p,f.vscode);
    const m=(await modules.discover(f.root)).find(m=>m.name==='ToolsRuntime');assert.equal(m.api,'TOOLSRUNTIME_API');assert.equal(m.plugin,'Tools.uplugin');
  } finally {await f.cleanup();}
});
