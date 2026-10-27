'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const projects=require('./project');
const engine=require('./engine');
const processApi=require('./processes');
const generation=require('./generation');
const modules=require('./modules');
const core=require('./core');
async function present(filename) { try { await fs.stat(filename); return true; } catch { return false; } }

// Structured findings keep reporting separate from any future repair actions.
async function collect(vscode,context,{discover=engine.candidates,processes=processApi.createService(),state,dependencies}={}) {
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
  const editor=project ? await processes.get(project.filename,{fresh:true}) : {state:'Unknown',matches:[]};
  const refreshInterval=require('./runtimeWatcher').interval(config.get('unrealSetup.runtimeRefreshInterval'));
  add('Runtime watcher','Enabled',refreshInterval!==0);
  add('Runtime watcher','Interval seconds',refreshInterval);
  const automation=state?.peek?.(project?.filename)?.automation;
  for(const [label,value] of Object.entries({Mode:automation?.mode || require('./runtimeCoordinator').mode(config.get('unrealSetup.automationMode')),Delay:require('./runtimeCoordinator').delay(config.get('unrealSetup.autoBuildDelay')),Reconciliation:refreshInterval,Pending:automation?.state || 'Idle',Blocked:automation?.blocked || 'No',SourceDirty:automation?.dirty?.filter(d=>d.kind!=='Structure').length || 0,StructuralDirty:automation?.dirty?.filter(d=>d.kind==='Structure').length || 0,Trigger:automation?.reason || 'None',LastAutomatic:JSON.stringify(automation?.lastAutomatic || 'None'),Strategy:require('./liveCoding').resolve(editor,automation?.dirty).name,LiveCoding:JSON.stringify(await require('./liveCoding').inspect(editor))})) add('Automation',label,value);
  add('Runtime','Editor state',editor.state,editor.state!=='Unknown');
  add('Runtime','Matching PIDs',editor.matches.map(item=>item.pid).join(', ') || 'None');
  add('Runtime','Matching executable',editor.matches.map(item=>item.executable || 'Unavailable').join(', ') || 'None');
  if(editor.error) add('Runtime','Detection error',editor.error,false);
  const cpp=!!vscode.extensions.getExtension('ms-vscode.cpptools');
  add('Debugger','Microsoft C/C++ available',cpp,cpp);
  add('Debugger','Attach target available',editor.matches.length>0);
  const debug=vscode.debug?.activeDebugSession;
  add('Debugger','Active debug session',debug ? debug.name+' ('+debug.type+')' : 'None');
  const latest=project && (state?.peek ? state.peek(project.filename) : state?.get(project.filename));
  add('Build','Latest extension build',latest?.lastBuild ? JSON.stringify(latest.lastBuild) : 'No build this session');
  add('Build','Project metadata',latest?.stale ? 'Project Files May Need Refresh' : 'No metadata changes observed this session',!latest?.stale);
  const generator=await generation.tool(info.path);
  add('Project generation','UnrealBuildTool',generator || 'Not found',!!generator);
  add('Project generation','Regeneration available',!!generator && info.compatible,!!generator && info.compatible);
  const moduleList=project ? await modules.discover(project.root) : [];
  add('Modules','Modules discovered',moduleList.length,moduleList.length>0);
  const preferred=project && modules.recent(context,project,moduleList);
  add('Modules','Selected/default module',preferred?.name || 'Choose a module');
  for(const module of moduleList) add('Modules',module.name,path.relative(project.root,module.buildFile)+' | '+module.layout+' | '+module.api+' | '+module.origin+' | '+(module.type || project.descriptor.Modules?.find(item=>item.Name===module.name)?.Type || 'Undeclared/unknown'));
  const numeric=project && /^(\d+)\.(\d+)(?:\.\d+)?$/.exec(String(project.descriptor.EngineAssociation));
  const canCreate=!!project && moduleList.length>0 && vscode.workspace.isTrusted && (project.config.get('unrealEngine.enginePath') ? info.compatible : numeric ? core.supportedVersion(+numeric[1],+numeric[2]) : info.compatible);
  add('Class generation','Available',canCreate,canCreate);
  const canStructure=!!project && vscode.workspace.isTrusted && (project.config.get('unrealEngine.enginePath') ? info.compatible : numeric ? core.supportedVersion(+numeric[1],+numeric[2]) : info.compatible);
  add('Module creation','Available',canStructure,canStructure);
  add('Plugin creation','Available',canStructure,canStructure);
  if(project) for(const plugin of await modules.plugins(project.root)) {
    const reference=project.descriptor.Plugins?.find(item=>item.Name===plugin.name);
    const enabled=reference?.Enabled ?? (plugin.descriptor.EnabledByDefault!==false);
    add('Plugins',plugin.name,path.relative(project.root,plugin.filename)+' | Modules: '+(plugin.descriptor.Modules?.length || 0)+' | Discoverable: Yes | Enabled by descriptor: '+enabled+' (target/platform restrictions may apply)');
  }
  if(latest?.lastCreatedClass) add('Class generation','Last created this session',latest.lastCreatedClass.name+' (source files added; regeneration optional)');
  const dependencyModels=new Map();
  for(const module of moduleList) {
    const parsed=dependencies?await dependencies.parsed(module):require('./buildCsParser').parse(module.ruleText,module.name);dependencyModels.set(module.buildFile,parsed);
    add('Dependencies',module.name,parsed.status+' | '+['Public','Private'].map(v=>v+': '+parsed.dependencies.filter(d=>d.visibility===v).map(d=>d.name).join(', ')).join(' | ')+(parsed.reasons.length?' | '+parsed.reasons.join(' '):''));
  }
  add('Dependency Index','State',dependencies?JSON.stringify(dependencies.info()):'Not indexed (explicit refresh available)');
  const graph=require('./dependencyModel').graph(moduleList.map(m=>({...m,type:m.type || project?.descriptor.Modules?.find(d=>d.Name===m.name)?.Type})),dependencyModels,dependencies?.index.allModules().length?dependencies.index.allModules():moduleList);
  for(const warning of graph.warnings) add('Dependency relationships','Review',warning);
  return findings;
}
function format(findings) {
  return ['Unreal Engine Auto Setup â€” Project diagnostics',...findings.map(item=>'['+(item.ok?'OK':'CHECK')+'] '+item.section+' / '+item.label+': '+item.value)].join('\n');
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
function register(vscode,context,output,services={}) {
  context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.diagnose',async()=>{
    try {const findings=await collect(vscode,context,services);output.appendLine(format(findings));output.show(true);}
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
