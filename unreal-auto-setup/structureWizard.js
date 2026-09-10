"use strict";
const fs=require('node:fs/promises');
const path=require('node:path');
const projects=require('./project');
const modules=require('./modules');
const classes=require('./classWizard');
const templates=require('./moduleTemplates');
const creation=require('./creation');
async function input(vscode,options,validate) {
  while(true) {
    const value=await vscode.window.showInputBox({...options,validateInput:async value=>{try {await validate(value);} catch(error) {return error.message;}}});
    if(value===undefined) return;
    try {await validate(value);return value;} catch(error) {vscode.window.showErrorMessage(error.message);options={...options,value};}
  }
}
async function choose(vscode,values,prompt,preferred,describe=()=>undefined) {
  const sorted=[...values].sort((a,b)=>Number(b===preferred)-Number(a===preferred));
  return (await vscode.window.showQuickPick(sorted.map(value=>({label:value,description:describe(value),value})),{placeHolder:prompt}))?.value;
}
function preview(plan) {
  return ['Project: '+plan.project.name,...(plan.kind==='plugin'?['Plugin: '+plan.name,'Friendly name: '+plan.friendly,'Plugin path: '+plan.newRoot]:[]),'Module: '+plan.module.name,'Type: '+plan.module.type,'Loading phase: '+plan.module.phase,'Layout: '+plan.module.layout,'API: '+plan.module.api,...plan.files.map(file=>'Create: '+file.path),plan.kind==='module'?'Update '+plan.project.filename+': append '+JSON.stringify(plan.module.entry):'Project descriptor unchanged. Plugin EnabledByDefault=true; project/platform restrictions can still apply.'].join('\n');
}
async function wizard(vscode,context,services,kind) {
  if(!vscode.workspace.isTrusted) throw new Error('Trust the workspace before creation.');
  const project=await projects.readProject(vscode);if(!project) return;
  await classes.validateProject(project);
  const existing=await modules.discover(project.root);
  const name=await input(vscode,{title:'Unreal: New '+(kind==='plugin'?'Plugin':'Module'),prompt:'Name (C++ identifier)'},value=>creation.unique(project,value,kind));if(name===undefined) return;
  let friendly=name,description='',moduleName=name;
  if(kind==='plugin') {
    friendly=await input(vscode,{prompt:'Plugin friendly/display name',value:name},value=>{if(!value.trim() || value.length>120) throw new Error('Enter a friendly name, up to 120 characters.');});if(friendly===undefined) return;
    description=await input(vscode,{prompt:'Plugin description (optional)',value:''},value=>{if(value.length>2000) throw new Error('Use up to 2000 characters.');});if(description===undefined) return;
    moduleName=await input(vscode,{prompt:'Initial module name',value:name},value=>creation.unique(project,value));if(moduleName===undefined) return;
  }
  const type=await choose(vscode,templates.types,'Module type',/Editor$/i.test(moduleName)?'Editor':'Runtime',value=>value==='Developer'?'Deprecated in UE 5.8; retained for compatibility':value==='Program'?'Only loads in Program targets':undefined);if(!type) return;
  const layouts=existing.map(item=>item.layout).filter(item=>['Flat','Public / Private'].includes(item));
  const preferred=layouts.length && new Set(layouts).size===1?layouts[0]:'Public / Private';
  const layout=await choose(vscode,['Public / Private','Flat'],'Source layout',preferred);if(!layout) return;
  let phase='Default';
  // Default is the ordinary confirmation path; advanced loading phases remain optional.
  let plan=await creation.plan(project,{kind,name,moduleName,type,layout,phase,friendly,description});
  await creation.validate(plan,vscode);
  let answer=await vscode.window.showInformationMessage('Create '+name+'?',{modal:true,detail:preview(plan)},'Create','Advanced Loading Phase');
  if(answer==='Advanced Loading Phase') {
    phase=await choose(vscode,templates.phases,'Advanced loading phase','Default');if(!phase) return;
    plan=await creation.plan(project,{kind,name,moduleName,type,layout,phase,friendly,description});
    answer=await vscode.window.showInformationMessage('Create '+name+'?',{modal:true,detail:preview(plan)},'Create');
  }
  if(answer!=='Create') return;
  await creation.commit(plan,vscode);
  services.state?.mark(project,kind==='plugin'?plan.files[0].path:project.filename);
  // Discovery is uncached, so class creation/navigation see the new module immediately.
  try {
    const module=(await modules.discover(project.root)).find(item=>item.root===plan.module.root);
    if(module) await modules.remember(context,project,module);
  } catch(error) {vscode.window.showWarningMessage('Created '+name+', but module discovery could not refresh: '+error.message);}
  try {await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(plan.module.files[0].path)),{preview:false});}
  catch(error) {vscode.window.showWarningMessage('Created '+name+', but could not open Build.cs: '+error.message);}
  await services.refresh?.();
  const next=await vscode.window.showInformationMessage(name+' created. Project metadata changed; regeneration is recommended.','Regenerate Project Files');
  if(next==='Regenerate Project Files') await vscode.commands.executeCommand('unrealSetup.regenerate');
  return plan;
}
async function openPlugin(vscode) {
  if(!vscode.workspace.isTrusted) throw new Error('Trust the workspace before using Unreal commands.');
  const project=await projects.readProject(vscode);if(!project) return;
  const list=await modules.plugins(project.root);if(!list.length) throw new Error('No valid project-local plugin descriptors found.');
  const selected=list.length===1?list[0]:(await vscode.window.showQuickPick(list.map(plugin=>({label:plugin.name,description:path.relative(project.root,plugin.filename),plugin})),{placeHolder:'Open plugin descriptor'}))?.plugin;
  if(!selected) return;
  await fs.access(selected.filename);await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(selected.filename)),{preview:false});
}
function register(vscode,context,services,report) {
  let active=false;
  for(const kind of ['module','plugin']) context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.new'+(kind==='module'?'Module':'Plugin'),async()=>{
    if(active) return;active=true;
    try {await wizard(vscode,context,services,kind);} catch(error) {report(error.stack || error.message);vscode.window.showErrorMessage('Unreal: '+error.message);} finally {active=false;}
  }));
  context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.openPluginDescriptor',async()=>{try {await openPlugin(vscode);} catch(error) {vscode.window.showErrorMessage('Unreal: '+error.message);}}));
}
module.exports={input,choose,preview,wizard,openPlugin,register};
