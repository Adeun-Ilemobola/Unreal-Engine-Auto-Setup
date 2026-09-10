const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const modules=require('../modules');
const {classFixture,addModule,rules}=require('./classHelpers');

test('discovers flat, split, nested project and descriptor-declared plugin modules',async()=>{
  const f=await classFixture();
  try {
    assert.equal(f.module.name,'Gameplay');assert.equal(f.module.layout,'Flat');
    await addModule(f.root,'EditorTools',{split:true,prefix:'Source/Tools'});
    await addModule(f.root,'PluginRuntime',{prefix:'Plugins/Category/MyPlugin/Source'});
    await addModule(f.root,'Undeclared',{prefix:'Plugins/Category/MyPlugin/Source'});
    await fs.writeFile(path.join(f.root,'Plugins/Category/MyPlugin/MyPlugin.uplugin'),JSON.stringify({Modules:[{Name:'PluginRuntime',Type:'Runtime'}]}));
    const list=await modules.discover(f.root);assert.equal(list.length,3);
    assert.equal(list.find(item=>item.name==='EditorTools').layout,'Public / Private');
    assert.equal(list.find(item=>item.name==='PluginRuntime').origin,'plugin');
    assert.equal(list.find(item=>item.name==='PluginRuntime').api,'PLUGINRUNTIME_API');
    assert.ok(list.every(item=>item.buildFile.endsWith(item.name+'.Build.cs')));
  } finally {await f.cleanup();}
});
test('ignores malformed, mismatched, comment/string pseudo-rules and non-module directories',async()=>{
  const f=await classFixture();
  try {
    for(const [name,text] of [['Broken','class Broken : ModuleRules {'],['Wrong',rules('Different')],['Comment','/* '+rules('Comment')+' */'],['External',rules('External').replace('PublicDependency','Type = ModuleType.External; PublicDependency')],['String','string fake = "class String : ModuleRules { public String(ReadOnlyTargetRules T) {} }";']]) {
      const root=path.join(f.root,'Source',name);await fs.mkdir(root);await fs.writeFile(path.join(root,name+'.Build.cs'),text);
    }
    await fs.mkdir(path.join(f.root,'Source','Utilities'));
    assert.deepEqual((await modules.discover(f.root)).map(item=>item.name),['Gameplay']);
  } finally {await f.cleanup();}
});
test('does not discover modules through directory symlinks',async()=>{
  const f=await classFixture();
  try {
    await fs.symlink(f.module.root,path.join(f.root,'Source','Linked'),process.platform==='win32'?'junction':'dir');
    assert.equal((await modules.discover(f.root)).length,1);
  } finally {await f.cleanup();}
});
test('API macros derive from the selected module and reject unsafe names',()=>{
  for(const [name,macro] of [['Gameplay','GAMEPLAY_API'],['MixedCase','MIXEDCASE_API'],['Tools_2D','TOOLS_2D_API']]) assert.equal(modules.apiMacro(name),macro);
  for(const name of ['', '2Game','Game-Module','Game/Module','Bad__Name']) assert.throws(()=>modules.apiMacro(name));
});
test('one module is automatic; multiple choices distinguish location and remember the recent module',async()=>{
  const f=await classFixture();
  try {
    f.vscode.window.showQuickPick=()=>assert.fail('single module must be automatic');
    assert.equal((await modules.choose(f.vscode,f.context,f.project,[f.module])).name,'Gameplay');
    await addModule(f.root,'Second');const list=await modules.discover(f.root);
    f.vscode.window.showQuickPick=async choices=>{assert.ok(choices[0].detail);return choices.find(item=>item.label==='Second');};
    const selected=await modules.choose(f.vscode,f.context,f.project,list);await modules.remember(f.context,f.project,selected);
    assert.equal(modules.recent(f.context,f.project,list).name,'Second');
    f.vscode.window.showQuickPick=async choices=>{assert.match(choices[0].description,/recent/);return undefined;};
    assert.equal(await modules.choose(f.vscode,f.context,f.project,list),undefined);
  } finally {await f.cleanup();}
});
