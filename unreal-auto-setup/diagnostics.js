'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const projects=require('./project');
const engine=require('./engine');
async function present(filename) { try { await fs.stat(filename); return true; } catch { return false; } }

// Structured findings keep reporting separate from any future repair actions.
async function collect(vscode,context,{discover=engine.candidates}={}) {
  const findings=[];
  const add=(section,label,value,ok=true)=>findings.push({section,label,value,ok});
  add('VS Code','Workspace trust',vscode.workspace.isTrusted,vscode.workspace.isTrusted);
  for (const [label,id] of [['Microsoft C/C++','ms-vscode.cpptools'],['Skybox Unreal integration','skyboxlabs.unrealengine-tools']]) {
    const installed=!!vscode.extensions.getExtension(id); add('VS Code',label,installed,installed);
  }
  const folder=vscode.workspace.workspaceFolders?.[0];
  let project;
  try { project=await projects.readProject(vscode,{interactive:false}); }
  catch(error) { add('Project','Project selection',error.message,false); }
  const root=project?.root || (folder?.uri.scheme==='file' ? folder.uri.fsPath : undefined);
  let descriptors=[];
  if(root) { try { descriptors=(await fs.readdir(root)).filter(name=>name.endsWith('.uproject')); } catch {} }
  add('Project','.uproject found',descriptors.join(', ') || 'None',descriptors.length>0);
  add('Project','Selected project',project?.name || 'Unresolved',!!project);
  const source=!!root && await present(path.join(root,'Source'));
  add('Project','Source directory',source,source);
  const config=project?.config || vscode.workspace.getConfiguration(undefined,folder?.uri);
  let enginePath=config.get('unrealEngine.enginePath');
  if(!enginePath && project) {
    for(const candidate of await discover(project.descriptor.EngineAssociation)) {
      const info=await engine.inspect(candidate,project.descriptor.EngineAssociation);
      if(info.compatible && info.build && info.editor) {enginePath=info.path;break;}
    }
  }
  const info=await engine.inspect(enginePath,project?.descriptor.EngineAssociation);
  add('Engine','Engine path',info.path || 'Unresolved',!!info.path);
  add('Engine','Detected version',info.version ? [info.version.MajorVersion,info.version.MinorVersion,info.version.PatchVersion || 0].join('.') : 'Unknown',!!info.version);
  add('Engine','Version compatibility',info.compatible ? 'Meets 5.8+ check; numeric association matches when present' : info.error || 'Unknown',info.compatible);
  add('Engine','Build.bat available',info.build,info.build);
  add('Engine','UnrealEditor.exe available',info.editor,info.editor);
  for(const file of ['.vscode/settings.json','.vscode/c_cpp_properties.json','.vscode/tasks.json','.clang-format']) {
    const found=!!root && await present(path.join(root,file)); add('VS Code',file,found,found);
  }
  const selected=project ? projects.selection(context,project) : {};
  add('Project','Selected target',selected.target || 'Unresolved',!!project?.targets.some(item=>item.name===selected.target));
  for(const field of ['target','platform','configuration']) add('Build configuration',field,selected[field] || 'Unresolved',!!selected[field]);
  if(project) {try {projects.validateSelection(project,selected);} catch(error) {add('Build configuration','Validation',error.message,false);} }
  return findings;
}
function format(findings) {
  return ['Unreal Engine Auto Setup — Project diagnostics',...findings.map(item=>'['+(item.ok?'OK':'CHECK')+'] '+item.section+' / '+item.label+': '+item.value)].join('\n');
}
async function latestLog(root) {
  const directory=path.join(root,'Saved','Logs');
  let entries;
  try {entries=await fs.readdir(directory,{withFileTypes:true});} catch(error) {if(error.code==='ENOENT') return undefined;throw error;}
  const logs=[];
  for(const entry of entries) if(entry.isFile() && /\.log$/i.test(entry.name)) {
    const filename=path.join(directory,entry.name);
    try {logs.push({filename,mtime:(await fs.stat(filename)).mtimeMs});} catch(error) {if(error.code!=='ENOENT') throw error;}
  }
  logs.sort((a,b)=>b.mtime-a.mtime || a.filename.localeCompare(b.filename));
  return logs[0]?.filename;
}
function register(vscode,context,output) {
  context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.diagnose',async()=>{
    try {const findings=await collect(vscode,context);output.appendLine(format(findings));output.show(true);}
    catch(error) {output.appendLine('Diagnostics failed: '+error.message);output.show(true);}
  }));
  context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.openLatestLog',async()=>{
    try {
      const project=await projects.readProject(vscode); if(!project) return;
      const filename=await latestLog(project.root);
      if(!filename) {vscode.window.showInformationMessage('No project logs found in Saved/Logs.');return;}
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(filename)),{preview:false});
    } catch(error) {vscode.window.showErrorMessage('Unreal: '+error.message);}
  }));
}
module.exports={collect,format,latestLog,register};
