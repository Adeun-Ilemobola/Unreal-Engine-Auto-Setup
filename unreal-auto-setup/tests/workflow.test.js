const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');

async function fixture(trusted=true, missingExtensions=false, hooks={}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'ad-workflow-'));
  await fs.mkdir(path.join(root,'Source'));
  await fs.writeFile(path.join(root,'NewGame.uproject'),JSON.stringify({EngineAssociation:'5.8'}));
  await fs.writeFile(path.join(root,'Source','NewGameEditor.Target.cs'),'Type = TargetType.Editor;');
  const values = {'files.exclude':{'Content':false},'[cpp]':{'editor.tabSize':4}};
  const state = new Map(); const registered = new Map(); const errors=[]; const invoked=[]; const updates=[];
  const installed = new Set(missingExtensions ? [] : ['ms-vscode.cpptools','skyboxlabs.unrealengine-tools']);
  const disposable = {dispose(){}};
  const config = prefix=>({
    get(key,fallback){return values[(prefix?prefix+'.':'')+key] ?? fallback;},
    inspect(key){return {workspaceValue:values[(prefix?prefix+'.':'')+key]};},
    async update(key,value,target){
      if (target === 3 && key === 'files.associations') throw new Error('Unable to write to Folder Settings because files.associations does not support the folder resource scope.');
      assert.equal(target,2,'single-project configuration must use Workspace scope');
      values[(prefix?prefix+'.':'')+key]=value;updates.push(key);
      await hooks.updated?.(key,vscode);
    }
  });
  const vscode={
    ConfigurationTarget:{Global:1,Workspace:2,WorkspaceFolder:3},
    workspace:{isTrusted:trusted,workspaceFolders:[{uri:{scheme:'file',fsPath:root,toString:()=>root}}],textDocuments:[],getConfiguration:config,onDidChangeWorkspaceFolders:()=>disposable,onDidGrantWorkspaceTrust:()=>disposable,createFileSystemWatcher:()=>({dispose(){},onDidCreate:()=>disposable,onDidChange:()=>disposable,onDidDelete:()=>disposable})},
    window:{createOutputChannel:()=>({appendLine(){},dispose(){}}),showInformationMessage(){},showErrorMessage(text){errors.push(text);},showQuickPick:async()=>undefined},
    extensions:{getExtension:id=>installed.has(id)?({activate:async()=>{},packageJSON:{contributes:{commands:[{title:'Select Build Configuration...',command:'verified-from-manifest'}]}}}):undefined},
    commands:{registerCommand(name,fn){registered.set(name,fn);return disposable;},async executeCommand(name,id){invoked.push(name);if(name==='workbench.extensions.installExtension') installed.add(id);}}
  };
  const context={subscriptions:[],workspaceState:{get:key=>state.get(key),update:async(key,value)=>state.set(key,value)}};
  const sandbox={require:name=>name==='vscode'?vscode:name==='./core'?require('../core'):name==='./runner'?{register:async()=>{},editorTargets:require('../runner').editorTargets}:name==='./engine'?{resolve:async()=>{await hooks.resolve?.(vscode);return undefined;},remember:async()=>{}}:name==='./diagnostics'?{register(){}}:name.startsWith('./')?require('../'+name.slice(2)):require(name),module:{exports:{}},process:{platform:'win32'},console};
  vm.runInNewContext(await fs.readFile(path.join(__dirname,'..','extension.js'),'utf8'),sandbox);
  return {root,values,errors,invoked,updates,context,vscode,activate:sandbox.module.exports.activate,registered,cleanup:()=>fs.rm(root,{recursive:true,force:true})};
}
test('new project uses its own target, keeps settings, creates files once',async()=>{
  const f=await fixture();
  try {
    await f.activate(f.context);
    assert.deepEqual(f.errors,[]);
    assert.equal(f.values['unrealEngine.defaultProject'],'NewGame.uproject');
    assert.equal(f.values['[cpp]']['editor.tabSize'],4);
    assert.equal(f.values['files.exclude'].Content,false);
    assert.equal(f.values['tasks.tasks'][0].args.target,'NewGameEditor');
    assert.equal(f.values['tasks.tasks'][0].args.platform,'Win64');
    assert.equal(f.values['tasks.tasks'][0].args.configuration,'Development');
    assert.deepEqual(f.invoked,['verified-from-manifest']);
    const props=JSON.parse(await fs.readFile(path.join(f.root,'.vscode','c_cpp_properties.json'),'utf8'));
    assert.equal(props.configurations[0].configurationProvider,'skyboxlabs.unrealengine-tools');
    await fs.writeFile(path.join(f.root,'.clang-format'),'custom format');
    const before=f.updates.length;
    await f.activate(f.context);
    assert.equal(f.updates.length,before);
    assert.equal(f.invoked.length,1);
    await f.registered.get('unrealSetup.setup')();
    assert.equal(await fs.readFile(path.join(f.root,'.clang-format'),'utf8'),'custom format');
    assert.equal(f.values['tasks.tasks'].length,1);
  } finally {await f.cleanup();}
});
function barrier(){let entered,release;return {entered:new Promise(r=>entered=r),wait:()=>{entered();return new Promise(r=>release=r);},release:()=>release()};}
for(const stage of ['engine','dialog','update']) test('setup abandons stale workspace after '+stage+' barrier',async()=>{
  const b=barrier();let first=true;
  const f=await fixture(true,false,stage==='engine'?{resolve:()=>b.wait()}:stage==='update'?{updated:()=>{if(first){first=false;return b.wait();}}}:{});
  try {
    if(stage==='dialog') {await fs.writeFile(path.join(f.root,'Other.uproject'),'{"EngineAssociation":"5.8"}');f.vscode.window.showQuickPick=async()=>{await b.wait();return 'NewGame.uproject';};}
    const pending=f.activate(f.context);await b.entered;
    f.vscode.workspace.workspaceFolders=[{uri:{scheme:'file',fsPath:path.join(f.root,'different'),toString:()=>f.root+'/different'}}];
    const before=f.updates.length;b.release();await pending;
    assert.equal(f.updates.length,before,'no updates after workspace changes');
    assert.equal(f.invoked.length,0);assert.ok(f.errors.some(e=>/workspace|project.*changed/i.test(e)));
  } finally {await f.cleanup();}
});
test('restricted mode performs no writes and no commands',async()=>{
  const f=await fixture(false);
  try {await f.activate(f.context); assert.equal(f.updates.length,0);assert.equal(f.invoked.length,0); await assert.rejects(fs.stat(path.join(f.root,'.clang-format')),{code:'ENOENT'});}
  finally {await f.cleanup();}
});
test('initialization installs missing companion extensions and continues setup',async()=>{
  const f=await fixture(true,true);
  try {
    await f.activate(f.context);
    assert.deepEqual(f.errors,[]);
    assert.deepEqual(f.invoked,['workbench.extensions.installExtension','workbench.extensions.installExtension','verified-from-manifest']);
    assert.equal(f.values['tasks.tasks'][0].args.target,'NewGameEditor');
    await f.registered.get('unrealSetup.installExtensions')();
    assert.equal(f.invoked.length,3);
  } finally {await f.cleanup();}
});
test('manual initialization preserves custom files, tasks and saved build configuration',async()=>{
  const f=await fixture();
  try {
    await fs.mkdir(path.join(f.root,'.vscode'));
    const customProperties='{"configurations":[{"name":"Custom","configurationProvider":"custom.provider"}],"version":4}';
    await fs.writeFile(path.join(f.root,'.vscode','c_cpp_properties.json'),customProperties);
    await fs.writeFile(path.join(f.root,'.clang-format'),'Custom formatting\n');
    const originalTask={label:'Existing build',type:'shell',command:'custom-build',group:{kind:'build',isDefault:true}};
    f.values['tasks.tasks']=[originalTask];
    await f.context.workspaceState.update('buildSelection:'+path.join(f.root,'NewGame.uproject'),{target:'NewGameEditor',platform:'Win64',configuration:'DebugGame'});
    await f.activate(f.context);
    assert.deepEqual(f.errors,[]);
    assert.equal(f.values['tasks.tasks'][0],originalTask);
    assert.equal(f.values['tasks.tasks'][1].args.configuration,'DebugGame');
    assert.equal(f.values['tasks.tasks'][1].group,'build');
    await f.registered.get('unrealSetup.setup')();
    assert.equal(f.values['tasks.tasks'].length,2);
    assert.equal(await fs.readFile(path.join(f.root,'.vscode','c_cpp_properties.json'),'utf8'),customProperties);
    assert.equal(await fs.readFile(path.join(f.root,'.clang-format'),'utf8'),'Custom formatting\n');
    assert.equal(f.values['files.exclude'].Content,false);
  } finally {await f.cleanup();}
});
