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


// v0.4 replaces the old fire-and-forget build terminal with an awaited managed build.
test('controls preserve selected builds and trust while preventing duplicate Editor launches',async()=>{
  const {fixture}=require('./helpers');
  const f=await fixture();
  try {
    const specs=[];let matches=[],buildSuccess=true;
    const services={poll:false,processes:{get:async()=>({state:matches.length?'Running':'Stopped',matches})},builds:{run:spec=>{specs.push(spec);return {done:Promise.resolve({success:buildSuccess,status:buildSuccess?'Succeeded':'Failed'})};}}};
    await register(f.vscode,f.context,()=>{},services);
    assert.equal(f.buttons[0].visible,process.platform==='win32');if(process.platform!=='win32') return;
    await f.commands.get('unrealSetup.build')();assert.equal(specs[0].target,'GameEditor');assert.equal(specs[0].configuration,'Development');
    matches=[{pid:10,commandLine:'Game.uproject'}];
    await f.commands.get('unrealSetup.openEditor')();assert.equal(f.terminals.length,0);assert.match(f.infos.at(-1),/PID 10/);
    await f.commands.get('unrealSetup.buildAndRun')();assert.equal(specs.length,1);assert.equal(f.terminals.length,0);assert.match(f.errors.pop(),/Close this project/);
    matches=[];buildSuccess=false;
    await f.commands.get('unrealSetup.buildAndRun')();assert.equal(f.terminals.length,0);
    buildSuccess=true;await f.commands.get('unrealSetup.buildAndRun')();assert.equal(f.terminals.length,1);
    f.picks.push({label:'Game'},'Shipping');await f.commands.get('unrealSetup.selectTarget')();await f.commands.get('unrealSetup.selectConfiguration')();
    await f.commands.get('unrealSetup.build')();assert.equal(specs.at(-1).configuration,'Shipping');assert.equal(f.buttons.length,2);assert.match(f.buttons[0].tooltip,/Game \| Win64 \| Shipping/);
    await f.commands.get('unrealSetup.openEditor')();assert.equal(f.terminals.length,1,'pending launch must not duplicate');
    services.state.get(path.join(f.root,'Game.uproject')).launchRequested=0;
    const before=f.saves(),count=specs.length;
    await fs.unlink(path.join(f.root,'Engine','Build','BatchFiles','Build.bat'));
    await f.commands.get('unrealSetup.openEditor')();assert.equal(f.saves(),before);assert.equal(specs.length,count);assert.equal(f.terminals.length,2);
    const script=Buffer.from(f.terminals.at(-1).options.shellArgs.at(-1),'base64').toString('utf16le');assert.ok(script.includes('UnrealEditor.exe'));assert.ok(!script.includes('Build.bat'));assert.ok(!script.includes('-game'));
    f.vscode.workspace.isTrusted=false;await f.commands.get('unrealSetup.openEditor')();await f.commands.get('unrealSetup.build')();assert.equal(f.terminals.length,2);assert.equal(specs.length,count);
    assert.deepEqual(f.errors,[]);
  } finally {await f.cleanup();}
});
test('unknown process state refuses automatic Editor launch',async()=>{
  const {fixture}=require('./helpers');const f=await fixture();
  try {
    await register(f.vscode,f.context,()=>{},{poll:false,processes:{get:async()=>({state:'Unknown',matches:[],error:'query denied'})},builds:{}});
    await f.commands.get('unrealSetup.openEditor')();assert.equal(f.terminals.length,0);assert.match(f.errors.at(-1),/detection is unavailable/);
  } finally {await f.cleanup();}
});
