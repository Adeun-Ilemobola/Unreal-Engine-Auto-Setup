'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
// Test-only cleanup: completion barriers plus absence of any process mentioning
// this exact per-run directory. An unavailable process query retains evidence.
module.exports=async function cleanup(scratch,markers){
 const base=path.resolve('C:\\Dev\\Scratch\\UnrealAutoSetupTests');
 const target=path.resolve(scratch),relative=path.relative(base,target);
 if(!relative || relative.startsWith('..') || path.isAbsolute(relative))throw new Error('Cleanup outside test scratch refused');
 for(const marker of markers)await fs.access(path.join(target,marker));
 const quoted=target.replace(/'/g,"''");
 const script="$ErrorActionPreference='Stop'; $matches=@(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf('"+quoted+"',[StringComparison]::OrdinalIgnoreCase) -ge 0 }); $matches.Count";
 const {stdout}=await promisify(execFile)(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:10000,maxBuffer:4096});
 if(stdout.trim()!=='0')return false;
 if((await fs.lstat(target)).isSymbolicLink())throw new Error('Linked scratch refused');
 await fs.rm(target,{recursive:true,force:true,maxRetries:5,retryDelay:100});return true;
};
