'use strict';
const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');

const powershell = () => path.join(process.env.SystemRoot || 'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
const canonical = value => path.win32.normalize(value.replace(/^\\\\\?\\/, '')).toLowerCase();

function commandArguments(commandLine) {
  // Windows command-line quoting: backslashes are special only before a quote.
  const args=[]; let value='', quoted=false, started=false;
  for(let i=0;i<commandLine.length;i++) {
    const ch=commandLine[i];
    if(ch==='\\') {
      let count=1; while(commandLine[i+1]==='\\') {count++;i++;}
      if(commandLine[i+1]==='"') {
        value+='\\'.repeat(Math.floor(count/2));i++;
        if(count%2) value+='"';else quoted=!quoted;
      } else value+='\\'.repeat(count);
      started=true;
    } else if(ch==='"') {quoted=!quoted;started=true;}
    else if(/\s/.test(ch) && !quoted) {if(started) {args.push(value);value='';started=false;}}
    else {value+=ch;started=true;}
  }
  if(quoted) throw new Error('Malformed process command line');
  if(started) args.push(value);
  return args;
}

function associate(records,projectFile) {
  const processes=[];let uncertain=false;
  for(const record of records) {
    if(!record || !Number.isInteger(Number(record.ProcessId)) || Number(record.ProcessId)<=0) {uncertain=true;continue;}
    if(record.Name && record.Name.toLowerCase()!=='unrealeditor.exe') continue;
    const item={pid:Number(record.ProcessId),executable:record.ExecutablePath || undefined,commandLine:record.CommandLine || undefined,matches:false};
    try {
      if(typeof item.commandLine!=='string') throw new Error('Command line unavailable');
      const args=commandArguments(item.commandLine).map(arg=>arg.replace(/^-project=/i,''));
      const descriptors=args.filter(arg=>/\.uproject$/i.test(arg));
      if(!descriptors.length || descriptors.some(arg=>!path.win32.isAbsolute(arg))) uncertain=true;
      item.matches=descriptors.some(arg=>path.win32.isAbsolute(arg) && canonical(arg)===canonical(projectFile));
    } catch {uncertain=true;}
    processes.push(item);
  }
  const matches=processes.filter(item=>item.matches);
  return {state:matches.length?'Running':uncertain?'Unknown':'Stopped',matches,processes,checkedAt:Date.now()};
}

async function query(projectFile,{execute=promisify(execFile)}={}) {
  try {
    const script="$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); $items=@(Get-CimInstance Win32_Process -Filter \"Name = 'UnrealEditor.exe'\" | Select-Object ProcessId,Name,ExecutablePath,CommandLine); ConvertTo-Json -InputObject $items -Compress";
    const {stdout}=await execute(powershell(),['-NoLogo','-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:8000,maxBuffer:2*1024*1024,encoding:'utf8'});
    const data=JSON.parse(stdout.replace(/^\uFEFF/,''));
    if(!Array.isArray(data)) throw new Error('Unexpected process-query response');
    return associate(data,projectFile);
  } catch(error) {
    const reason=/access denied/i.test(error.message) ? 'Windows denied access to Editor process information.' : error.killed ? 'Windows process query timed out.' : error.code ? 'Windows process query failed (code '+error.code+').' : error.message.slice(0,200);
    return {state:'Unknown',matches:[],processes:[],error:reason,checkedAt:Date.now()};
  }
}

function createService(queryProcesses=query) {
  const cache=new Map(),pending=new Map();
  return {async get(projectFile,{fresh=false}={}) {
    const cached=cache.get(projectFile);
    if(!fresh && cached && Date.now()-cached.checkedAt<5000) return cached;
    if(pending.has(projectFile)) return pending.get(projectFile);
    const request=Promise.resolve().then(()=>queryProcesses(projectFile)).then(result=>{cache.set(projectFile,result);return result;}).finally(()=>pending.delete(projectFile));
    pending.set(projectFile,request);return request;
  }};
}
module.exports={powershell,commandArguments,associate,query,createService};
