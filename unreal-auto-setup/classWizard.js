'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const core=require('./core');
const projects=require('./project');
const engines=require('./engine');
const modules=require('./modules');
const templates=require('./classTemplates');
const files=require('./classFiles');
const explorer=require('./explorerClass');

async function validateProject(project) {
  const numeric=/^(\d+)\.(\d+)(?:\.\d+)?$/.exec(String(project.descriptor.EngineAssociation || ''));
  if(numeric) {
    if(!core.supportedVersion(+numeric[1],+numeric[2])) throw new Error('Class creation requires Unreal Engine 5.8+.');
    if(!project.config.get('unrealEngine.enginePath')) return;
  }
  const info=await engines.inspect(project.config.get('unrealEngine.enginePath'),project.descriptor.EngineAssociation);
  if(!info.compatible) throw new Error('Set a valid matching unrealEngine.enginePath before creating a class.');
}
async function input(vscode,options,validate) {
  while(true) {
    const value=await vscode.window.showInputBox({...options,validateInput:text=>{try {validate(text);return undefined;} catch(error) {return error.message;}}});
    if(value===undefined) return undefined;
    try {validate(value);return value;} catch(error) {vscode.window.showErrorMessage(error.message);options={...options,value};}
  }
}
function preview(plan) {
  return ['Project: '+plan.project.name,'Module: '+plan.module.name+' ('+plan.module.origin+')','Type: '+plan.type.label,'Class: '+plan.name.className+(plan.name.interfaceName?' / '+plan.name.interfaceName:''),'API macro: '+plan.api,'Header: '+plan.files[0].path,'Source: '+plan.files[1].path,'Blueprint exposure: '+templates.exposureModes[plan.exposure].label,...(plan.dependencyStatus || []).map(item=>'Required '+item.name+': '+item.status),...(plan.missing.length?['Dependency advisory: Build.cs may need '+plan.missing.join(', ')+'. Rules are not edited or fully interpreted.']:[])].join('\n');
}
async function open(vscode,filename,options={preview:false}) {
  await fs.access(filename);await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(filename)),options);
}
async function wizard(vscode,context,services={},options={}) {
  if(!vscode.workspace.isTrusted) throw new Error('Trust the workspace before creating a class.');
  const project=await projects.readProject(vscode);if(!project) return;
  await validateProject(project);
  const list=await modules.discover(project.root);
  const location=options.uri?await explorer.destination(project,options.uri,list):undefined;
  const module=location?.module || await modules.choose(vscode,context,project,list);if(!module) return;
  const typePick=await vscode.window.showQuickPick(templates.registry.filter(type=>!location || ['object','actor','actorComponent','sceneComponent','interface'].includes(type.id)).map(type=>({label:type.label,description:type.base,type})),{placeHolder:'Choose the Unreal C++ class type'});
  if(!typePick) return;const type=typePick.type;
  const name=await input(vscode,{title:'Unreal: New C++ Class',prompt:'Class name without the Unreal prefix, or correctly prefixed. A leading '+type.prefix+' followed by uppercase is treated as a prefix.'},value=>templates.names(value,type));
  if(name===undefined) return;
  const exposurePick=await vscode.window.showQuickPick(type.exposures.map(mode=>({label:templates.exposureModes[mode].label,description:templates.exposureModes[mode].description,mode})),{placeHolder:'Blueprint exposure'});
  if(!exposurePick) return;
  const folder=location?location.folder:await input(vscode,{title:'Logical subfolder',prompt:'Optional relative folder inside the module (for example Inventory or UI/Widgets). Leave empty for the module’s default layout.',value:''},templates.subfolder);
  if(folder===undefined) return;
  const plan=templates.plan(project,module,type.id,name,folder,exposurePick.mode);
  await files.validate(plan,vscode);
  const confirmed=await vscode.window.showInformationMessage('Create '+plan.name.className+'?',{modal:true,detail:preview(plan)},'Create Class');
  if(confirmed!=='Create Class') return;
  await files.create(plan,vscode);
  await modules.remember(context,project,module);
  // A source pair alone does not change Build.cs/Target.cs metadata. Offer an optional refresh without setting a false stale marker.
  if(services.state) services.state.get(project.filename).lastCreatedClass={name:plan.name.className,files:plan.files.map(file=>file.path),createdAt:new Date().toISOString()};
  await services.refresh?.();
  await open(vscode,plan.files[0].path);
  const next=await vscode.window.showInformationMessage('Created '+plan.name.className+'. Regeneration is optional if your project index needs it.','Open Source Beside Header','Regenerate Project Files',...(plan.missing.length?['Manage Dependencies']:[]));
  if(next==='Open Source Beside Header') await open(vscode,plan.files[1].path,{preview:false,viewColumn:vscode.ViewColumn.Beside,preserveFocus:true});
  else if(next==='Manage Dependencies') await vscode.commands.executeCommand('unrealSetup.manageDependencies',vscode.Uri.file(plan.module.buildFile));
  else if(next==='Regenerate Project Files') await vscode.commands.executeCommand('unrealSetup.regenerate');
  return plan;
}
async function navigate(vscode,context,kind) {
  if(!vscode.workspace.isTrusted) throw new Error('Trust the workspace before using Unreal project commands.');
  const project=await projects.readProject(vscode);if(!project) return;
  let filename;
  if(kind==='descriptor') filename=project.filename;
  if(kind==='module') {
    const module=await modules.choose(vscode,context,project,await modules.discover(project.root));if(!module) return;
    filename=module.buildFile;await modules.remember(context,project,module);
  }
  if(kind==='target') {
    if(!project.targets.length) throw new Error('No Source/*.Target.cs files found.');
    const target=project.targets.length===1?project.targets[0]:(await vscode.window.showQuickPick(project.targets.map(item=>({label:item.name,description:item.type,target:item})),{placeHolder:'Open Unreal target rules'}))?.target;
    if(!target) return;filename=path.join(project.root,'Source',target.file);
  }
  await open(vscode,filename);
}
function register(vscode,context,services,report) {
  let active=false;
  for(const command of ['newClass','createClassHere']) context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.'+command,async(uri)=>{
    if(active) return;active=true;
    try {const plan=await wizard(vscode,context,services,command==='createClassHere'?{uri:uri || {}}:{});if(plan) report('Created '+plan.name.className+' in module '+plan.module.name+'.');}
    catch(error) {report(error.stack || String(error));vscode.window.showErrorMessage('Unreal: '+error.message);}
    finally {active=false;}
  }));
  for(const [command,kind] of [['openModuleRules','module'],['openProjectDescriptor','descriptor'],['openTargetRules','target']]) {
    context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.'+command,async()=>{try {await navigate(vscode,context,kind);} catch(error) {vscode.window.showErrorMessage('Unreal: '+error.message);}}));
  }
}
module.exports={validateProject,input,preview,wizard,navigate,register};
