const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const parser=require('../buildCsParser'),editor=require('../dependencyEditor'),model=require('../dependencyModel'),diagnostics=require('../dependencyDiagnostics'),indexApi=require('../dependencyIndex');
const {classFixture,addModule}=require('./classHelpers');
const rules=body=>'using UnrealBuildTool;\npublic class Game : ModuleRules { public Game(ReadOnlyTargetRules Target) : base(Target) {\n'+body+'\n} }';
for(const expression of ['PublicDependencyModuleNames.AddRange(new string[] { "Core", "Engine" });','PublicDependencyModuleNames.AddRange(new[] { "Core", "Engine", });','PublicDependencyModuleNames.AddRange(["Core", "Engine"]);','PublicDependencyModuleNames.Add("Core"); PrivateDependencyModuleNames.Add("Engine");','this.PublicDependencyModuleNames.Add("Core"); PrivateDependencyModuleNames.Add("Engine");']) test('parser literal form '+expression,()=>{const p=parser.parse(rules(expression),'Game');assert.equal(p.status,'Editable');assert.deepEqual(p.dependencies.map(d=>d.name),['Core','Engine']);assert.ok(p.dependencies.every(d=>d.start>=0));});
for(const ending of ['\n','\r\n']) for(const indent of ['  ','\t']) test('preserve comments/format '+JSON.stringify([ending,indent]),()=>{
  const text=rules('PublicDependencyModuleNames.AddRange(new string[] {\n'+indent+'"Core", // keep core comment\n'+indent+'"Engine" // keep engine comment\n});').replace(/\n/g,ending);
  const changed=editor.mutate(text,'Game',{name:'Slate',visibility:'Public'}).proposed;
  assert.ok(changed.includes('// keep core comment'));assert.ok(changed.includes('// keep engine comment'));assert.ok(changed.startsWith(text.slice(0,text.indexOf('"Engine"'))));
  assert.deepEqual(parser.parse(changed,'Game').dependencies.map(d=>d.name),['Core','Engine','Slate']);
  if(ending==='\r\n') assert.ok(!changed.replace(/\r\n/g,'').includes('\n'));
});
test('comments and dependency-looking strings do not create dependencies',()=>{
  const p=parser.parse(rules('// PrivateDependencyModuleNames.Add("Fake");\n/* PublicDependencyModuleNames.Add("No"); */\nPublicDependencyModuleNames.Add("Core");'),'Game');assert.deepEqual(p.dependencies.map(d=>d.name),['Core']);
  assert.deepEqual(parser.parse(rules('var text = "PrivateDependencyModuleNames.Add(\\"Fake\\");";'),'Game').dependencies,[]);
  assert.deepEqual(parser.parse(rules('Other.PrivateDependencyModuleNames.Add("Fake");'),'Game').dependencies,[]);
});
for(const body of ['if (Target.bBuildEditor) { PrivateDependencyModuleNames.Add("UnrealEd"); }','var names = new[] { "Core" }; PublicDependencyModuleNames.AddRange(names);','PrivateDependencyModuleNames.Add(GetName());','for(int i=0;i<3;i++) PrivateDependencyModuleNames.Add("Core");','PrivateDependencyModuleNames.Add("Slate" + "Core");','Helper();','PrivateDependencyModuleNames = names;','PublicDependencyModuleNames.Add("Core"); PrivateDependencyModuleNames.Add("Core");']) test('refuses complex '+body,()=>{
  const p=parser.parse(rules(body),'Game');assert.equal(p.status,'Complex / Read Only');assert.throws(()=>editor.mutate(rules(body),'Game',{name:'Engine'}),/Read Only/);
});
test('malformed delimiters and strings refused',()=>{for(const text of ['{','"unterminated','/* unclosed',rules('PrivateDependencyModuleNames.Add("Core");').slice(0,-1)]) assert.equal(parser.parse(text,'Game').status,'Malformed');});
test('using aliases and unsupported class structure are read only',()=>{assert.equal(parser.parse(rules('').replace('using UnrealBuildTool;','using ModuleRules = Evil.Rules;'),'Game').editable,false);assert.equal(parser.parse(rules('').replace('} }','} void Helper() {} }'),'Game').editable,false);});
for(const visibility of ['Public','Private']) test('add/remove/move '+visibility,()=>{
  const original=rules('PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;\n// user-owned comment');
  const added=editor.mutate(original,'Game',{name:'Core',visibility}).proposed;
  assert.equal(parser.parse(added,'Game').dependencies[0].visibility,visibility);assert.ok(added.includes('// user-owned comment'));
  assert.throws(()=>editor.mutate(added,'Game',{name:'Core',visibility}),/already exists/);
  const other=visibility==='Public'?'Private':'Public',moved=editor.mutate(added,'Game',{operation:'move',name:'Core',visibility:other}).proposed;
  assert.deepEqual(parser.parse(moved,'Game').dependencies.map(d=>d.visibility),[other]);
  const removed=editor.mutate(moved,'Game',{operation:'remove',name:'Core'}).proposed;assert.equal(parser.parse(removed,'Game').dependencies.length,0);assert.ok(removed.includes('// user-owned comment'));
});
for(const array of ['"Core"','"Core",','"Core", "Engine"','"Engine", /* comment */ "Core"']) test('remove from AddRange '+array,()=>{
  const text=rules('PublicDependencyModuleNames.AddRange(new string[] { '+array+' });');const p=editor.mutate(text,'Game',{operation:'remove',name:'Core'});assert.ok(p.model.editable);assert.ok(!p.model.dependencies.some(d=>d.name==='Core'));if(array.includes('comment'))assert.ok(p.proposed.includes('/* comment */'));
});
test('read-only categories remain distinct and untouched',()=>{const statement='DynamicallyLoadedModuleNames.Add("Core"); PublicIncludePathModuleNames.Add("Engine"); PrivateIncludePathModuleNames.Add("Slate");';const text=rules(statement);const p=parser.parse(text,'Game');assert.equal(p.dependencies.filter(d=>d.visibility==='Read Only').length,3);assert.ok(editor.mutate(text,'Game',{name:'Projects'}).proposed.includes(statement));});
test('self dependency insertion blocked',()=>assert.throws(()=>editor.mutate(rules(''),'Game',{name:'Game'}),/Self/));
for(const [filename,expected] of [['Public/Foo.h','Public'],['Private/Foo.h','Private'],['Foo.cpp','Private'],['Foo.h','Public']]) test('visibility recommendation '+filename,()=>assert.equal(model.recommendation({root:'root'},path.join('root',filename)).visibility,expected));
test('graph handles cycles, missing modules, duplicates and Runtime to Editor',()=>{
  const list=[{name:'A',buildFile:'a',type:'Runtime'},{name:'B',buildFile:'b',type:'Editor'},{name:'C',buildFile:'c',type:'Runtime'}];
  const models=new Map(list.map((m,i)=>[m.buildFile,parser.parse(rules('PublicDependencyModuleNames.Add("'+['B','C','A'][i]+'");').replace(/Game/g,m.name),m.name)]));
  const graph=model.graph(list,models);assert.equal(graph.edges.length,3);assert.equal(graph.cycles.length,1);assert.ok(graph.warnings.some(w=>w.includes('Runtime -> Editor')));
  assert.ok(model.relationship({...list[0],plugin:'One'},{...list[2],plugin:'Two'}).warning);assert.ok(model.relationship(list[0],list[0]).blocked);
});
test('exact header index avoids basename guessing and caches engine identity',async()=>{
  const f=await classFixture();try {
    await fs.mkdir(path.join(f.module.root,'Public','Nested'),{recursive:true});await fs.writeFile(path.join(f.module.root,'Public','Nested','Thing.h'),'');
    const entries=await indexApi.headers([f.module]);assert.equal(entries[0].key,'Nested/Thing.h');
    let scans=0;const index=indexApi.create({scan:async()=>{scans++;return [f.module];},readHeaders:async()=>entries});
    await index.project([f.module]);assert.equal(index.resolve('Thing.h').length,0);assert.equal(index.resolve('Nested/Thing.h').length,1);assert.equal(index.resolve('unknown.h').length,0);
    await index.engine(f.root);assert.equal(scans,2);await index.engine(f.root);assert.equal(scans,2);assert.match(index.info().status,/cached/);
    await fs.writeFile(path.join(f.root,'Engine','Build','Build.version'),'{"MajorVersion":5,"MinorVersion":8,"PatchVersion":1}');await index.engine(f.root);assert.equal(scans,4);await index.engine(f.root,{force:true});assert.equal(scans,6);index.dispose();
  } finally {await f.cleanup();}
});
test('dependency diagnostics are confident, context-aware and clear when declaration exists',()=>{
  const source={name:'Game',root:path.resolve('Game'),type:'Runtime'},target={name:'Engine',type:'Runtime'};
  const index={resolve:include=>include==='Components/ActorComponent.h'?[{module:target,visibility:'Public'}]:[]};
  const text='// #include "Fake.h"\n#include "Components/ActorComponent.h"\n#include <vector>\n/*\n#include "Components/ActorComponent.h"\n*/';
  const missing=diagnostics.analyze(text,path.join(source.root,'Public','Foo.h'),source,parser.parse(rules(''),'Game'),index);assert.equal(missing.length,1);assert.equal(missing[0].recommendation.visibility,'Public');
  for(const visibility of ['Public','Private']) assert.equal(diagnostics.analyze(text,'Foo.cpp',source,parser.parse(rules(visibility+'DependencyModuleNames.Add("Engine");'),'Game'),index).length,0);
  assert.equal(diagnostics.analyze(text,'Foo.cpp',source,parser.parse(rules('Helper();'),'Game'),index).length,0);
  assert.equal(diagnostics.analyze(text,'Foo.cpp',target,parser.parse(rules(''),'Game'),index).length,0);
});
test('file edit safety rejects dirty, changed and linked Build.cs',async()=>{
  const f=await classFixture();try {
    const original=await fs.readFile(f.module.buildFile,'utf8');await editor.validate(f.project,f.module,f.vscode,original);
    f.vscode.workspace.textDocuments=[{isDirty:true,uri:{fsPath:f.module.buildFile}}];await assert.rejects(editor.validate(f.project,f.module,f.vscode,original),/Save/);f.vscode.workspace.textDocuments=[];
    await fs.appendFile(f.module.buildFile,' ');await assert.rejects(editor.validate(f.project,f.module,f.vscode,original),/changed/);
    const saved=f.module.root+'Saved';await fs.rename(f.module.root,saved);await fs.symlink(saved,f.module.root,'junction');await assert.rejects(editor.validate(f.project,f.module,f.vscode,original),/symbolic/);
  } finally {await f.cleanup();}
});

