const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {wizard,navigate}=require('../classWizard');
const {classFixture,addModule}=require('./classHelpers');
const {createState}=require('../runtime');
async function harness({cancel,split=true,multiple=false}={}) {
  const f=await classFixture({split});if(multiple || cancel==='module') await addModule(f.root,'Second');
  if(cancel==='project') await fs.writeFile(path.join(f.root,'Second.uproject'),'{"EngineAssociation":"5.8"}');
  f.opened=[];f.stages=[];f.details=[];
  f.vscode.ViewColumn={Beside:-2};
  f.vscode.workspace.openTextDocument=async uri=>({uri,text:await fs.readFile(uri.fsPath,'utf8')});
  f.vscode.window.showTextDocument=async(document,options)=>{f.opened.push({document,options});};
  f.vscode.window.showQuickPick=async choices=>{
    const stage=typeof choices[0]==='string'?'project':choices[0].module?'module':choices[0].type?'type':'exposure';f.stages.push(stage);
    if(cancel===stage) return undefined;
    return stage==='type'?choices.find(item=>item.type.id==='actorComponent'):stage==='exposure'?choices.find(item=>item.mode==='blueprintable'):choices[0];
  };
  f.vscode.window.showInputBox=async options=>{
    const stage=options.title==='Logical subfolder'?'folder':'name';f.stages.push(stage);
    return cancel===stage?undefined:stage==='name'?'InventoryComponent':'Systems';
  };
  f.vscode.window.showInformationMessage=async(text,options)=>{
    if(options?.modal) {f.stages.push('confirmation');f.details.push(options.detail);return cancel==='confirmation'?undefined:'Create Class';}
    return 'Open Source Beside Header';
  };
  return f;
}
for(const stage of ['project','module','type','name','exposure','folder','confirmation']) test('wizard cancellation at '+stage+' creates no source files',async()=>{
  const f=await harness({cancel:stage});
  try {assert.equal(await wizard(f.vscode,f.context),undefined);assert.equal(f.opened.length,0);assert.ok(f.stages.includes(stage));await assert.rejects(fs.stat(path.join(f.module.root,'Public','Systems','InventoryComponent.h')),{code:'ENOENT'});}
  finally {await f.cleanup();}
});
test('successful wizard previews, creates, remembers module and optionally opens a split without marking metadata stale',async()=>{
  const f=await harness(),state=createState();
  try {
    const plan=await wizard(f.vscode,f.context,{state});
    assert.equal(plan.name.className,'UInventoryComponent');assert.equal(plan.api,'GAMEPLAY_API');assert.ok(!f.stages.includes('module'));
    for(const value of ['Game.uproject','Gameplay','Actor Component','UInventoryComponent','GAMEPLAY_API','InventoryComponent.h','InventoryComponent.cpp','Blueprintable']) assert.ok(f.details[0].includes(value),value);
    assert.equal(f.opened.length,2);assert.equal(f.opened[0].document.uri.fsPath,plan.files[0].path);assert.equal(f.opened[1].options.viewColumn,-2);
    assert.equal(state.get(f.project.filename).stale,false);assert.equal(state.get(f.project.filename).lastCreatedClass.name,plan.name.className);
    assert.equal(f.context.workspaceState.get('classModule:'+f.project.filename),f.module.buildFile);
  } finally {await f.cleanup();}
});
test('multi-module wizard uses the selected module, and invalid names can be corrected',async()=>{
  const f=await harness({multiple:true});
  try {
    const original=f.vscode.window.showQuickPick;f.vscode.window.showQuickPick=async choices=>choices[0].module?choices.find(item=>item.label==='Second'):original(choices);
    const originalInput=f.vscode.window.showInputBox;let first=true;f.vscode.window.showInputBox=async options=>{if(first){first=false;assert.ok(options.validateInput('123Bad'));return '123Bad';}return originalInput(options);};
    const plan=await wizard(f.vscode,f.context);assert.equal(plan.module.name,'Second');assert.equal(plan.api,'SECOND_API');assert.ok(f.errors.length===1);assert.equal(plan.files[0].path,path.join(f.root,'Source','Second','Systems','InventoryComponent.h'));
  } finally {await f.cleanup();}
});
test('navigation opens module rules, descriptor and picked target rules; missing/ambiguous cases are handled',async()=>{
  const f=await harness();
  try {
    await navigate(f.vscode,f.context,'module');assert.equal(f.opened.at(-1).document.uri.fsPath,f.module.buildFile);
    await navigate(f.vscode,f.context,'descriptor');assert.equal(f.opened.at(-1).document.uri.fsPath,f.project.filename);
    f.vscode.window.showQuickPick=async choices=>choices.find(item=>item.target?.type==='Editor');await navigate(f.vscode,f.context,'target');assert.ok(f.opened.at(-1).document.uri.fsPath.endsWith('GameEditor.Target.cs'));
    await addModule(f.root,'Second');f.vscode.window.showQuickPick=async choices=>choices.find(item=>item.label==='Second');await navigate(f.vscode,f.context,'module');assert.ok(f.opened.at(-1).document.uri.fsPath.endsWith('Second.Build.cs'));
    f.vscode.window.showQuickPick=async()=>undefined;const count=f.opened.length;await navigate(f.vscode,f.context,'target');assert.equal(f.opened.length,count);
    for(const target of f.project.targets) await fs.unlink(path.join(f.root,'Source',target.file));await assert.rejects(navigate(f.vscode,f.context,'target'),/No Source/);
    await fs.unlink(f.project.filename);await assert.rejects(navigate(f.vscode,f.context,'descriptor'),/No .uproject/);
  } finally {await f.cleanup();}
});
test('untrusted and unsupported-engine projects cannot generate classes',async()=>{
  const f=await harness();
  try {
    f.vscode.workspace.isTrusted=false;await assert.rejects(wizard(f.vscode,f.context),/Trust/);
    f.vscode.workspace.isTrusted=true;await fs.writeFile(f.project.filename,'{"EngineAssociation":"5.7"}');await assert.rejects(wizard(f.vscode,f.context),/5.8/);
  } finally {await f.cleanup();}
});
