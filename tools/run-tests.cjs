'use strict';
// Isolate compiler-internal temporary output as well as explicit fixture files.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const repository=path.resolve(__dirname,'..');
const base=process.platform==='win32'?'C:\\Dev\\Scratch\\UnrealAutoSetupTests':path.join(os.tmpdir(),'UnrealAutoSetupTests');
fs.mkdirSync(base,{recursive:true});
if(fs.lstatSync(base).isSymbolicLink())throw new Error('Test scratch root must not be a link');
const scratch=fs.mkdtempSync(path.join(base,'suite-'));
const requested=process.argv.slice(2);
const files=requested.length?requested:fs.readdirSync(path.join(repository,'unreal-auto-setup/tests')).filter(name=>name.endsWith('.test.js')).map(name=>'tests/'+name);
console.log('Test scratch: '+scratch);
const child=spawn(process.execPath,['--test',...files],{cwd:path.join(repository,'unreal-auto-setup'),stdio:'inherit',env:{...process.env,TEMP:scratch,TMP:scratch,TMPDIR:scratch,UNREAL_AUTO_SETUP_TEST_TEMP:scratch}});
let cleaned=false;
function cleanup(){if(!cleaned){cleaned=true;fs.rmSync(scratch,{recursive:true,force:true,maxRetries:5});}}
child.on('error',error=>{console.error(error.message);cleanup();process.exitCode=1;});
child.on('close',code=>{cleanup();process.exitCode=code??1;});
