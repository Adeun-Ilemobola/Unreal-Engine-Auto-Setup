'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process');
async function main(){
 const root=path.resolve(__dirname,'../..'),scratch=await fs.mkdtemp('C:\\Dev\\Scratch\\UnrealAutoSetupTests\\real-debug-'),profile=path.join(scratch,'profile'),extensions=path.join(scratch,'extensions');
 await fs.mkdir(path.join(profile,'User'),{recursive:true});await fs.mkdir(extensions);
 const installed=path.join(process.env.USERPROFILE,'.vscode/extensions');
 const candidates=(await fs.readdir(installed)).filter(name=>/^ms-vscode\.cpptools-\d.*win32-x64$/.test(name)).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
 if(!candidates.length)throw Error('An existing Microsoft C/C++ installation is required; this harness does not download extensions');
 const cpp=path.join(installed,candidates[0]);
 await fs.cp(cpp,path.join(extensions,path.basename(cpp)),{recursive:true,errorOnExist:true});
 await fs.writeFile(path.join(profile,'User/settings.json'),JSON.stringify({'security.workspace.trust.enabled':false,'unrealSetup.autoSetup':false,'unrealSetup.automationMode':'watch','extensions.autoUpdate':false,'extensions.autoCheckUpdates':false,'C_Cpp.intelliSenseEngine':'disabled'}));
 const env={...process.env,TEMP:scratch,TMP:scratch,TMPDIR:scratch,UNREAL_AUTO_SETUP_INTEGRATION_ROOT:scratch};delete env.ELECTRON_RUN_AS_NODE;
 const child=spawn(path.join(process.env.LOCALAPPDATA,'Programs/Microsoft VS Code/Code.exe'),['--new-window','--user-data-dir='+profile,'--extensions-dir='+extensions,'--extensionDevelopmentPath='+path.join(root,'unreal-auto-setup'),'--extensionTestsPath='+path.join(__dirname,'debug-host.cjs'),path.join(root,'.local-test-projects/Phase3AIntegration')],{env,stdio:'ignore',windowsHide:true});
 console.log('Real debugger scratch: '+scratch);let failure;child.on('error',e=>failure=e);
 const deadline=Date.now()+240000;
 while(Date.now()<deadline){if(failure)throw failure;await new Promise(r=>setTimeout(r,2000));if(await fs.access(path.join(scratch,'completed.json')).then(()=>true,()=>false)){if(await require('../phase3b2b/cleanup.cjs')(scratch,['completed.json'])){console.log('Verified debugger cleanup');return;}}}
 child.unref();throw Error('Debugger run incomplete; evidence retained: '+scratch);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
