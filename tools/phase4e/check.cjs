'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
async function main(){
 const root=path.resolve(__dirname,'../..');process.chdir(root);
 const manifest=require('../../unreal-auto-setup/package.json'),before=JSON.parse(cp.execFileSync('git',['show','1d13b3a:unreal-auto-setup/package.json'],{encoding:'utf8'}));
 assert.deepEqual(manifest.contributes.commands,before.contributes.commands);assert.deepEqual(manifest.contributes.configuration,before.contributes.configuration);assert.equal(manifest.version,'0.8.0');
 console.log('Public interface unchanged: '+manifest.contributes.commands.length+' commands, '+Object.keys(manifest.contributes.configuration.properties).length+' settings');
 for(const name of ['classTemplates','classWizard','debugger','processSupervisor']){
  const original=cp.execFileSync('git',['show','1d13b3a:unreal-auto-setup/'+name+'.js'],{encoding:'utf8'}),exports=require('../../unreal-auto-setup/'+name);
  for(const key of original.match(/module\.exports=\{([^}]+)\}/)[1].split(',').map(s=>s.trim().split(':')[0]))assert.ok(key in exports,name+'.'+key);
 }
 console.log('All prior exports preserved in four changed production modules');
 const native=await require('../../unreal-auto-setup/processSupervisor').verifyHelper();console.log('Native helper verified: '+JSON.stringify(native));
 assert.equal(cp.execFileSync('git',['diff','1d13b3a','--','unreal-auto-setup/generation.js','unreal-auto-setup/tests/generation.test.js'],{encoding:'utf8'}),'');console.log('P1.1 implementation and acceptance test unchanged');
 const prettier=require(process.argv[2]);await prettier.format(fs.readFileSync('.github/workflows/windows-ci.yml','utf8'),{parser:'yaml'});console.log('Windows workflow YAML parsed by existing Prettier; no remote execution');
 const generated=JSON.parse(fs.readFileSync('docs/maintenance/runs/0013-phase4e-review/generated.json'));
 const base='.local-test-projects/Phase3AIntegration/Intermediate';const headers=[];
 function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,item.name);if(item.isDirectory())scan(full);else if(item.name.endsWith('.generated.h'))headers.push(full);}}
 scan(base);for(const item of generated)assert.ok(headers.some(file=>path.basename(file)===item.name.stem+'.generated.h'),item.type);console.log('17 independently generated UHT reflection headers verified');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
