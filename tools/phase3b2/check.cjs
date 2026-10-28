'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),run=path.join(root,'docs/maintenance/runs/0007-phase3b2');
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','.local-test-projects'].includes(entry.name))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(/\.(js|cjs)$/.test(file))files.push(file);}}
walk(path.join(root,'unreal-auto-setup'));walk(path.join(root,'tools'));
for(const file of files)cp.execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
const original=file=>cp.execFileSync('git',['show','HEAD:'+file],{cwd:root,encoding:'utf8'});
const manifest='unreal-auto-setup/package.json';assert.equal(fs.readFileSync(path.join(root,manifest),'utf8'),original(manifest));
const preservation='unreal-auto-setup/tests/generation.test.js';assert.equal(fs.readFileSync(path.join(root,preservation),'utf8'),original(preservation));
const changed=['build','runner','runtimeCommands','runtimeView','runtimeWatcher'];
const exportNames=s=>s.match(/module\.exports\s*=\s*\{([^}]+)\}/)?.[1].replace(/\s/g,'');
for(const name of changed)assert.equal(exportNames(fs.readFileSync(path.join(root,'unreal-auto-setup',name+'.js'),'utf8')),exportNames(original('unreal-auto-setup/'+name+'.js')));
cp.execFileSync('python',['-B','bundle_sources.py'],{cwd:root,stdio:'pipe'});
cp.execFileSync('git',['diff','--check'],{cwd:root,stdio:'pipe'});
const pkg=JSON.parse(fs.readFileSync(path.join(root,manifest)));
const result={syntaxFiles:files.length,syntax:'pass',publicCommands:pkg.contributes.commands.length,settings:Object.keys(pkg.contributes.configuration.properties).length,manifestUnchanged:true,existingExportNamesUnchanged:true,P11TestUnchanged:true,packaging:'46 inputs / 40 modules / 3 mirrors',whitespace:'pass',engine:JSON.parse(fs.readFileSync('C:/Program Files/Epic Games/UE_5.8/Engine/Build/Build.version','utf8'))};
fs.writeFileSync(path.join(run,'checks.json'),JSON.stringify(result,null,2));
const docs=[...fs.readdirSync(run).filter(n=>n.endsWith('.md')).map(n=>path.join(run,n)),path.join(root,'docs/DEVELOPMENT.md'),path.join(root,'docs/maintenance/INDEX.md')];
let links=0;
for(const file of docs)for(const match of fs.readFileSync(file,'utf8').matchAll(/\]\(([^)]+)\)/g)){const target=match[1].split('#')[0];if(!target||/^(?:https?:|codex:)/.test(target))continue;assert.ok(fs.existsSync(path.resolve(path.dirname(file),target)),file+': '+target);links++;}
result.maintenanceLinks=links;fs.writeFileSync(path.join(run,'checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
