const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const engine=require('../engine');

test('engine discovery reads Epic manifest and exact-version registry information',async()=>{
  const calls=[];
  const found=await engine.candidates('5.8',{programData:'C:\\ProgramData',readFile:async()=>JSON.stringify({InstallationList:[{AppName:'UE_5.8',InstallLocation:'C:\\Epic\\UE_5.8'},{AppName:'UE_5.7',InstallLocation:'C:\\Old'}]}),registry:async(exe,args)=>{calls.push(args);return {stdout:'    InstalledDirectory    REG_SZ    C:\\Registry\\UE_5.8\r\n'};}});
  assert.equal(found.length,2);
  assert.ok(found.some(item=>item.includes('Epic')));
  assert.ok(calls.every(args=>args[1].endsWith('\\5.8')));
  assert.deepEqual(await engine.candidates('{custom-guid}',{readFile:async()=>{throw new Error('must not query');},registry:async()=>{throw new Error('must not query');}}),[]);
});

test('auto-detection validates candidates, falls back to picker, and preserves explicit paths',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'unreal-engine-'));
  try {
    await fs.mkdir(path.join(root,'Engine','Build','BatchFiles'),{recursive:true});
    await fs.mkdir(path.join(root,'Engine','Binaries','Win64'),{recursive:true});
    await fs.writeFile(path.join(root,'Engine','Build','Build.version'),'{"MajorVersion":5,"MinorVersion":8,"PatchVersion":1}');
    await fs.writeFile(path.join(root,'Engine','Build','BatchFiles','Build.bat'),'');
    await fs.writeFile(path.join(root,'Engine','Binaries','Win64','UnrealEditor.exe'),'');
    let configured, picks=0, writes=0;
    const project={root,descriptor:{EngineAssociation:'5.8'},config:{get:()=>configured,update:async(key,value)=>{writes++;configured=value;}}};
    const result=await engine.resolve(project,{discover:async()=>[path.join(root,'missing'),root],pick:async()=>{picks++;return root;}});
    assert.equal(result.path,root);assert.equal(picks,0);
    const fallback=await engine.resolve(project,{discover:async()=>[],pick:async()=>{picks++;return path.join(root,'Engine');}});
    assert.equal(fallback.path,root);assert.equal(picks,1);
    assert.equal(await engine.resolve(project,{discover:async()=>[],pick:async()=>undefined}),undefined);
    const vscode={workspace:{isTrusted:true,textDocuments:[]},ConfigurationTarget:{Workspace:2}};
    await engine.remember(vscode,project,result);assert.equal(writes,1);
    await engine.remember(vscode,project,result);assert.equal(writes,1);
    configured=path.join(root,'Engine');
    await engine.remember(vscode,project,result);assert.equal(configured,path.join(root,'Engine'));
    configured=path.join(root,'bad');
    await assert.rejects(engine.resolve(project,{discover:async()=>[root]}),/Build.version/);
    configured=undefined;
    await assert.rejects(engine.resolve({...project,descriptor:{EngineAssociation:'5.9'}},{discover:async()=>[root],pick:async()=>root}),/match/);
    await fs.unlink(path.join(root,'Engine','Build','BatchFiles','Build.bat'));
    configured=root;
    assert.equal((await engine.resolve(project,{requireBuild:false})).editor,true);
    await assert.rejects(engine.resolve(project),/Build.bat/);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});
