'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),{scratch,profile,extensions}=JSON.parse(fs.readFileSync(path.join(root,'docs/maintenance/runs/0009-phase3b2c/scratch.json')));
if(!scratch.startsWith('C:\\Dev\\Scratch\\UnrealAutoSetupTests\\qualification-'))throw Error('Invalid resume path');
fs.writeFileSync(path.join(scratch,'resume-after-close'),'Continue only after process query confirms Stopped');
const env={...process.env,TEMP:scratch,TMP:scratch,TMPDIR:scratch,UNREAL_AUTO_SETUP_INTEGRATION_ROOT:scratch};delete env.ELECTRON_RUN_AS_NODE;
spawn('C:\\Users\\Owner\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',['--new-window','--user-data-dir='+profile,'--extensions-dir='+extensions,'--extensionDevelopmentPath='+path.join(scratch,'driver'),path.join(root,'.local-test-projects/Phase3AIntegration')],{env,stdio:'ignore',windowsHide:true});
let checking=false;const end=Date.now()+120000;
const timer=setInterval(async()=>{if(checking)return;checking=true;try{if(fs.existsSync(path.join(scratch,'completed.json')) && await require('../phase3b2b/cleanup.cjs')(scratch,['completed.json'])){clearInterval(timer);console.log('Verified completed cleanup: '+scratch);return;}if(Date.now()>end){clearInterval(timer);process.exitCode=1;}}catch(e){clearInterval(timer);console.error(e);process.exitCode=1;}finally{checking=false;}},2000);
