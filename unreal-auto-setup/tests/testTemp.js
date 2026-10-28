'use strict';
// Test-only scratch storage. Never import this module from production code.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const base=process.env.UNREAL_AUTO_SETUP_TEST_TEMP || (process.platform==='win32' ? 'C:\\Dev\\Scratch\\UnrealAutoSetupTests' : path.join(os.tmpdir(),'UnrealAutoSetupTests'));
fs.mkdirSync(base,{recursive:true});
if(fs.lstatSync(base).isSymbolicLink())throw new Error('Test scratch root must not be a link');
const directory=fs.mkdtempSync(path.join(base,'node-'+process.pid+'-'));
// Only this test process and children (including csc/PowerShell) inherit these.
process.env.TEMP=directory;process.env.TMP=directory;process.env.TMPDIR=directory;
process.on('exit',()=>{if(!fs.existsSync(path.join(base,'.retain')))fs.rmSync(directory,{recursive:true,force:true,maxRetries:3});});
module.exports={root:()=>directory,base};
