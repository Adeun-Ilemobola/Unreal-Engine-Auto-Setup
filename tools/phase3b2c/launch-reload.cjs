'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const repository=path.resolve(__dirname,'../..');
const project=path.join(repository,'.local-test-projects/Phase3AIntegration');
const scratchBase='C:\\Dev\\Scratch\\UnrealAutoSetupTests';
fs.mkdirSync(scratchBase,{recursive:true});
const scratch=fs.mkdtempSync(path.join(scratchBase,'integration-'));
const driver=path.join(scratch,'driver'),profile=path.join(scratch,'profile');
fs.mkdirSync(driver);fs.mkdirSync(path.join(profile,'User'),{recursive:true});
fs.writeFileSync(path.join(driver,'package.json'),JSON.stringify({name:'phase3b2b-driver',publisher:'local-test',version:'0.0.1',engines:{vscode:'^1.100.0'},main:'./extension.cjs',activationEvents:['onStartupFinished']}));
fs.writeFileSync(path.join(driver,'extension.cjs'),'module.exports=require('+JSON.stringify(path.join(__dirname,'reload-host.cjs'))+');');
fs.writeFileSync(path.join(profile,'User/settings.json'),JSON.stringify({'unrealSetup.autoSetup':false,'unrealSetup.automationMode':'watch','security.workspace.trust.enabled':false,'unrealEngine.enginePath':'C:\\Program Files\\Epic Games\\UE_5.8'}));
const record=path.join(repository,'docs/maintenance/runs/0009-phase3b2c');
fs.appendFileSync(path.join(record,'integration-roots.jsonl'),JSON.stringify({scratch,profile,time:new Date().toISOString()})+'\n');
console.log('Integration scratch: '+scratch);
const child=spawn('C:\\Users\\Owner\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',['--new-window','--user-data-dir='+profile,'--extensions-dir='+path.join(project,'host-extensions'),'--extensionDevelopmentPath='+path.join(repository,'unreal-auto-setup'),'--extensionDevelopmentPath='+driver,project],{cwd:project,stdio:'ignore',env:{...process.env,TEMP:scratch,TMP:scratch,TMPDIR:scratch,UNREAL_AUTO_SETUP_INTEGRATION_ROOT:scratch}});
child.on('error',error=>{console.error(error);process.exitCode=1;});
// Preserve the profile/journal on failure. Successful driver cleanup is separate
// from launcher exit: Code.exe may hand off before its window closes.

let ended=false;child.on('close',()=>{ended=true;});
const deadline=Date.now()+5*60*1000;
let checking=false;
const timer=setInterval(async()=>{
 if(checking)return;
 checking=true;
 try {
 if(ended && fs.existsSync(path.join(scratch,'completed.json'))) {
  if(await require('../phase3b2b/cleanup.cjs')(scratch,['completed.json'])) {clearInterval(timer);console.log('Cleaned completed integration scratch: '+scratch);return;}
 }
 if(Date.now()>deadline) {clearInterval(timer);console.log('Unfinished integration retained for review: '+scratch);process.exitCode=1;}
 }catch(error){clearInterval(timer);console.error('Scratch retained: '+error.message);process.exitCode=1;}finally{checking=false;}
},2000);
