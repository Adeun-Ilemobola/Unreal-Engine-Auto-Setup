'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),cp=require('node:child_process');
async function main(){
 const root=path.resolve(__dirname,'../..'),scratch=await fs.mkdtemp('C:\\Dev\\Scratch\\UnrealAutoSetupTests\\package-'),profile=path.join(scratch,'profile'),extensions=path.join(scratch,'extensions'),driver=path.join(scratch,'driver'),workspace=path.join(scratch,'workspace');
 const record=path.join(root,'docs/maintenance/runs/0013-phase4e-review');
 const env={...process.env,TEMP:scratch,TMP:scratch,TMPDIR:scratch,UNREAL_AUTO_SETUP_INTEGRATION_ROOT:scratch};delete env.ELECTRON_RUN_AS_NODE;
 const code=path.join(process.env.LOCALAPPDATA,'Programs/Microsoft VS Code/Code.exe'),codeRoot=path.dirname(code),cliCandidates=[];
 for(const name of ['',...(await fs.readdir(codeRoot))]){const candidate=path.join(codeRoot,name,'resources/app/out/cli.js');if(await fs.access(candidate).then(()=>true,()=>false))cliCandidates.push(candidate);}
 if(cliCandidates.length!==1)throw Error('Select an unambiguous installed VS Code CLI');
 cp.execFileSync('python',['-B','build_bundle.py','--validation-dir',scratch],{cwd:root,env,stdio:'inherit'});
 const packageFile=path.join(scratch,'unreal-project-tools-0.8.0.vsix');
 await fs.writeFile(path.join(record,'package.json'),JSON.stringify({scratch,packageFile,sha256:require('node:crypto').createHash('sha256').update(await fs.readFile(packageFile)).digest('hex')},null,2));
 const output=cp.execFileSync(code,[cliCandidates[0],'--user-data-dir',profile,'--extensions-dir',extensions,'--install-extension',packageFile,'--do-not-include-pack-dependencies'],{env:{...env,ELECTRON_RUN_AS_NODE:'1'},windowsHide:true,encoding:'utf8',timeout:90000});await fs.writeFile(path.join(record,'installation.txt'),output);
 await fs.mkdir(path.join(profile,'User'),{recursive:true});await fs.mkdir(driver);await fs.mkdir(workspace);
 await fs.writeFile(path.join(profile,'User/settings.json'),JSON.stringify({'unrealSetup.autoSetup':false,'security.workspace.trust.enabled':false,'extensions.autoUpdate':false,'extensions.autoCheckUpdates':false,'update.mode':'none'}));
 await fs.writeFile(path.join(driver,'package.json'),JSON.stringify({name:'package-probe',publisher:'local-test',version:'0.0.1',engines:{vscode:'^1.100.0'},main:'./extension.js'}));await fs.writeFile(path.join(driver,'extension.js'),'exports.activate=()=>{};');
 const child=cp.spawn(code,['--new-window','--disable-gpu','--user-data-dir='+profile,'--extensions-dir='+extensions,'--extensionDevelopmentPath='+driver,'--extensionTestsPath='+path.join(__dirname,'package-host.cjs'),workspace],{env,stdio:'ignore',windowsHide:true});let failure;child.on('error',e=>failure=e);
 const deadline=Date.now()+120000;
 while(Date.now()<deadline){if(failure)throw failure;await new Promise(r=>setTimeout(r,2000));if(await fs.access(path.join(scratch,'completed.json')).then(()=>true,()=>false)){
   // Preserve the validated package; cleanup still requires exact-run process absence.
   const archive=path.join('C:\\Dev\\Scratch\\UnrealAutoSetupTests',path.basename(scratch)+'-artifact');await fs.mkdir(archive,{recursive:true});await fs.copyFile(packageFile,path.join(archive,path.basename(packageFile)));
   if(await require('../phase3b2b/cleanup.cjs')(scratch,['completed.json'])){console.log('Installed package passed; profile cleaned. VSIX: '+path.join(archive,path.basename(packageFile)));await fs.writeFile(path.join(record,'package-location.txt'),path.join(archive,path.basename(packageFile)));return;}
  }}
 child.unref();throw Error('Incomplete package host; retained '+scratch);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
