'use strict';
const path=require('node:path');
const {spawn,execFile}=require('node:child_process');
const {powershell}=require('./processes');
const {configurations}=require('./project');
const parser=require('./problemParser');

function quote(value) {
  if(/[\r\n\0"%!]/.test(value)) throw new Error('Build paths cannot contain quotes, %, ! or control characters.');
  return "'"+value.replace(/'/g,"''")+"'";
}
function specification(engine,project,selection) {
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(selection.target)) throw new Error('Unsupported target name.');
  if(selection.platform!=='Win64' || !configurations.includes(selection.configuration)) throw new Error('Unsupported build platform/configuration.');
  return {kind:'build',engine,project,...selection,cwd:path.dirname(project),executable:path.join(engine,'Engine','Build','BatchFiles','Build.bat'),args:[selection.target,selection.platform,selection.configuration,'-Project='+project,'-WaitMutex','-NoHotReloadFromIDE']};
}
function skyboxArguments(selection) {
  // Both task generation and direct builds consume the same normalized selection.
  const spec=specification('', '',selection);
  return {mode:'Build',target:spec.target,platform:spec.platform,configuration:spec.configuration};
}
function script(spec) {
  return "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); & "+quote(spec.executable)+' '+spec.args.map(quote).join(' ')+'; exit $LASTEXITCODE';
}
function editorScript(engine,project) {
  return "$ErrorActionPreference='Stop'; & "+quote(path.join(engine,'Engine','Binaries','Win64','UnrealEditor.exe'))+' '+quote(project)+' -log; exit $LASTEXITCODE';
}

/**
 * Context owns one service; each run owns its listeners/emitters until child exit.
 * cancel() settles its acknowledgement on failure/timeout; done and the gate stay
 * pending until exit. Optional durable claims quarantine uncertainty after reload.
 */
function createService(vscode,context,state,{spawnProcess=spawn,stopProcess=pid=>new Promise((resolve,reject)=>{
  // Kill only the extension-owned process tree when the user closes its terminal.
  execFile(path.join(process.env.SystemRoot || 'C:\\Windows','System32','taskkill.exe'),['/PID',String(pid),'/T','/F'],{windowsHide:true,timeout:5000},error=>error?reject(error):resolve());
}),changed=()=>{},cancellationTimeout=6000,setTimer=setTimeout,clearTimer=clearTimeout,ownership,supervision}={}) {
  const diagnostics=vscode.languages.createDiagnosticCollection('unreal-build');
  const output=vscode.window.createOutputChannel?.('Unreal Build History');if(output) context.subscriptions.push(output);
  const owned=new Map();let activeTerminal,activeOperation,disposed=false;
  context.subscriptions.push(diagnostics);
  /**
   * @returns {{done:Promise<import('./contracts').OperationResult>,terminal:Object|undefined,cancel:function():Promise<import('./contracts').CancellationOutcome>}}
   */
  function run(spec) {
    if(disposed) throw new Error('Build service is disposed.');
    if(activeOperation) throw new Error('An operation is still active; process termination must be confirmed before starting another.');
    const write=new vscode.EventEmitter(),close=new vscode.EventEmitter();
    let child,claim,spawnAttempted=false,finished=false,cancelled=false,started=false,conflict=false;
    const pending={stdout:'',stderr:''},byFile=new Map();
    let complete;
    const done=new Promise(resolve=>{complete=resolve;});
    let cancelPromise,resolveCancel,cancelTimer,cancellation={state:'Not requested'};
    const stdout=data=>chunk('stdout',data),stderr=data=>chunk('stderr',data);
    // spawn's error event reports failure to start; cancellation uses taskkill's separate promise.
    const onError=error=>finish(null,error.message);
    const onClose=code=>finish(code);
    function reportCancellation(status,reason) {
      cancellation={state:status,...(reason?{reason}:{}),pid:child?.pid};result.cancellation=cancellation;
      if(status==='Failed' || status==='Unconfirmed') {
        result.status='Blocked';result.reason='Process termination '+status.toLowerCase()+': '+reason+' Waiting for process exit; new operations remain blocked.';
        write.fire('\r\n'+result.reason+'\r\n');output?.appendLine(result.reason);
        vscode.window.showWarningMessage(result.reason);
      }
      spec.onCancellation?.(cancellation);changed();
      if(['Failed','Unconfirmed','Exited'].includes(status)) {
        if(cancelTimer!==undefined) clearTimer(cancelTimer);cancelTimer=undefined;
        resolveCancel?.(cancellation);
      }
    }
    function cancel() {
      if(finished) return Promise.resolve({state:'Exited',pid:child?.pid});
      if(cancelPromise) return cancelPromise;
      cancelled=true;cancelPromise=new Promise(resolve=>{resolveCancel=resolve;});
      reportCancellation('Requested');
      if(!child?.pid && !(supervision && spawnAttempted)) {finish(null);return cancelPromise;}
      cancelTimer=setTimer(()=>reportCancellation('Unconfirmed','No process-exit acknowledgement received within '+cancellationTimeout+' ms.'),cancellationTimeout);
      if(!child) return cancelPromise; // launch is asynchronous; cancel its private job once attached.
      requestCancellation();
      return cancelPromise;
    }
    function requestCancellation() {
      try {
        Promise.resolve(child.cancel ? child.cancel() : stopProcess(child.pid)).then(()=>{if(!finished && cancellation.state==='Requested') reportCancellation('Accepted');},error=>{if(!finished && cancellation.state!=='Exited')reportCancellation('Failed',error.message);});
      } catch(error) {reportCancellation('Failed',error.message);}
    }
    activeOperation={cancel,cancellation:()=>cancellation,detach:()=>{child?.detach?.();write.dispose();close.dispose();}};
    const result={target:spec.target,platform:spec.platform,configuration:spec.configuration,startTime:new Date().toISOString(),completionTime:undefined,status:'Running',success:undefined,exitCode:undefined};
    if(spec.kind==='build') {
      for(const file of owned.get(spec.project) || []) diagnostics.delete(vscode.Uri.file(file));
      owned.set(spec.project,new Set());
      state.get(spec.project).lastBuild=result;
    }
    output?.appendLine('['+result.startTime+'] '+(spec.automatic?'Auto ':'Manual ')+spec.kind+' '+(spec.target || ''));
    changed();
    function line(text) {
      if(spec.kind!=='build') return;
      if(parser.liveCodingConflict(text)) conflict=true;
      const parsed=parser.parse(text,spec.cwd);
      if(!parsed) return;
      const range=new vscode.Range(parsed.line,parsed.column,parsed.line,parsed.column+1);
      const item=new vscode.Diagnostic(range,parsed.message,parsed.severity==='error'?vscode.DiagnosticSeverity.Error:vscode.DiagnosticSeverity.Warning);
      item.source='UnrealBuildTool';if(parsed.code) item.code=parsed.code;
      const entries=byFile.get(parsed.file) || [];
      if(entries.some(existing=>existing.message===item.message && existing.range.start.line===parsed.line && existing.range.start.character===parsed.column)) return;
      entries.push(item);byFile.set(parsed.file,entries);owned.get(spec.project).add(parsed.file);
      diagnostics.set(vscode.Uri.file(parsed.file),entries);
    }
    function chunk(stream,data) {
      const text=String(data);output?.append(text);
      write.fire(text.replace(/\r?\n/g,'\r\n'));
      pending[stream]+=text;
      const lines=pending[stream].split(/\r?\n/);pending[stream]=lines.pop();
      for(const entry of lines) line(entry);
    }
    async function finish(code,error) {
      if(finished) return;finished=true;
      if(claim) {
        try { if(supervision && child?.proof) await claim.complete(); else if(spawnAttempted) await claim.exited(code); else await claim.abandonBeforeSpawn(); }
        catch(e) { output?.appendLine("Recovery metadata retained: "+e.message); }
      }
      if(cancelled) reportCancellation(supervision && !child?.proof && spawnAttempted?'Unconfirmed':'Exited',supervision && !child?.proof?'Tree completion was not verified.':undefined);
      for(const text of Object.values(pending)) if(text) line(text);
      result.completionTime=new Date().toISOString();result.exitCode=typeof code==='number'?code:null;
      result.success=!cancelled && !error && code===0;result.status=cancelled?'Cancelled':result.success?'Succeeded':'Failed';
      if(cancelled) {
        result.reason='Cancellation confirmed by child process exit.';
        if(supervision && spawnAttempted && !child?.proof) {result.status='Blocked';result.reason='Cancellation requested; tree completion was not verified.';}
      }
      if(error) {write.fire('\r\n'+error+'\r\n');result.reason=error;if(supervision && spawnAttempted && !child?.proof)result.status='Blocked';}
      if(conflict && !result.success) {
        result.reason='External build blocked by Live Coding/open Editor. Close the Editor or resolve its Live Coding state before retrying.';
        write.fire('\r\n'+result.reason+'\r\n');vscode.window.showWarningMessage(result.reason);
      }
      write.fire('\r\n'+(spec.kind==='build'?'Build':'Project generation')+' '+result.status.toLowerCase()+' (exit '+result.exitCode+').\r\n');
      close.fire(result.success?0:1);
      child?.stdout?.removeListener('data',stdout);child?.stderr?.removeListener('data',stderr);
      child?.removeListener('error',onError);child?.removeListener('close',onClose);
      write.dispose();close.dispose();pending.stdout='';pending.stderr='';byFile.clear();
      activeOperation=undefined;complete(result);changed();
      if(disposed) {activeTerminal?.dispose();diagnostics.dispose();output?.dispose();}
    }
    const pty={onDidWrite:write.event,onDidClose:close.event,async open() {
      if(started || finished) return;started=true;
      write.fire((spec.kind==='build'?'Building '+spec.target+' | '+spec.platform+' | '+spec.configuration:'Regenerating project files')+'\r\n');
      try {
        if(ownership) {
          claim=await ownership.begin(spec.project,spec.kind);
          if(finished) {await claim.abandonBeforeSpawn();return;}
        }
        const executionSpec=supervision && spec.kind==='build'?{...spec,args:[...spec.args,'-NoUBA','-NoXGE','-NoFASTBuild','-NoSNDBS']}:spec;
        const encoded=Buffer.from((claim?'# Operation '+claim.operationId+'\n':'')+script(executionSpec),'utf16le').toString('base64');
        if(claim) {spawnAttempted=true;await claim.spawnAttempted(encoded);if(finished)return;}
        child=supervision && claim ? await supervision.launch(claim,encoded) : spawnProcess(powershell(),['-NoLogo','-NoProfile','-EncodedCommand',encoded],{cwd:spec.cwd,windowsHide:true,stdio:['ignore','pipe','pipe']});
        child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
        child.stdout.on('data',stdout);child.stderr.on('data',stderr);
        child.on('error',onError);child.on('close',onClose);
        if(cancelled) requestCancellation();
        if(claim && !supervision) void claim.observe(child.pid,encoded).catch(e=>output?.appendLine('Identity observation unavailable: '+e.message));
      } catch(error) {finish(null,error.message);}
    },close() {if(disposed && supervision)return;void cancel();}};
    let terminal;
    try {
      terminal=vscode.window.createTerminal({name:spec.kind==='build'?'Unreal: Build':'Unreal: Project Files',pty,isTransient:true});
      activeTerminal?.dispose();activeTerminal=terminal;terminal.show(!!spec.automatic);
    } catch(error) {
      // A failed UI creation must not strand the gate. If open already spawned a child,
      // retain ownership and cancel instead of declaring it safely completed.
      if(child?.pid && !finished) {void cancel();reportCancellation('Failed',error.message);}
      else finish(null,error.message);
    }
    return {done,terminal,cancel};
  }
  const service={run,diagnostics,get active(){return !!activeOperation;},cancel:()=>activeOperation?.cancel(),cancellation:()=>activeOperation?.cancellation(),reveal:()=>activeTerminal?.show(),dispose(){
    disposed=true;
    if(activeOperation && supervision) {activeOperation.detach();diagnostics.dispose();output?.dispose();return;}
    if(activeOperation) return activeOperation.cancel();
    activeTerminal?.dispose();activeTerminal=undefined;diagnostics.dispose();output?.dispose();
  }};
  context.subscriptions.push(service);return service;
}
module.exports={quote,specification,skyboxArguments,script,editorScript,createService};
