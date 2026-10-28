'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),project=path.join(root,'.local-test-projects/Phase3AIntegration');
const evidence=path.join(root,'docs/maintenance/runs/0007-phase3b2');
exports.activate=async context=>{
 const vscode=require('vscode');
 const event=async value=>fs.appendFile(path.join(evidence,'host-events.jsonl'),JSON.stringify({time:new Date().toISOString(),hostPid:process.pid,...value})+'\n');
 try {
 if(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath.toLowerCase()!==project.toLowerCase()) throw new Error('Wrong fixture');
 const marker=JSON.parse(await fs.readFile(path.join(project,'PHASE3A-OWNERSHIP.json')));
 if(marker.repository!==root) throw new Error('Wrong ownership');
 if(!vscode.workspace.isTrusted) {await event({phase:'untrusted'});return;}
 const extension=vscode.extensions.getExtension('local-tools.unreal-project-tools'),api=await extension.activate();
 const userData=path.join(project,'host-3b2-fixed');
 const store=require(path.join(root,'unreal-auto-setup/operationOwnership')).create(path.join(userData,'User/globalStorage/local-tools.unreal-project-tools/operations-v1'));
 const descriptor=path.join(project,'Phase3AIntegration.uproject');
 const stateFile=path.join(project,'phase3b2-state.json'),release=path.join(project,'phase3b2-release');
 let state;try {state=JSON.parse(await fs.readFile(stateFile));}catch{}
 await event({phase:'activation',vscode:vscode.version,extension:extension.packageJSON.version});
 if(!state) {
 const claim=await store.begin(descriptor,'build');
 const script="while(!(Test-Path -LiteralPath '"+release.replace(/'/g,"''")+"')) { Start-Sleep -Milliseconds 100; if((Get-Date) -gt [datetime]'"+new Date(Date.now()+90000).toISOString()+"'){break} }";
 const encoded=Buffer.from('# Operation '+claim.operationId+'\n'+script,'utf16le').toString('base64');
 await claim.spawnAttempted(encoded);
 const child=require('node:child_process').spawn(require(path.join(root,'unreal-auto-setup/processes')).powershell(),['-NoLogo','-NoProfile','-EncodedCommand',encoded],{windowsHide:true,stdio:'ignore'});
 await claim.observe(child.pid,encoded);
 await fs.writeFile(stateFile,JSON.stringify({pid:child.pid,operationId:claim.operationId}));
 await event({phase:'before-reload',childPid:child.pid,recovery:await store.inspect(descriptor,{probe:true})});
 await vscode.commands.executeCommand('workbench.action.reloadWindow');
 } else {
 const start=performance.now(),recovered=await store.inspect(descriptor,{probe:true});
 await api.refresh();
 const blocked=await vscode.commands.executeCommand('unrealSetup.build');
 await event({phase:'after-reload',childPid:state.pid,recovered,recoveryMs:performance.now()-start,blocked,ui:api.snapshot().automation});
 await fs.writeFile(release,'test-owned child may exit');
 const query=require(path.join(root,'unreal-auto-setup/operationOwnership')).query;
 let observed;const deadline=Date.now()+15000;
 do {observed=await query(state.pid);if(!observed)break;await new Promise(resolve=>setTimeout(resolve,100));}while(Date.now()<deadline);
 await event({phase:'cleanup',childPid:state.pid,rootAbsent:!observed,claimRetained:(await store.inspect(descriptor)).state==='Unknown'});
 await vscode.commands.executeCommand('workbench.action.closeWindow');
 }
 }catch(error){await event({phase:'error',error:error.stack});}
};
