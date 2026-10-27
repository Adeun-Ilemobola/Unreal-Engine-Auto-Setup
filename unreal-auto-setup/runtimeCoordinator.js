'use strict';
const tracking=require('./dirtyTracker');
const modes=['off','watch','autoBuild','autoBuildAndRegenerate'];
const mode=value=>modes.includes(value)?value:'watch';
const delay=value=>typeof value==='number' && Number.isFinite(value) && value>=5 && value<=300?value:30;
function create({execute,changed=()=>{},log=()=>{},now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}) {
  const tracker=tracking.create();let project,epoch=0,timer,active,config={mode:'watch',delay:30},due=0,suppressed=-1,blocked='',failureKind,history=[];
  const notify=()=>changed(snapshot());
  function snapshot() {return {mode:config.mode,delay:config.delay,activeProject:active?.project,dirty:tracker.list(),state:active?.state || (blocked?'Blocked':due?'Build Pending':'Idle'),pending:!!due,due,blocked,reason:tracker.list().at(-1)?.kind || '',history:[...history],lastAutomatic:history.find(h=>h.origin==='Auto')};}
  function stopTimer(){if(timer!==undefined)clearTimer(timer);timer=undefined;}
  function schedule() {
    stopTimer();
    if(active || !project || !config.mode.startsWith('auto') || !tracker.dirty.size || suppressed===tracker.token() || blocked) {due=0;notify();return;}
    due=due || now()+config.delay*1000;
    log('[Automation] Work scheduled after '+config.delay+'s debounce');
    timer=setTimer(()=>{timer=undefined;void automatic();},Math.max(0,due-now()));timer?.unref?.();notify();
  }
  async function automatic(){
    if(active || !due) return;due=0;
    await run('auto',true);
  }
  async function run(request,automatic=false) {
    if(active) return {busy:true};
    stopTimer();due=0;
    const token=tracker.token(),generation=epoch,filename=project,entry={project:filename,triggerReason:tracker.list().at(-1)?.kind || 'Manual '+request,origin:automatic?'Auto':'Manual',request,reason:tracker.list().at(-1)?.kind || 'Manual '+request,started:new Date(now()).toISOString()};
    active={state:'Preparing',project:filename};blocked='';failureKind=undefined;notify();
    try {
      const result=await execute(request,{automatic,project:filename,changes:tracker.list(),mode:config.mode,stage(state){if(generation===epoch){active.state=state;notify();}},generated(){if(generation===epoch)for(const d of tracker.dirty.values())if(d.kind==='Structure' && d.revision<=token)d.regenerated=true;}}) || {success:false,status:'Cancelled'};
      Object.assign(entry,result);
      if(generation===epoch) {
        if(result.success && request!=='generate' && request!=='open') tracker.complete(token);
        if(!result.success){suppressed=result.status==='Cancelled'?tracker.token():token;blocked=result.reason || result.status || 'Operation failed';failureKind=request==='generate' || result.regenerationFailed?'Structure':'Build';}
      }
      return result;
    } catch(error) {entry.status='Failed';entry.reason=error.message;if(generation===epoch){blocked=error.message;suppressed=token;failureKind='Build';}return {success:false,status:'Failed',reason:error.message};}
    finally {
      entry.finished=new Date(now()).toISOString();if(generation===epoch){history.unshift(entry);history=history.slice(0,10);}log('[Build] '+entry.origin+' '+request+' '+(entry.status || 'Finished')+(entry.reason?': '+entry.reason:''));active=undefined;
      if(generation===epoch && tracker.token()!==token && suppressed!==tracker.token() && (failureKind!=='Structure' || tracker.list().some(d=>d.kind==='Structure' && d.revision>token))){blocked='';suppressed=-1;}
      schedule();
    }
  }
  return {snapshot,run,get busy(){return !!active;},switchProject(filename){if(filename===project)return;stopTimer();epoch++;project=filename;tracker.clear();due=0;blocked='';suppressed=-1;failureKind=undefined;history=[];notify();},
    configure(values){const next={mode:mode(values.mode),delay:delay(values.delay)};if(next.mode!==config.mode || next.delay!==config.delay){config=next;due=0;blocked='';suppressed=-1;schedule();}},
    mark(file,kind){if(!project || !kind)return;tracker.mark(file,kind);log('[Runtime] '+kind+' changed: '+file);if(failureKind!=='Structure' || kind==='Structure'){blocked='';failureKind=undefined;}suppressed=-1;due=now()+config.delay*1000;schedule();},
    reconcile(){if(due && now()>=due && !active)void automatic();},
    cancelPending(){stopTimer();due=0;suppressed=tracker.token();blocked='Cancelled pending automation';log('[Automation] Pending work cancelled; dirty state retained');notify();},
    dispose(){stopTimer();epoch++;project=undefined;tracker.clear();due=0;},tracker};
}
module.exports={create,mode,delay,modes};
