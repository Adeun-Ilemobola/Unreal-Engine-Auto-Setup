'use strict';
const projects=require('./project');

function configuration(project,process) {
  return {name:'Unreal: Attach '+project.name+' (PID '+process.pid+')',type:'cppvsdbg',request:'attach',processId:String(process.pid)};
}
async function attach(vscode,project,processes) {
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
  const started=await vscode.debug.startDebugging(project.folder,configuration(project,selected));
  if(!started) throw new Error('VS Code could not start the C++ attach session. Check Debug Console and process permissions.');
  return true;
}
function register(vscode,context,processes,onChange) {
  context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.attachDebugger',async()=>{
    try {if(!vscode.workspace.isTrusted) return;const project=await projects.readProject(vscode);if(project) await attach(vscode,project,processes);}
    catch(error) {vscode.window.showErrorMessage('Unreal: '+error.message);}
    finally {onChange?.();}
  }));
}
module.exports={configuration,attach,register};
