const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const generation=require('../generation');
const {createState}=require('../runtime');
const {fixture}=require('./helpers');
// Keep invariant C as an ordinary failing acceptance assertion while blocked.
// Do not relabel a regression TODO just to make the suite return success.
test('generation uses the active engine/project and restores existing VS Code configuration',async()=>{
  const f=await fixture();
  try {
    const project={root:f.root,filename:path.join(f.root,'Game.uproject')},state=createState();
    await fs.mkdir(path.join(f.root,'.vscode'));const settings=path.join(f.root,'.vscode','settings.json');
    await fs.writeFile(settings,'{"existing":false}');state.mark(project,path.join(f.root,'Source','Game.Build.cs'));
    let captured;
    const builds={run:spec=>{captured=spec;return {done:(async()=>{await fs.writeFile(settings,'overwritten by stub generator');return {success:true,status:'Succeeded'};})()};}};
    await generation.run(project,f.root,f.vscode,state,builds,{storageRoot:path.join(f.root,'.recovery')});
    assert.equal(captured.executable,path.join(f.root,'Engine','Binaries','DotNET','UnrealBuildTool','UnrealBuildTool.exe'));
    assert.ok(captured.args.includes('-project='+project.filename));assert.ok(captured.args.includes('-vscode'));
    assert.equal(await fs.readFile(settings,'utf8'),'{"existing":false}');assert.equal(state.get(project.filename).stale,false);
    state.mark(project,path.join(f.root,'Game.uproject'));
    await generation.run(project,f.root,f.vscode,state,{run:()=>({done:Promise.resolve({success:false,status:'Failed'})})},{storageRoot:path.join(f.root,'.recovery')});
    assert.equal(state.get(project.filename).stale,true);
  } finally {await f.cleanup();}
});
test('generation refuses missing tools and unsaved files; edits during generation remain stale',async()=>{
  const f=await fixture();
  try {
    const project={root:f.root,filename:path.join(f.root,'Game.uproject')},state=createState();
    f.vscode.workspace.textDocuments=[{uri:{fsPath:project.filename},isDirty:true}];
    await assert.rejects(generation.run(project,f.root,f.vscode,state,{run:()=>assert.fail('must not run')}),/Save/);
    f.vscode.workspace.textDocuments=[];
    await generation.run(project,f.root,f.vscode,state,{run:()=>{state.mark(project,project.filename);return {done:Promise.resolve({success:true})};}},{storageRoot:path.join(f.root,'.recovery')});
    assert.equal(state.get(project.filename).stale,true);
    await fs.unlink(await generation.tool(f.root));await assert.rejects(generation.specification(f.root,project),/not found/);
  } finally {await f.cleanup();}
});
test('metadata changes mark stale only for relevant files in the active project',()=>{
  const state=createState(),project={root:path.resolve('Game'),filename:path.resolve('Game','Game.uproject')};
  for(const file of ['Source/Game.Build.cs','Source/Game.Target.cs','Game.uproject','Plugins/Plugin/Plugin.uplugin']) {assert.equal(state.mark(project,path.join(project.root,file)),true);assert.equal(state.get(project.filename).stale,true);}
  const revision=state.get(project.filename).revision;
  for(const file of ['Source/Game.cpp','Source/Game.h','Other.uproject','../Outside.Build.cs']) assert.equal(state.mark(project,path.join(project.root,file)),false);
  assert.equal(state.get(project.filename).revision,revision);
});
test('generation rejects linked configuration before invoking UnrealBuildTool',async()=>{
  const f=await fixture();
  try {
    const destination=path.join(f.root,'config');await fs.mkdir(destination);
    await fs.symlink(destination,path.join(f.root,'.vscode'),process.platform==='win32'?'junction':'dir');
    await assert.rejects(generation.run({root:f.root,filename:path.join(f.root,'Game.uproject')},f.root,f.vscode,createState(),{run:()=>assert.fail('must not execute')}),/symbolic link/);
  } finally {await f.cleanup();}
});
