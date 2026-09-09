const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {buildScript,register} = require('../runner');

test('rejects command injection in target and batch-expanded paths',()=>{
  assert.throws(()=>buildScript('C:\\UE','C:\\Game.uproject','Editor; calc',true));
  for (const value of ['bad%PATH%', 'bad!name', 'bad\nname', 'bad"name']) {
    assert.throws(()=>buildScript(value,'Game.uproject','GameEditor',false));
  }
});

test('real PowerShell build script gates launch on exit status and quotes paths', {skip:process.platform!=='win32'}, async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"Unreal test's space "));
  try {
    const batch=path.join(root,'Engine','Build','BatchFiles');
    const binaries=path.join(root,'Engine','Binaries','Win64');
    await fs.mkdir(batch,{recursive:true}); await fs.mkdir(binaries,{recursive:true});
    const marker=path.join(root,'launched.txt');
    await fs.writeFile(path.join(binaries,'TestEditor.cmd'),'@echo off\r\necho %*>"'+marker+'"\r\nexit /b 0\r\n');
    const shell=path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
    for (const [code,run] of [[7,true],[0,false],[0,true]]) {
      await fs.writeFile(path.join(batch,'Build.bat'),'@echo off\r\necho %*\r\nexit /b '+code+'\r\n');
      const script=buildScript(root,path.join(root,"Game's Project.uproject"),'GameEditor',run).replace('UnrealEditor.exe','TestEditor.cmd');
      let result;
      try { result=await promisify(execFile)(shell,['-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')]); }
      catch(error) { assert.equal(error.code,code); result=error; }
      assert.match(result.stdout,/GameEditor Win64 Development/);
      assert.ok(result.stdout.includes("Game's Project.uproject"));
      if (code) assert.match(result.stdout,/Build failed/);
      if (code || !run) await assert.rejects(fs.stat(marker),{code:'ENOENT'});
      else {
        const editorArgs = await fs.readFile(marker,'utf8');
        assert.ok(editorArgs.includes("Game's Project.uproject"));
        assert.match(editorArgs,/-log/);
        assert.doesNotMatch(editorArgs,/-game\b/);
      }
    }
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});

test('buttons launch one dedicated terminal, preserve build/run mode, and respect trust',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'unreal-runner-'));
  try {
    await fs.mkdir(path.join(root,'Source'));
    await fs.writeFile(path.join(root,'Test.uproject'),'{"EngineAssociation":"5.8"}');
    await fs.writeFile(path.join(root,'Source','TestEditor.Target.cs'),'Type = TargetType.Editor;');
    await fs.writeFile(path.join(root,'Source','Test.Target.cs'),'Type = TargetType.Game;');
    const engine=path.join(root,'UE');
    await fs.mkdir(path.join(engine,'Engine','Build','BatchFiles'),{recursive:true});
    await fs.mkdir(path.join(engine,'Engine','Binaries','Win64'),{recursive:true});
    await fs.writeFile(path.join(engine,'Engine','Build','Build.version'),'{"MajorVersion":5,"MinorVersion":8}');
    await fs.writeFile(path.join(engine,'Engine','Build','BatchFiles','Build.bat'),'');
    await fs.writeFile(path.join(engine,'Engine','Binaries','Win64','UnrealEditor.exe'),'');
    const commands=new Map(),terminals=[],buttons=[],errors=[],picks=[]; let closed; let saves=0;
    const disposable={dispose(){}};
    const vscode={
      StatusBarAlignment:{Left:1}, ConfigurationTarget:{Workspace:2},
      workspace:{isTrusted:true,workspaceFolders:[{uri:{scheme:'file',fsPath:root}}],saveAll:async()=>{saves++;return true;},
        getConfiguration:()=>({get:key=>key==='unrealEngine.enginePath'?engine:undefined}),
        onDidChangeWorkspaceFolders:()=>disposable,onDidGrantWorkspaceTrust:()=>disposable,
        createFileSystemWatcher:()=>({dispose(){},onDidCreate:()=>disposable,onDidDelete:()=>disposable})},
      commands:{registerCommand:(key,fn)=>{commands.set(key,fn);return disposable;}},
      window:{onDidCloseTerminal:fn=>{closed=fn;return disposable;},
        createStatusBarItem:()=>{const b={show(){this.visible=true;},hide(){this.visible=false;},dispose(){}};buttons.push(b);return b;},
        createTerminal:options=>{const t={options,show(){},dispose(){}};terminals.push(t);return t;},
        showQuickPick:async()=>picks.shift(),showInformationMessage(){},showErrorMessage:text=>errors.push(text)}
    };
    const state=new Map();
    const context={subscriptions:[],workspaceState:{get:key=>state.get(key),update:async(key,value)=>state.set(key,value)}};
    await register(vscode,context,()=>{});
    assert.equal(buttons[0].visible,process.platform==='win32');
    if (process.platform!=='win32') return;
    await commands.get('unrealSetup.build')();
    assert.equal(terminals.length,1);
    const decode=t=>Buffer.from(t.options.shellArgs.at(-1),'base64').toString('utf16le');
    assert.ok(!decode(terminals[0]).includes('UnrealEditor.exe'));
    await commands.get('unrealSetup.buildAndRun')();
    assert.equal(terminals.length,1);
    closed(terminals[0]);
    await commands.get('unrealSetup.buildAndRun')();
    assert.equal(terminals.length,2);
    assert.ok(decode(terminals[1]).includes('UnrealEditor.exe'));
    assert.equal(terminals[1].options.cwd,root);
    closed(terminals[1]);
    picks.push({label:'Test'},'Shipping');
    await commands.get('unrealSetup.selectTarget')();
    await commands.get('unrealSetup.selectConfiguration')();
    assert.equal(buttons[2].text,'Test | Win64 | Shipping');
    await commands.get('unrealSetup.build')();
    assert.ok(decode(terminals[2]).includes("'Test' Win64 Shipping"));
    closed(terminals[2]);
    const before=saves;
    await fs.unlink(path.join(engine,'Engine','Build','BatchFiles','Build.bat'));
    await commands.get('unrealSetup.openEditor')();
    assert.equal(terminals.length,4);
    assert.equal(saves,before,'Open Editor must not save or compile');
    assert.ok(!decode(terminals[3]).includes('Build.bat'));
    assert.ok(decode(terminals[3]).includes('UnrealEditor.exe'));
    assert.ok(!decode(terminals[3]).includes('-game'));
    closed(terminals[3]);
    vscode.workspace.isTrusted=false;
    await commands.get('unrealSetup.build')();
    await commands.get('unrealSetup.openEditor')();
    assert.equal(terminals.length,4);
    assert.deepEqual(errors,[]);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});
