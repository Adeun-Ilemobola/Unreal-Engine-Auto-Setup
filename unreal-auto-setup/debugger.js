'use strict';
const projects=require('./project');
const pending=new WeakSet(),sessions=new WeakMap();

function configuration(project,process) {
  return {name:'Unreal: Attach '+project.name+' (PID '+process.pid+')',type:'cppvsdbg',request:'attach',processId:String(process.pid)};
}
async function attach(vscode,project,processes) {
  if(pending.has(vscode))throw new Error('A debugger attachment is already in progress.');
  pending.add(vscode);try{return await attachUnlocked(vscode,project,processes);}finally{pending.delete(vscode);}
}
async function attachUnlocked(vscode,project,processes) {
  if(!vscode.workspace.isTrusted) return false;
  const extension=vscode.extensions.getExtension('ms-vscode.cpptools');
  if(!extension) throw new Error('Microsoft C/C++ is missing or disabled. Install/enable it before attaching.');
  try {await extension.activate();} catch {throw new Error('Microsoft C/C++ could not activate. Enable it and reload VS Code.');}
  const result=await processes.get(project.filename,{fresh:true});
  if(result.state==='Unknown') throw new Error('Editor detection unavailable. Cannot select a reliable debugger target. '+(result.error || ''));
  if(!result.matches.length) throw new Error('Start Unreal Editor for this project before attaching the debugger.');
  let selected=result.matches[0];
  if(result.matches.length>1) {
    const picked=await vscode.window.showQuickPick(result.matches.map(item=>({label:'PID '+item.pid,description:item.executable || 'Executable unavailable',detail:item.commandLine,process:item})),{placeHolder:'Attach to this project’s Unreal Editor'});
    if(!picked) return false;selected=picked.process;
  }
  const current=await processes.get(project.filename,{fresh:true});
  if(!current.matches.some(item=>item.pid===selected.pid && item.commandLine===selected.commandLine)) throw new Error('Selected Unreal Editor process disappeared or changed. Try attaching again.');
  if(!vscode.workspace.isTrusted) return false;
  const active=vscode.debug?.activeDebugSession;
  if([active,...(sessions.get(vscode)?.values() || [])].some(session=>session && String(session.configuration?.processId)===String(selected.pid))) throw new Error('Debugger is already attached to Unreal Editor (PID '+selected.pid+').');
  const started=await vscode.debug.startDebugging(project.folder,configuration(project,selected));
  if(!started) throw new Error('VS Code could not start the C++ attach session. Check Debug Console and process permissions.');
  return true;
}
async function detach(vscode,session) {
  const target=session || vscode.debug?.activeDebugSession;
  if(!target) return false;
  if(target.type!=='cppvsdbg' || target.configuration?.request!=='attach' || !target.configuration?.name?.startsWith('Unreal: Attach '))throw new Error('Refusing to stop an unrelated or launch-mode debug session.');
  if(vscode.debug?.stopDebugging) {
    await vscode.debug.stopDebugging(target);
    return true;
  }
  return false;
}
function register(vscode,context,processes,onChange) {
  const tracked=new Map();sessions.set(vscode,tracked);
  context.subscriptions.push(vscode.debug.onDidStartDebugSession(session=>{tracked.set(session.id,session);}),vscode.debug.onDidTerminateDebugSession(session=>{tracked.delete(session.id);}),{dispose(){tracked.clear();sessions.delete(vscode);}});
  context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.attachDebugger',async()=>{
    try {if(!vscode.workspace.isTrusted) return;const project=await projects.readProject(vscode);if(project) await attach(vscode,project,processes);}
    catch(error) {vscode.window.showErrorMessage('Unreal: '+error.message);}
    finally {onChange?.();}
  }));
}
module.exports={configuration,attach,detach,register};
