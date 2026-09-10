const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const {classFixture}=require('./classHelpers');
const wizard=require('../structureWizard'),creation=require('../creation'),modules=require('../modules'),classes=require('../classWizard'),runtime=require('../runtime');
async function harness(cancel,advanced=false) {
  const f=await classFixture();f.opened=[];f.previews=[];f.calls=[];f.state=runtime.createState();
  f.vscode.workspace.openTextDocument=async uri=>{await fs.access(uri.fsPath);return {uri};};
  f.vscode.window.showTextDocument=async doc=>f.opened.push(doc.uri.fsPath);
  f.vscode.window.showInputBox=async options=>{
    const stage=options.prompt==='Initial module name'?'moduleName':options.prompt.includes('friendly')?'friendly':options.prompt.includes('description')?'description':'name';
    if(stage===cancel) return;
    return ['name','moduleName'].includes(stage)?'CombatEditor':stage==='friendly'?'Combat Tools':'A blank plugin';
  };
  f.vscode.window.showQuickPick=async (items,options)=>{
    const stage=options.placeHolder==='Module type'?'type':options.placeHolder==='Source layout'?'layout':'phase';
    if(stage===cancel) return;
    return stage==='phase'?items.find(i=>i.value==='PostEngineInit'):items[0];
  };
  let confirms=0;
  f.vscode.window.showInformationMessage=async (text,options)=>{
    if(options?.modal) {f.previews.push(options.detail);confirms++;if(cancel==='confirmation' || (cancel==='advancedConfirmation' && confirms===2)) return;return advanced && confirms===1?'Advanced Loading Phase':'Create';}
    return undefined;
  };
  f.vscode.commands.executeCommand=async command=>f.calls.push(command);
  return f;
}
for(const kind of ['module','plugin']) for(const stage of ['name','type','layout','confirmation','phase','advancedConfirmation',...(kind==='plugin'?['friendly','description','moduleName']:[])]) test(kind+' wizard cancels at '+stage,async()=>{
  const f=await harness(stage,['phase','advancedConfirmation'].includes(stage));try {
    const original=await fs.readFile(f.project.filename,'utf8');
    assert.equal(await wizard.wizard(f.vscode,f.context,{state:f.state},kind),undefined);
    assert.equal(await fs.readFile(f.project.filename,'utf8'),original);
    assert.equal(f.opened.length,0);assert.equal(f.state.peek(f.project.filename),undefined);
    assert.deepEqual((await modules.discover(f.root)).map(m=>m.name),['Gameplay']);
  } finally {await f.cleanup();}
});
for(const kind of ['module','plugin']) test(kind+' wizard previews, marks stale and integrates class/nav commands immediately',async()=>{
  const f=await harness(undefined,true);try {
    const plan=await wizard.wizard(f.vscode,f.context,{state:f.state},kind);
    assert.equal(plan.module.type,'Editor');assert.equal(plan.module.phase,'PostEngineInit');
    assert.equal(f.state.get(f.project.filename).stale,true);assert.equal(f.calls.length,0);
    for(const value of ['Game.uproject','CombatEditor','Editor','PostEngineInit','COMBATEDITOR_API','.Build.cs','.h','.cpp']) assert.ok(f.previews.at(-1).includes(value),value);
    assert.equal(f.opened[0],plan.module.files[0].path);
    f.vscode.window.showQuickPick=async items=>items.find(i=>i.module?.name==='CombatEditor');
    await classes.navigate(f.vscode,f.context,'module');assert.equal(f.opened.at(-1),plan.module.files[0].path);
    // Run the actual class wizard through selection/type then cancel at name; it must see the new module.
    let seen=false;f.vscode.window.showQuickPick=async items=>{if(items[0].module){seen=items.some(i=>i.module.name==='CombatEditor');return items.find(i=>i.module.name==='CombatEditor');}return items[0];};
    f.vscode.window.showInputBox=async()=>undefined;await classes.wizard(f.vscode,f.context,{state:f.state});assert.equal(seen,true);
    f.state.generated(f.project.filename,f.state.get(f.project.filename).revision,true);assert.equal(f.state.get(f.project.filename).stale,false);
  } finally {await f.cleanup();}
});
test('plugin navigation handles one, multiple, cancelled, missing and plugin Build.cs',async()=>{
  const f=await harness();try {
    await assert.rejects(wizard.openPlugin(f.vscode),/No valid/);
    for(const name of ['One','Two']) {
      await creation.commit(await creation.plan(f.project,{kind:'plugin',name}),f.vscode);
      if(name==='One') {await wizard.openPlugin(f.vscode);assert.ok(f.opened.at(-1).endsWith('One.uplugin'));}
    }
    f.vscode.window.showQuickPick=async items=>items.find(i=>i.label==='Two');await wizard.openPlugin(f.vscode);assert.ok(f.opened.at(-1).endsWith('Two.uplugin'));
    f.vscode.window.showQuickPick=async()=>undefined;const count=f.opened.length;await wizard.openPlugin(f.vscode);assert.equal(f.opened.length,count);
  } finally {await f.cleanup();}
});
test('structure wizard rejects untrusted and invalid input can be corrected',async()=>{
  const f=await harness();try {
    f.vscode.workspace.isTrusted=false;await assert.rejects(wizard.wizard(f.vscode,f.context,{},'module'),/Trust/);f.vscode.workspace.isTrusted=true;
    let count=0;f.vscode.window.showInputBox=async options=>{assert.ok(await options.validateInput('123Bad'));return count++===0?'123Bad':'Valid';};
    assert.equal(await wizard.input(f.vscode,{},require('../moduleTemplates').validateName),'Valid');assert.equal(f.errors.length,1);
  } finally {await f.cleanup();}
});
