"use strict";
function rows(snapshot={}) {
  const {project,selected={},session={},editor={},engine={},module}=snapshot;
  const action=(label,id)=>({label,command:{command:'unrealSetup.'+id,title:label}});
  const value=(label,description,id)=>({...action(label,id),description:String(description ?? 'Unknown'),...(id?{}:{command:undefined})});
  if(!project) return [{label:snapshot.error || 'Open one trusted Unreal project folder',description:'No active project'}];
  return [
    {label:'Project',children:[value('Project',project.name),{...value('Path',project.root),tooltip:project.root},value('Engine',engine.version?[engine.version.MajorVersion,engine.version.MinorVersion,engine.version.PatchVersion || 0].join('.'):project.descriptor.EngineAssociation+' (not resolved)'),value('Module',module?.name || 'Choose when creating/navigating')]},
    {label:'Build Configuration',children:[value('Target',selected.target || 'Select target','selectTarget'),value('Platform',selected.platform,'selectPlatform'),value('Configuration',selected.configuration,'selectConfiguration')]},
    {label:'Runtime',children:[value('Editor',editor.state || 'Unknown'),value('PID',editor.matches?.map(item=>item.pid).join(', ') || 'None'),value('Last build',session.lastBuild?.status || 'No build this session'),value('Metadata',session.stale?'Regeneration required':'Current'),value('Automation',snapshot.automation?.mode || 'watch','automationMode'),value('Build',snapshot.automation?.blocked || (snapshot.automation?.due?'Scheduled in '+Math.max(0,Math.ceil((snapshot.automation.due-Date.now())/1000))+'s':snapshot.automation?.state || 'Idle')),{label:'Pending Changes',description:String(snapshot.automation?.dirty?.length || 0)+' files',children:(snapshot.automation?.dirty || []).map(item=>({label:require('node:path').relative(project.root,item.file),description:item.kind}))}]},
    {label:'Actions',children:[action('Build','build'),action('Run','run'),action('Open Editor','openEditor'),action('Build and Open Editor','buildAndRun'),action('Attach Debugger','attachDebugger'),action('Regenerate Project Files','regenerate'),action('Diagnose Project','diagnose'),action('Open Latest Log','openLatestLog')]},
    {label:'Creation',children:[action('New C++ Class','newClass'),action('New Module','newModule'),action('New Plugin','newPlugin')]},
    {label:'Dependencies',children:[value('Module',snapshot.dependencies?.module || 'Choose a module'),value('Edit support',snapshot.dependencies?.parsed?.status || 'Inspect to load'),value('Index',snapshot.dependencies?.index?.status || 'Not indexed'),...['Public','Private'].map(visibility=>({label:visibility+' Dependencies',children:(snapshot.dependencies?.parsed?.dependencies || []).filter(d=>d.visibility===visibility).map(d=>({label:d.name}))})),{label:'Warnings',children:(snapshot.dependencies?.warnings || []).map(label=>({label}))},...[['Inspect Dependencies','inspectDependencies'],['Add Dependency','addDependency'],['Remove Dependency','removeDependency'],['Change Visibility','changeDependencyVisibility'],['Refresh Dependency Index','refreshDependencyIndex']].map(([label,id])=>({...action(label,id),command:{...action(label,id).command,arguments:snapshot.dependencies?.buildFile?[{fsPath:snapshot.dependencies.buildFile}]:module?[{fsPath:module.buildFile}]:[]}}))]},
    {label:'Automation',children:[action('Automation Mode','automationMode'),action('Runtime Refresh Interval','runtimeInterval'),action('Auto Build Delay','autoBuildDelay'),action('Cancel Pending Automatic Build','cancelPendingAutomaticBuild'),action('Cancel Build','cancelBuild'),{label:'Recent Operations',children:(snapshot.automation?.history || []).map(h=>({label:h.origin+' '+h.request,description:h.status,tooltip:JSON.stringify(h)}))}]},
    {label:'Navigation',children:[action('Open Project Descriptor','openProjectDescriptor'),action('Open Module Build.cs','openModuleRules'),action('Open Target Rules','openTargetRules'),action('Open Plugin Descriptor','openPluginDescriptor')]}
  ];
}
function create(vscode,context) {
  const emitter=new vscode.EventEmitter();let snapshot={};
  const provider={onDidChangeTreeData:emitter.event,getChildren:element=>element?.children || rows(snapshot),getTreeItem:element=>({...element,collapsibleState:element.children?1:0})};
  context.subscriptions.push(emitter);
  if(vscode.window.createTreeView) context.subscriptions.push(vscode.window.createTreeView('unrealSetup.controlCenter',{treeDataProvider:provider,showCollapseAll:true}));
  return {provider,update(value){snapshot=value;emitter.fire(undefined);}};
}
module.exports={rows,create};
