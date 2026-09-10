const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const editor=require('../dependencyEditor'),parser=require('../buildCsParser'),actions=require('../dependencyActions'),diags=require('../dependencyDiagnostics');
const {classFixture,addModule}=require('./classHelpers');
async function harness() {
  const f=await classFixture();let text=await fs.readFile(f.module.buildFile,'utf8');
  const uri={fsPath:f.module.buildFile,scheme:'file',toString(){return this.fsPath;}};
  const positionAt=offset=>{const lines=text.slice(0,offset).split('\n');return {line:lines.length-1,character:lines.at(-1).length};};
  const offsetAt=p=>text.split('\n').slice(0,p.line).reduce((n,l)=>n+l.length+1,0)+p.character;
  f.doc={uri,isDirty:false,getText:()=>text,positionAt};f.vscode.workspace.textDocuments=[f.doc];
  f.vscode.Range=class {constructor(start,end){this.start=start;this.end=end;}};
  f.vscode.WorkspaceEdit=class {constructor(){this.edits=[];}replace(uri,range,text){this.edits.push({range,text});}};
  f.vscode.workspace.openTextDocument=async()=>f.doc;f.vscode.window.showTextDocument=async()=>{};
  f.vscode.workspace.applyEdit=async edit=>{const changes=edit.edits.map(e=>({start:offsetAt(e.range.start),end:offsetAt(e.range.end),text:e.text})).sort((a,b)=>b.start-a.start || b.end-a.end);for(const e of changes)text=text.slice(0,e.start)+e.text+text.slice(e.end);f.doc.isDirty=true;return true;};
  f.text=()=>text;f.setText=value=>{text=value;};return f;
}
test('WorkspaceEdit uses minimal edits, leaves disk unchanged and supports editor-owned undo state',async()=>{
  const f=await harness();try {const original=f.text(),proposal=editor.mutate(original,f.module.name,{name:'Slate'});await editor.apply(f.vscode,f.project,f.module,proposal);assert.equal(f.text(),proposal.proposed);assert.equal(f.doc.isDirty,true);assert.equal(await fs.readFile(f.module.buildFile,'utf8'),original);} finally {await f.cleanup();}
});
test('rejected WorkspaceEdit leaves editor and disk unchanged',async()=>{
  const f=await harness();try {const original=f.text(),proposal=editor.mutate(original,f.module.name,{name:'Slate'});f.vscode.workspace.applyEdit=async()=>false;await assert.rejects(editor.apply(f.vscode,f.project,f.module,proposal),/refused/);assert.equal(f.text(),original);assert.equal(await fs.readFile(f.module.buildFile,'utf8'),original);} finally {await f.cleanup();}
});
for(const apply of [false,true]) test('shared action native diff then '+(apply?'confirmed edit':'cancellation'),async()=>{
  const f=await harness();try {
    await addModule(f.root,'TargetModule');const target=(await require('../modules').discover(f.root)).find(m=>m.name==='TargetModule');
    f.vscode.Uri.parse=value=>({toString:()=>value});let diffs=0;f.vscode.commands.executeCommand=async command=>{if(command==='vscode.diff')diffs++;};f.vscode.window.showInformationMessage=async(text,options)=>options?.modal?(apply?'Apply':undefined):undefined;
    const state=require('../runtime').createState(),service=actions.create(f.vscode,f.context,{state,refresh:async()=>{}});
    const original=f.text();await service.change(f.module,target,'add','Private');assert.equal(diffs,1);assert.equal(f.text()!==original,apply);assert.equal(!!state.peek(f.project.filename)?.stale,apply);
    for(const d of f.context.subscriptions)d.dispose();
  } finally {await f.cleanup();}
});
for(const complex of [false,true]) test('dependency diagnostic Quick Fix support '+!complex,async()=>{
  const f=await classFixture();try {
    const filename=path.join(f.module.root,'Public','Foo.h'),uri={scheme:'file',fsPath:filename,toString:()=>filename};
    const sourceText='#include "Target.h"',target={name:'Target',root:'target',buildFile:'target/Target.Build.cs',type:'Runtime'};
    let rules=f.module.ruleText+(complex?'\n// no effect':'');if(complex) rules=rules.replace('PublicDependencyModuleNames.AddRange','Helper(); PublicDependencyModuleNames.AddRange');
    f.vscode.workspace.textDocuments=[{uri,getText:()=>sourceText}];f.vscode.CodeAction=class {constructor(title,kind){this.title=title;this.kind=kind;}};f.vscode.CodeActionKind={QuickFix:'quickfix'};
    f.vscode.languages.registerCodeActionsProvider=()=>({dispose(){}});f.vscode.DiagnosticSeverity.Information=2;
    const service={containing:()=>({...f.module,type:'Runtime'}),parsed:async()=>parser.parse(rules,f.module.name),index:{resolve:()=>[{module:target,visibility:'Public'}]}};
    const api=diags.register(f.vscode,f.context,service);await api.refreshNow();const fixes=api.provider.provideCodeActions({uri},{start:{line:0},end:{line:0}});
    assert.equal(fixes.length,complex?0:2);if(!complex){assert.match(fixes[0].title,/Public/);assert.equal(fixes[0].command.command,'unrealSetup.applyDependency');assert.equal(fixes[1].command.arguments[0].visibility,'Private');rules=rules.replace('"Core",','"Target", "Core",');await api.refreshNow();assert.equal(api.provider.provideCodeActions({uri},{start:{line:0},end:{line:0}}).length,0);}
    for(const d of f.context.subscriptions)d.dispose();
  } finally {await f.cleanup();}
});
test('generated project and plugin module Build.cs are editable immediately',async()=>{
  const f=await classFixture();try {for(const kind of ['module','plugin']){const p=await require('../creation').plan(f.project,{kind,name:kind==='module'?'Generated':'Plugin'});await require('../creation').commit(p,f.vscode);assert.equal(parser.parse(await fs.readFile(p.module.files[0].path,'utf8'),p.module.name).editable,true);}} finally {await f.cleanup();}
});
test('dependency sidebar groups warnings, visibility and module-targeted commands',()=>{
  const module={name:'Game',buildFile:'Game.Build.cs'},parsed=parser.parse('using UnrealBuildTool; public class Game : ModuleRules { public Game(ReadOnlyTargetRules Target) : base(Target) { PublicDependencyModuleNames.Add("Core"); } }','Game');
  const rows=require('../sidebar').rows({project:{name:'Game',descriptor:{}},module,dependencies:{module:'Game',buildFile:module.buildFile,parsed,index:{status:'Ready'},warnings:['Cycle warning']}});const node=rows.find(r=>r.label==='Dependencies');
  assert.equal(node.children.find(r=>r.label==='Public Dependencies').children[0].label,'Core');assert.equal(node.children.find(r=>r.label==='Warnings').children.length,1);assert.equal(node.children.find(r=>r.label==='Add Dependency').command.arguments[0].fsPath,module.buildFile);
});
test('raw strings and ambiguous include ownership do not produce diagnostics',()=>{
  const text='auto x=R"tag(hello " world\n#include "Wrong.h"\n)tag";\n#include "Real.h"';assert.deepEqual(diags.includes(text).map(i=>i.include),['Real.h']);
  const parsed=parser.parse('using UnrealBuildTool; public class Game : ModuleRules { public Game(ReadOnlyTargetRules Target) : base(Target) {} }','Game');assert.equal(diags.analyze('#include "Real.h"','Foo.cpp',{name:'Game'},parsed,{resolve:()=>[{module:{name:'One'}},{module:{name:'Two'}}]}).length,0);
});

