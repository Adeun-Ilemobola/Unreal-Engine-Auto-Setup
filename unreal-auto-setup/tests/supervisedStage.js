'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const ownership=require('../operationOwnership'),supervisor=require('../processSupervisor');
async function runStage(name,exe,args,cwd,logFile,timeoutMs=300000,{signal}={}) {
 const result={name,command:exe,args,exitCode:null,status:'Failed',timedOut:false,logFile};
 let child,timer,abort,output='',claim,settled=false,attempted=false;
 try {
  const actual=await fs.realpath(cwd),base=await fs.realpath('C:\\Dev\\Scratch\\UnrealAutoSetupTests');
  const relative=path.relative(base,actual);if(!relative || relative.startsWith('..') || path.isAbsolute(relative))throw Error('Stage must run inside isolated development scratch');
  const directory=await fs.mkdtemp(path.join(actual,'stage-'));result.directory=directory;
  const descriptor=path.join(directory,'Stage.uproject');await fs.writeFile(descriptor,'{}',{flag:'wx'});
  claim=await ownership.create(path.join(directory,'claims')).begin(descriptor,'build');
  const script=require('../build').script({executable:exe,args});const encoded=Buffer.from('# Operation '+claim.operationId+'\nSet-Location -LiteralPath '+require('../build').quote(actual)+'; '+script,'utf16le').toString('base64');
  await claim.spawnAttempted(encoded);attempted=true;child=await supervisor.launch(claim,encoded,{env:{...process.env,TEMP:directory,TMP:directory,TMPDIR:directory}});
  child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',b=>{output+=b;});
  const completion=new Promise((resolve,reject)=>{child.once('close',resolve);child.once('error',reject);});
  const cancel=()=>{void child.cancel().catch(error=>{result.cancelError=error.message;});};
  timer=setTimeout(()=>{result.timedOut=true;cancel();},timeoutMs);
  abort=()=>{result.cancelled=true;cancel();};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  let limit;try {result.exitCode=await Promise.race([completion,new Promise((_,reject)=>{limit=setTimeout(()=>reject(Error('No verified tree completion after cancellation deadline')),timeoutMs+15000);})]);}finally{clearTimeout(limit);}
  result.proof=child.proof;await claim.complete();settled=true;
  result.status=result.exitCode===0 && !result.timedOut && !result.cancelled?'Passed':'Failed';
  if(result.timedOut)result.error='Stage timed out; owned job cancellation and full-tree completion verified';
  if(result.cancelled)result.error='Stage cancelled; full-tree completion verified';
  if(result.status==='Failed' && !result.error)result.error='Command exited '+result.exitCode;
 }catch(error){result.error=error.message;result.status=attempted && !settled?'Unknown':'Failed';}
 finally {
  clearTimeout(timer);signal?.removeEventListener('abort',abort);
  if(attempted && !settled){child?.detach();result.retained=true;if(process.env.UNREAL_AUTO_SETUP_TEST_TEMP)await fs.writeFile(path.join(process.env.UNREAL_AUTO_SETUP_TEST_TEMP,'.retain'),'Uncertain owned job; inspect stage journals');}
  try{await fs.writeFile(logFile,output);}catch(error){if(result.status!=='Unknown')result.status='Failed';result.error='Stage log could not be written: '+error.message;}
 }
 return result;
}
module.exports={runStage};
