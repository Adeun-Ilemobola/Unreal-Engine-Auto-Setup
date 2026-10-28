'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');let checked=0;
function scan(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
 const filename=path.join(directory,entry.name);
 if(entry.isDirectory()){if(!['node_modules','native'].includes(entry.name))scan(filename);}
 else if(/\.(js|cjs)$/.test(entry.name)){execFileSync(process.execPath,['--check',filename],{stdio:'pipe'});checked++;}
}}
scan(path.join(root,'unreal-auto-setup'));scan(path.join(root,'tools'));
const old=JSON.parse(execFileSync('git',['show','70b4a088:unreal-auto-setup/package.json'],{cwd:root,encoding:'utf8'}));
const current=JSON.parse(fs.readFileSync(path.join(root,'unreal-auto-setup/package.json'),'utf8'));
const oldTest=old.scripts.test,newTest=current.scripts.test;old.scripts.test=newTest;assert.deepEqual(current,old);
assert.equal(execFileSync('git',['diff','70b4a088','--','unreal-auto-setup/tests/generation.test.js','unreal-auto-setup/generation.js'],{cwd:root,encoding:'utf8'}),'');
require(path.join(root,'unreal-auto-setup/processSupervisor')).verifyHelper().then(helper=>{
 console.log(JSON.stringify({syntaxFiles:checked,manifestChange:{oldTest,newTest},publicManifestUnchanged:true,preservationUnchanged:true,helperHash:helper.helperHash},null,2));
}).catch(error=>{console.error(error);process.exitCode=1;});