test('Public to Private action warns about known exposed-header usage and confirms the move',async()=>{
  const f=await harness();try {
    await addModule(f.root,'TargetModule',{split:true});const list=await require('../modules').discover(f.root),target=list.find(m=>m.name==='TargetModule');
    await fs.writeFile(path.join(target.root,'Public','Target.h'),'');await fs.mkdir(path.join(f.module.root,'Public'));await fs.writeFile(path.join(f.module.root,'Public','API.h'),'#include "Target.h"');
    const original=f.text().replace('"Core",','"TargetModule", "Core",');await fs.writeFile(f.module.buildFile,original);f.setText(original);
    f.vscode.Uri.parse=value=>({toString:()=>value});f.vscode.commands.executeCommand=async()=>{};let warning='';f.vscode.window.showInformationMessage=async(text,options)=>{if(options?.modal){warning=options.detail;return 'Apply';}};
    const service=actions.create(f.vscode,f.context,{state:require('../runtime').createState(),refresh:async()=>{}});await service.index.project(list);await service.change(f.module,target,'move','Private');
    assert.match(warning,/Downgrading Public to Private/);assert.match(warning,/API.h/);assert.deepEqual(parser.parse(f.text(),f.module.name).dependencies.filter(d=>d.name==='TargetModule').map(d=>d.visibility),['Private']);for(const d of f.context.subscriptions)d.dispose();
  } finally {await f.cleanup();}
});

test('dependency preview rechecks project/module relationship changes before applying',async()=>{
  const f=await harness();try {
    await addModule(f.root,'TargetModule');const target=(await require('../modules').discover(f.root)).find(m=>m.name==='TargetModule');
    const descriptor={EngineAssociation:'5.8',Modules:[{Name:'Gameplay',Type:'Runtime'},{Name:'TargetModule',Type:'Runtime'}]};await fs.writeFile(f.project.filename,JSON.stringify(descriptor));
    f.vscode.Uri.parse=value=>({toString:()=>value});f.vscode.commands.executeCommand=async()=>{};f.vscode.window.showInformationMessage=async(text,options)=>{if(options?.modal){descriptor.Modules[1].Type='Editor';await fs.writeFile(f.project.filename,JSON.stringify(descriptor));return 'Apply';}};
    const original=f.text(),service=actions.create(f.vscode,f.context,{state:require('../runtime').createState(),refresh:async()=>{}});
    await assert.rejects(service.change(f.module,target,'add','Private'),/Runtime -> Editor/);assert.equal(f.text(),original);for(const d of f.context.subscriptions)d.dispose();
  } finally {await f.cleanup();}
});
