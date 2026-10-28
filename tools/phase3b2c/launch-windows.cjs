'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),project=path.join(root,'.local-test-projects/Phase3AIntegration');
fs.mkdirSync('C:\\Dev\\Scratch\\UnrealAutoSetupTests',{recursive:true});
const scratch=fs.mkdtempSync('C:\\Dev\\Scratch\\UnrealAutoSetupTests\\windows-');
const env={...process.env,TEMP:scratch,TMP:scratch,TMPDIR:scratch,UNREAL_AUTO_SETUP_INTEGRATION_ROOT:scratch};
fs.writeFileSync(path.join(scratch,'Other.uproject'),'{}');
execFileSync(path.join(process.env.SystemRoot,'Microsoft.NET/Framework64/v4.0.30319/csc.exe'),['/nologo','/target:exe','/out:'+path.join(scratch,'TreeFixture.exe'),path.join(__dirname,'../phase3b2b/TreeFixture.cs')],{env});
fs.appendFileSync(path.join(root,'docs/maintenance/runs/0009-phase3b2c/integration-roots.jsonl'),JSON.stringify({scratch,type:'cross-window',time:new Date().toISOString()})+'\n');
for(const role of ['a','b']){
 const profile=path.join(scratch,role),driver=path.join(scratch,'driver-'+role);fs.mkdirSync(path.join(profile,'User'),{recursive:true});fs.mkdirSync(driver);
 fs.writeFileSync(path.join(profile,'User/settings.json'),JSON.stringify({'security.workspace.trust.enabled':false,'unrealSetup.autoSetup':false}));
 fs.writeFileSync(path.join(driver,'package.json'),JSON.stringify({name:'phase3b2b-window-'+role,publisher:'local-test',version:'0.0.1',engines:{vscode:'^1.100.0'},main:'./extension.cjs',activationEvents:['onStartupFinished']}));
 fs.writeFileSync(path.join(driver,'extension.cjs'),'module.exports=require('+JSON.stringify(path.join(__dirname,'cross-window.cjs'))+');');
 const child=spawn('C:\\Users\\Owner\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',['--new-window','--user-data-dir='+profile,'--extensions-dir='+path.join(project,'host-extensions'),'--extensionDevelopmentPath='+path.join(root,'unreal-auto-setup'),'--extensionDevelopmentPath='+driver,project],{stdio:'ignore',cwd:project,env:{...env,UNREAL_AUTO_SETUP_ROLE:role}});child.on('error',error=>{console.error(error);process.exitCode=1;});
}
console.log('Cross-window scratch: '+scratch);
const deadline=Date.now()+120000;let checking=false;
const timer=setInterval(async()=>{
 if(checking)return;checking=true;
 try {
  if(['a','b'].every(role=>fs.existsSync(path.join(scratch,'completed-'+role))) && await require('../phase3b2b/cleanup.cjs')(scratch,['completed-a','completed-b'])) {clearInterval(timer);console.log('Cleaned cross-window scratch: '+scratch);return;}
  if(Date.now()>deadline){clearInterval(timer);console.error('Incomplete cross-window scratch retained: '+scratch);process.exitCode=1;}
 }catch(error){clearInterval(timer);console.error(error.message);process.exitCode=1;}finally{checking=false;}
},2000);
