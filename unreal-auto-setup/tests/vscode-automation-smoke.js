'use strict';
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
exports.run=async()=>{
 const root=vscode.workspace.workspaceFolders[0].uri.fsPath;
 assert.ok(path.basename(root).startsWith('UnrealAutoSetup-v06-'),'Disposable fixture only');
 const source=path.join(root,'Source/ValidationRuntime/Private/ValidationRuntime.cpp'),rules=path.join(root,'Source/ValidationRuntime/ValidationRuntime.Build.cs');
 let ownedEditor;
 const originals=new Map([[source,await fs.readFile(source)],[rules,await fs.readFile(rules)]]),result={};
 const config=vscode.workspace.getConfiguration(),api=await vscode.extensions.getExtension('local-tools.unreal-project-tools').activate();
 async function refresh(){await api.refresh();return api.snapshot();}
 async function until(check,label,ms=180000){const deadline=Date.now()+ms;while(Date.now()<deadline){const s=await refresh();if(check(s))return s;await sleep(500);}throw new Error('Timed out: '+label+' '+JSON.stringify(api.snapshot().automation));}
 async function mode(value){await config.update('unrealSetup.automationMode',value,vscode.ConfigurationTarget.Workspace);await refresh();}
 async function waitHistory(n){return until(s=>s.automation.history.length>=n && !['Preparing','Building','Regenerating'].includes(s.automation.state),'operation '+n);}
 try {
  await config.update('unrealSetup.autoBuildDelay',5,vscode.ConfigurationTarget.Workspace);await config.update('unrealSetup.runtimeRefreshInterval',0,vscode.ConfigurationTarget.Workspace);await mode('watch');
  const commands=await vscode.commands.getCommands();for(const c of ['cancelBuild','cancelPendingAutomaticBuild','automationMode','autoBuildDelay','runtimeInterval'])assert.ok(commands.includes('unrealSetup.'+c));
  assert.equal(require('../sidebar').rows(api.snapshot()).length,8);result.commands=true;
  await fs.appendFile(source,'\n// watch validation\n');await until(s=>s.automation.dirty.length>0,'dirty');await sleep(5500);assert.equal(api.snapshot().automation.history.length,0);result.watch=true;
  await mode('autoBuild');await vscode.commands.executeCommand('unrealSetup.cancelPendingAutomaticBuild');await sleep(5500);assert.equal(api.snapshot().automation.history.length,0);assert.ok(api.snapshot().automation.dirty.length);result.pendingCancellation=true;
  for(let n=0;n<3;n++){await fs.appendFile(source,'\n// debounce '+n+'\n');await refresh();await sleep(800);assert.equal(api.snapshot().automation.history.length,0);}
  let s=await waitHistory(1);assert.equal(s.automation.history[0].status,'Succeeded');assert.equal(s.automation.dirty.length,0);await sleep(6000);await refresh();assert.equal(api.snapshot().automation.history.length,1);result.automaticBuild=s.automation.history[0];
  await mode('autoBuildAndRegenerate');await fs.appendFile(rules,'\n// structural automation validation\n');await refresh();s=await waitHistory(2);assert.equal(s.automation.history[0].status,'Succeeded');assert.equal(s.session.stale,false);assert.equal(s.automation.dirty.length,0);result.regenerationAndBuild=s.automation.history[0];
  await fs.appendFile(source,'\n#error AUTOS_SETUP_DISPOSABLE_FAILURE\n');await refresh();s=await waitHistory(3);assert.equal(s.automation.history[0].status,'Failed');const problems=vscode.languages.getDiagnostics().flatMap(([,d])=>d).filter(d=>d.source==='UnrealBuildTool');assert.ok(problems.length);result.failure={operation:s.automation.history[0],problems:problems.map(p=>p.message)};
  await sleep(6500);await refresh();assert.equal(api.snapshot().automation.history.length,3);result.noFailureLoop=true;
  await fs.writeFile(source,originals.get(source));await refresh();s=await waitHistory(4);assert.equal(s.automation.history[0].status,'Succeeded');assert.equal(s.automation.dirty.length,0);result.recovery=s.automation.history[0];
  await fs.appendFile(source,'\n// manual priority\n');await refresh();await vscode.commands.executeCommand('unrealSetup.build');s=await waitHistory(5);assert.equal(s.automation.history[0].origin,'Manual');await sleep(5500);await refresh();assert.equal(api.snapshot().automation.history.length,5);result.manualPriority=true;
  await fs.appendFile(source,'\n// Run priority validation\n');await refresh();
  assert.equal(api.snapshot().editor.state,'Stopped');await vscode.commands.executeCommand('unrealSetup.run');
  s=await waitHistory(6);assert.equal(s.automation.history[0].origin,'Manual');assert.equal(s.automation.history[0].status,'Succeeded');
  s=await until(s=>s.editor.state==='Running','Editor launch',90000);ownedEditor=s.editor.matches[0].pid;result.runPriority=true;
  await vscode.commands.executeCommand('unrealSetup.run');s=await waitHistory(7);assert.equal(s.automation.history[0].status,'Reused');result.runReuse=true;
  await mode('watch');await fs.appendFile(source,'\n// pending while Editor runs\n');await refresh();
  const live=await require('../liveCoding').inspect(s.editor);assert.equal(live.canTriggerExternally,false);result.liveCoding=live;
  await vscode.commands.executeCommand('unrealSetup.build');s=await waitHistory(8);assert.equal(s.automation.history[0].status,'Blocked');assert.ok(s.automation.dirty.length);result.runningEditorRefusal=s.automation.history[0];
  result.success=true;
 }catch(error){result.error=error.stack;throw error;}
 finally {if(ownedEditor) await require('node:util').promisify(require('node:child_process').execFile)('taskkill.exe',['/PID',String(ownedEditor),'/T','/F'],{windowsHide:true}).catch(()=>{});await mode('off');for(const [file,content]of originals)await fs.writeFile(file,content);await refresh();await fs.writeFile(path.join(root,'vscode-automation-result.json'),JSON.stringify(result,null,2));}
};
