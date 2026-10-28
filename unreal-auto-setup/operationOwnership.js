'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {randomUUID, createHash} = require('node:crypto');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {powershell} = require('./processes');
const LIMIT = 256;
const hash = text => createHash('sha256').update(text).digest('hex');
function classify(expected, observed) {
  return observed && ['pid','creation','executable','command'].every(key =>
    expected[key] && expected[key] === observed[key]) ? 'Observed active' : 'Unknown';
}
async function query(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;
  const script = "$ErrorActionPreference='Stop'; $p=Get-CimInstance Win32_Process -Filter 'ProcessId = " + pid + "'; if($p){@{pid=[int]$p.ProcessId;creation=$p.CreationDate.ToUniversalTime().ToString('o');executable=$p.ExecutablePath;command=$p.CommandLine}|ConvertTo-Json -Compress}";
  try {
    const {stdout} = await promisify(execFile)(powershell(), ['-NoLogo','-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')], {windowsHide:true,timeout:5000,maxBuffer:32768});
    return stdout.trim() ? JSON.parse(stdout) : null;
  } catch { return null; }
}
async function canonical(project) {
  const actual = await fs.realpath(project);
  return process.platform === 'win32' ? actual.toLowerCase() : actual;
}
async function regular(filename) {
  const stat = await fs.lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 32768) throw new Error('Unsafe recovery metadata');
  return JSON.parse(await fs.readFile(filename,'utf8'));
}
async function write(filename, value) {
  const handle = await fs.open(filename,'wx');
  try { await handle.writeFile(JSON.stringify(value)); await handle.sync(); }
  finally { await handle.close(); }
}
/** Immutable quarantine records. A root-close event cannot release a spawned claim. */
function create(root, {queryProcess=query}={}) {
  async function directory(project) { return path.join(root,hash(await canonical(project))); }
  async function safeRoot() {
    await fs.mkdir(root,{recursive:true});
    const stat=await fs.lstat(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Unsafe recovery storage');
  }
  async function inspect(project, {probe=false}={}) {
    let location;
    try {
      location=await directory(project);
      let stat;
      try { stat=await fs.lstat(location); } catch(error) { if(error.code==='ENOENT') return {state:'Clear'}; throw error; }
      if(!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Unsafe claim');
      const record=await regular(path.join(location,'intent.json'));
      if(record.schema!==1 || record.project!==await canonical(project) || !/^[0-9a-f-]{36}$/.test(record.operationId) || !['build','generation'].includes(record.kind)) throw new Error('Invalid claim schema or project');
      // Old quarantine records have no supervision plan and remain unresolved.
      try {
        const proof=await require('./processSupervisor').outcome(location,record);
        if(probe) {await release(location,record);return {state:'Clear',previous:proof};}
        return {state:'Completed',operationId:record.operationId,previous:proof,directory:location};
      } catch(error) {if(error.code!=='ENOENT') return {state:'Unknown',directory:location,reason:'Recovery blocked: '+error.message};}
      if(probe) {
        try {
          const started=await regular(path.join(location,'supervisor-started.json'));
          const plan=await regular(path.join(location,'supervision.json'));
          const helper=await require('./processSupervisor').verifyHelper();
          const actual=await queryProcess(started.pid);
          if(started.operationId===record.operationId && started.project===record.project && started.helperHash===helper.helperHash && started.commandHash===plan.commandHash && actual?.executable?.toLowerCase()===helper.executable.toLowerCase() && actual.command?.includes(location) && Date.parse(actual.creation)===Date.parse(started.creation))
            return {state:'Running',operationId:record.operationId,directory:location,reason:'Recovery blocked: verified supervisor is managing the previous operation. Retry after its full tree completes.'};
        } catch {}
      }
      let identity, observation='Unknown';
      if(probe) {
        try { identity=await regular(path.join(location,'identity.json')); observation=classify(identity,await queryProcess(identity.pid)); } catch {}
      }
      return {state:'Unknown',observation,operationId:record.operationId,directory:location,
        reason:'Recovery blocked: previous managed '+record.kind+' '+record.operationId+'. '+observation+'. Full process-tree exit and execution result are unconfirmed. Inspect '+location+'; do not remove its claim until all associated work is independently verified stopped.'};
    } catch(error) { return {state:'Unknown',directory:location,reason:'Recovery blocked: missing, corrupt or inaccessible ownership metadata. '+error.message}; }
  }
  async function release(location,record) {
    const lock=path.join(location,'release-lock');
    await fs.mkdir(lock); // No stale-lease theft; a crash here remains conservative.
    let moved=false;
    try {
      const current=await regular(path.join(location,'intent.json'));
      if(current.operationId!==record.operationId)throw new Error('Release owner changed');
      await require('./processSupervisor').outcome(location,current);
      const retired=path.join(root,'.completed-'+record.operationId);
      await fs.rename(location,retired);moved=true;
      await fs.rm(retired,{recursive:true});
    } finally {if(!moved)await fs.rmdir(lock).catch(()=>{});}
  }
  async function begin(project,kind) {
    if(!['build','generation'].includes(kind)) throw new Error('Unsupported operation kind');
    await safeRoot();
    const location=await directory(project);
    // Serialize only admission, never the operation lifetime. An interrupted
    // transaction stays locked; elapsed time is not ownership evidence.
    const admission=path.join(root,'.admission-lock');
    let acquired=false;
    for(let attempt=0;attempt<100;attempt++) {
      try {await fs.mkdir(admission);acquired=true;break;}
      catch(error) {if(error.code!=='EEXIST')throw error;}
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    if(!acquired)throw new Error('Recovery admission is busy or interrupted; retain the lock for review.');
    let operationId;
    try {
    let count=0;
    const entries=await fs.opendir(root);
    for await(const entry of entries) { if(entry.name!=='.admission-lock' && ++count>=LIMIT) throw new Error('Recovery claim quota reached; retain unresolved records for review.'); }
    try { await fs.mkdir(location); } catch(error) {
      if(error.code==='EEXIST') throw new Error((await inspect(project)).reason || 'Recovery claim exists');
      throw error;
    }
    operationId=randomUUID();
    // Failure after mkdir deliberately leaves a blocking partial claim.
    await write(path.join(location,'intent.json'),{schema:1,operationId,project:await canonical(project),kind,created:new Date().toISOString()});
    } finally {await fs.rmdir(admission);}
    let attempted=false;
    return {operationId,directory:location,
      async complete() {return release(location,await regular(path.join(location,'intent.json')));},
      async spawnAttempted(encoded) { attempted=true; await write(path.join(location,'spawn.json'),{schema:1,operationId,commandHash:hash(encoded)}); },
      async observe(pid,command) {
        const identity=await queryProcess(pid);
        if(identity?.pid!==pid || identity.executable?.toLowerCase()!==powershell().toLowerCase() || !identity.creation || !identity.command?.includes(command)) return;
        await write(path.join(location,'identity.json'),identity);
      },
      async exited(exitCode) { await write(path.join(location,'root-exit.json'),{schema:1,operationId,exitCode,treeExitConfirmed:false}); },
      async abandonBeforeSpawn() {
        if(attempted) throw new Error('Spawn attempted; tree ownership remains uncertain');
        const record=await regular(path.join(location,'intent.json'));
        if(record.operationId!==operationId) throw new Error('Recovery owner changed');
        await fs.unlink(path.join(location,'intent.json'));await fs.rmdir(location);
      }
    };
  }
  return {begin,inspect};
}
module.exports={create,classify,query};