for(const [names,expectedCycle] of [[['A','B'],true],[['A','A'],true],[['A','Unknown'],false]]) test('graph cycle/missing '+names.join(' to '),()=>{
  const list=[{name:'A',buildFile:'a',ruleText:rules('PublicDependencyModuleNames.Add("'+names[1]+'");').replace(/Game/g,'A')},{name:'B',buildFile:'b',ruleText:rules('PrivateDependencyModuleNames.Add("A");').replace(/Game/g,'B')}];
  const graph=model.graph(list,new Map());assert.equal(graph.cycles.length>0,expectedCycle);if(names[1]==='Unknown')assert.ok(graph.warnings.some(w=>w.includes('not in')));
});
test('graph preserves visibility and warns on duplicate edges',()=>{
  const source={name:'A',buildFile:'a',ruleText:rules('PublicDependencyModuleNames.Add("B"); PrivateDependencyModuleNames.Add("B");').replace(/Game/g,'A')};
  const graph=model.graph([source],new Map(),[source,{name:'B',origin:'engine'}]);assert.deepEqual(graph.edges.map(e=>e.visibility),['Public','Private']);assert.ok(graph.warnings.some(w=>w.includes('duplicate')));
});
test('header ownership includes project plugin and refuses ambiguous exact keys',async()=>{
  const f=await classFixture();try {
    const plan=await require('../creation').plan(f.project,{kind:'plugin',name:'OwnedPlugin'});await require('../creation').commit(plan,f.vscode);
    const list=await require('../modules').discover(f.root);for(const m of list){await fs.mkdir(path.join(m.root,'Public'),{recursive:true});await fs.writeFile(path.join(m.root,'Public','Same.h'),'');}
    const index=indexApi.create();await index.project(list);assert.equal(index.resolve('Same.h').length,2);assert.equal(index.resolve('OwnedPlugin.h')[0].module.origin,'plugin');assert.equal(index.resolve('folder/Same.h').length,0);index.dispose();
  } finally {await f.cleanup();}
});
test('engine cache is not touched by targeted project refresh and no disk cache can be corrupted',async()=>{
  const f=await classFixture();try {
    let scans=0;const index=indexApi.create({scan:async()=>{scans++;return [];},readHeaders:async()=>[]});await index.engine(f.root);await index.project([f.module]);await index.project([f.module]);assert.equal(scans,2);
    index.invalidateEngine();assert.equal(index.info().headers,0);await index.engine(f.root);assert.equal(scans,4);index.dispose();
  } finally {await f.cleanup();}
});
test('class requirements use dependency parser instead of dependency-looking comments',async()=>{
  const f=await classFixture();try {
    f.module.ruleText=f.module.ruleText.replace('"Engine"','"Projects"')+'\n// "Engine"';const p=require('../classTemplates').plan(f.project,f.module,'actor','NewActor');assert.ok(p.dependencyStatus.some(d=>d.name==='Engine' && d.status==='Missing'));
  } finally {await f.cleanup();}
});
