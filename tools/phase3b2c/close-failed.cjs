'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
// Exact failed runs from this phase; retain their files, close only their profiles.
for(const name of ['qualification-Maq3hF','qualification-DzANAb']){
 const scratch=path.join('C:\\Dev\\Scratch\\UnrealAutoSetupTests',name),profile=path.join(scratch,'profile'),driver=path.join(scratch,'close-driver');
 if(!fs.existsSync(profile))throw Error('Missing known profile');fs.mkdirSync(driver,{recursive:true});
 fs.writeFileSync(path.join(driver,'package.json'),JSON.stringify({name:'close-owned-profile',publisher:'local-test',version:'0.0.1',engines:{vscode:'^1.100.0'},activationEvents:['onStartupFinished'],main:'./extension.cjs'}));
 fs.writeFileSync(path.join(driver,'extension.cjs'),"exports.activate=async context=>{if(!context.globalStorageUri.fsPath.toLowerCase().startsWith("+JSON.stringify(profile.toLowerCase())+"))throw Error('Wrong profile');await require('vscode').commands.executeCommand('workbench.action.quit');};");
 const env={...process.env,TEMP:scratch,TMP:scratch,TMPDIR:scratch};delete env.ELECTRON_RUN_AS_NODE;
 spawn('C:\\Users\\Owner\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',['--new-window','--user-data-dir='+profile,'--extensions-dir='+path.join(scratch,'extensions'),'--extensionDevelopmentPath='+driver,path.resolve(__dirname,'../../.local-test-projects/Phase3AIntegration')],{env,windowsHide:true,stdio:'ignore'});
}
