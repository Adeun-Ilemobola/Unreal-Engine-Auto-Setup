const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {collect,format,latestLog}=require('../diagnostics');

test('Project Doctor reports healthy and broken states without settings or state writes',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'unreal-doctor-'));
  try {
    for(const dir of ['Source','.vscode','Engine/Build/BatchFiles','Engine/Binaries/Win64']) await fs.mkdir(path.join(root,dir),{recursive:true});
    for(const file of ['.vscode/settings.json','.vscode/tasks.json','.vscode/c_cpp_properties.json','.clang-format','Engine/Build/BatchFiles/Build.bat','Engine/Binaries/Win64/UnrealEditor.exe']) await fs.writeFile(path.join(root,file),'');
    await fs.writeFile(path.join(root,'Game.uproject'),'{"EngineAssociation":"5.8"}');
    await fs.writeFile(path.join(root,'Source','GameEditor.Target.cs'),'Type=TargetType.Editor;');
    await fs.writeFile(path.join(root,'Engine','Build','Build.version'),'{"MajorVersion":5,"MinorVersion":8}');
    const values={'unrealEngine.enginePath':root};
    const vscode={workspace:{isTrusted:true,workspaceFolders:[{uri:{scheme:'file',fsPath:root}}],getConfiguration:()=>({get:key=>values[key],update:()=>assert.fail('diagnostic wrote settings')})},extensions:{getExtension:()=>({})}};
    const context={workspaceState:{get:()=>undefined,update:()=>assert.fail('diagnostic wrote state')}};
    const healthy=await collect(vscode,context);
    assert.ok(healthy.every(item=>item.ok),format(healthy));
    assert.ok(format(healthy).includes('GameEditor'));
    await fs.unlink(path.join(root,'Engine','Binaries','Win64','UnrealEditor.exe'));
    vscode.extensions.getExtension=()=>undefined;
    vscode.workspace.isTrusted=false;
    const broken=await collect(vscode,context);
    for(const label of ['UnrealEditor.exe available','Microsoft C/C++','Workspace trust']) assert.equal(broken.find(item=>item.label===label).ok,false);
    await fs.writeFile(path.join(root,'Game.uproject'),'invalid json');
    assert.ok((await collect(vscode,context)).some(item=>item.label==='Project selection' && !item.ok));
    delete values['unrealEngine.enginePath'];
    const unresolved=await collect(vscode,context,{discover:async()=>[]});
    assert.equal(unresolved.find(item=>item.label==='Engine path').value,'Unresolved');
  } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('latest project log chooses modification time and handles absent logs',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'unreal-logs-'));
  try {
    assert.equal(await latestLog(root),undefined);
    const logs=path.join(root,'Saved','Logs');await fs.mkdir(logs,{recursive:true});
    for(const [file,time] of [['old.log',1],['new.LOG',20],['ignore.txt',30]]) {const filename=path.join(logs,file);await fs.writeFile(filename,'log');await fs.utimes(filename,time,time);}
    await fs.mkdir(path.join(logs,'directory.log'));
    assert.equal(await latestLog(root),path.join(logs,'new.LOG'));
  } finally {await fs.rm(root,{recursive:true,force:true});}
});
