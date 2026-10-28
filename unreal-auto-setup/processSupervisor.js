'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash,randomUUID}=require('node:crypto');
const {spawn}=require('node:child_process');
const {EventEmitter}=require('node:events');
const {PassThrough}=require('node:stream');
const hash=value=>createHash('sha256').update(value).digest('hex');
const native=path.join(__dirname,'native');
async function read(file) {
  const stat=await fs.lstat(file);
  if(!stat.isFile() || stat.isSymbolicLink() || stat.nlink!==1 || stat.size>32768) throw new Error('Unsafe supervision metadata');
  return JSON.parse(await fs.readFile(file,'utf8'));
}
async function write(file,data) {
  const temp=file+'.'+randomUUID()+'.partial';
  const fd=await fs.open(temp,'wx');
  try {await fd.writeFile(JSON.stringify(data));await fd.sync();}finally{await fd.close();}
  // Metadata has one writer; rename exposes only complete JSON.
  await fs.rename(temp,file);
}
async function verifyHelper() {
  const manifest=JSON.parse((await fs.readFile(path.join(native,'supervisor-build.json'),'utf8')).replace(/^\uFEFF/,''));
  const executable=path.join(native,'OperationSupervisor.exe');
  if(manifest.schema!==1 || hash(await fs.readFile(executable))!==manifest.binarySha256 || hash(await fs.readFile(path.join(native,'OperationSupervisor.cs')))!==manifest.sourceSha256) throw new Error('Supervisor binary/source identity mismatch; rebuild using tools/phase3b2b/build-helper.ps1.');
  return {executable,helperHash:manifest.binarySha256};
}
/** A journal proof is accepted only for the exact launch, helper and descriptor. */
async function outcome(directory,record) {
  const plan=await read(path.join(directory,'supervision.json'));
  const proof=await read(path.join(directory,'tree-complete.json'));
  const spawn=await read(path.join(directory,'spawn.json'));
  const helper=await verifyHelper();
  if(plan.schema!==1 || proof.schema!==1 || plan.operationId!==record.operationId || spawn.operationId!==record.operationId || spawn.commandHash!==plan.commandHash || proof.operationId!==record.operationId || plan.project!==record.project || proof.project!==record.project || plan.helperHash!==helper.helperHash || proof.helperHash!==plan.helperHash || proof.commandHash!==plan.commandHash || plan.commandHash!==hash(plan.encoded) || proof.containment!=='windows-job-v1' || proof.activeProcesses!==0 || proof.rootExited!==true || !Number.isInteger(proof.exitCode) || typeof proof.cancelled!=='boolean') throw new Error('Unverified process-tree completion');
  return proof;
}
async function cancel(claim) {
  const intent=await read(path.join(claim.directory,'intent.json'));
  const plan=await read(path.join(claim.directory,'supervision.json'));
  if(intent.operationId!==claim.operationId || plan.operationId!==intent.operationId || plan.project!==intent.project) throw new Error('Cancellation ownership mismatch');
  const filename=path.join(claim.directory,'cancel.json');
  try {const existing=await read(filename);if(existing.operationId!==intent.operationId || existing.commandHash!==plan.commandHash)throw new Error('Cancellation identity mismatch');return;}catch(error){if(error.code!=='ENOENT')throw error;}
  await write(filename,{schema:1,operationId:intent.operationId,commandHash:plan.commandHash});
}
async function launch(claim,encoded) {
  const helper=await verifyHelper(),intent=await read(path.join(claim.directory,'intent.json'));
  if(intent.operationId!==claim.operationId)throw new Error('Launch ownership mismatch');
  await write(path.join(claim.directory,'supervision.json'),{schema:1,operationId:intent.operationId,project:intent.project,encoded,commandHash:hash(encoded),helperHash:helper.helperHash});
  const child=spawn(helper.executable,[claim.directory],{windowsHide:true,stdio:'ignore'});
  const wrapper=new EventEmitter();wrapper.pid=child.pid;wrapper.stdout=new PassThrough();wrapper.stderr=new PassThrough();wrapper.cancel=()=>cancel(claim);wrapper.detach=()=>{finished=true;child.unref();wrapper.stdout.destroy();wrapper.stderr.destroy();};
  let exited=false,failed,finished=false,lastProbe=0;const launched=Date.now();
  const offsets={stdout:0,stderr:0};
  child.on('error',error=>{failed=error;exited=true;});child.on('close',()=>{exited=true;});
  async function drain() {
    for(const stream of ['stdout','stderr']) {
      let file;
      try {
        file=await fs.open(path.join(claim.directory,stream+'.log'),'r');
        const stat=await file.stat();if(stat.size>64*1024*1024)throw new Error('Supervised output limit exceeded');
        while(offsets[stream]<stat.size) {const buffer=Buffer.alloc(Math.min(65536,stat.size-offsets[stream]));const {bytesRead}=await file.read(buffer,0,buffer.length,offsets[stream]);if(!bytesRead)break;offsets[stream]+=bytesRead;wrapper[stream].write(buffer.subarray(0,bytesRead));}
      }catch(error){if(error.code!=='ENOENT')throw error;}finally{await file?.close();}
    }
  }
  async function poll() {
    if(finished)return;
    try {
      await drain();
      let proof;
      try {proof=await outcome(claim.directory,intent);}catch(error){if(error.code!=='ENOENT')throw error;}
      if(proof){await drain();finished=true;wrapper.proof=proof;wrapper.emit('close',proof.exitCode);return;}
      if(exited) {
        let boot;try{boot=await read(path.join(claim.directory,'supervisor-bootstrap.json'));}catch{}
        if(boot && boot.operationId===intent.operationId) {
          if(Date.now()-lastProbe>2000) {
            lastProbe=Date.now();
            const observed=await require('./operationOwnership').query(boot.pid);
            if(!observed || observed.executable?.toLowerCase()!==helper.executable.toLowerCase() || !observed.command?.includes(claim.directory)) {
              try{const late=await outcome(claim.directory,intent);await drain();finished=true;wrapper.proof=late;wrapper.emit('close',late.exitCode);return;}catch{}
              throw new Error('Independent supervisor identity lost. Recovery remains blocked.');
            }
          }
          setTimeout(()=>void poll(),100);return;
        }
        if(Date.now()-launched<8000){setTimeout(()=>void poll(),100);return;}
        let detail;try{detail=await read(path.join(claim.directory,'supervisor-failed.json'));}catch{} throw failed || new Error('Supervisor ended without verified tree completion. Recovery remains blocked. '+(detail?.error||''));}
    }catch(error){finished=true;wrapper.emit('error',error);return;}
    setTimeout(()=>void poll(),100);
  }
  // Callers attach listeners synchronously after launch resolves.
  setTimeout(()=>void poll(),0);
  return wrapper;
}
module.exports={launch,cancel,outcome,verifyHelper};
