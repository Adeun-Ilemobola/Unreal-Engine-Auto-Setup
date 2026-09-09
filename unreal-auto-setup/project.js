'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const core = require('./core');
const configurations = ['Debug','DebugGame','Development','Shipping','Test'];

async function discoverTargets(root) {
  let files;
  try { files = await fs.readdir(path.join(root,'Source')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const targets = [];
  for (const file of files.filter(name=>name.endsWith('.Target.cs')).sort()) {
    const code = (await fs.readFile(path.join(root,'Source',file),'utf8'))
      .replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    const types = [...new Set([...code.matchAll(/\bType\s*=\s*TargetType\s*\.\s*(\w+)\b/g)].map(match=>match[1]))];
    targets.push({name:file.replace(/\.Target\.cs$/,''),file,type:types.length === 1 ? types[0] : 'Unknown'});
  }
  return targets;
}

async function readProject(vscode, {interactive=true}={}) {
  const folders = vscode.workspace.workspaceFolders || [];
  if (folders.length !== 1 || folders[0].uri.scheme !== 'file') throw new Error('Open one local Unreal project root folder.');
  const folder = folders[0], root = folder.uri.fsPath;
  const projects = (await fs.readdir(root)).filter(name=>name.endsWith('.uproject')).sort();
  const config = vscode.workspace.getConfiguration(undefined,folder.uri);
  let name = config.get('unrealEngine.defaultProject');
  if (!projects.includes(name)) name = projects.length === 1 ? projects[0] : interactive && projects.length ? await vscode.window.showQuickPick(projects,{placeHolder:'Choose the Unreal project'}) : undefined;
  if (!name) {
    if (!projects.length) throw new Error('No .uproject found in the opened folder.');
    if (!interactive) throw new Error('Multiple .uproject files found; select a project with Set Up This Project.');
    return undefined;
  }
  const descriptor = JSON.parse((await fs.readFile(path.join(root,name),'utf8')).replace(/^\uFEFF/,''));
  return {folder,root,name,projects,config,descriptor,filename:path.join(root,name),targets:await discoverTargets(root)};
}

function stateKey(project) { return 'buildSelection:' + project.filename; }
function selection(context, project) {
  const saved = context.workspaceState.get(stateKey(project)) || {};
  const editors = project.targets.filter(target=>target.type === 'Editor');
  const target = saved.target || core.chooseTarget(editors.map(item=>item.file),path.basename(project.name,'.uproject'));
  return {target,platform:saved.platform || 'Win64',configuration:saved.configuration || 'Development'};
}
async function saveSelection(context,project,value) { await context.workspaceState.update(stateKey(project),value); }
async function select(vscode,context,project,field) {
  const current = selection(context,project);
  const choices = field === 'target' ? project.targets.map(item=>({label:item.name,description:item.type === 'Unknown' ? 'Type ambiguous/unknown; UnrealBuildTool validates this target' : item.type})) : field === 'platform' ? ['Win64'] : configurations;
  if (!choices.length) throw new Error('No Source/*.Target.cs files found.');
  const picked = await vscode.window.showQuickPick(choices,{placeHolder:'Select Unreal ' + field + ' (current: ' + (current[field] || 'not selected') + ')'});
  if (!picked) return current;
  const next = {...current,[field]:typeof picked === 'string' ? picked : picked.label};
  await saveSelection(context,project,next);
  return next;
}
function validateSelection(project,value,openAfterBuild=false) {
  const target = project.targets.find(item=>item.name === value.target);
  if (!target) throw new Error('Selected target is missing or ambiguous. Run Unreal: Select Target.');
  if (value.platform !== 'Win64' || !configurations.includes(value.configuration)) throw new Error('Select a supported build platform/configuration.');
  if (target.type === 'Editor' && ['Shipping','Test'].includes(value.configuration)) throw new Error('Editor targets do not support Shipping/Test. Select Debug, DebugGame or Development, or choose a game target.');
  if (openAfterBuild && target.type !== 'Editor') throw new Error('Build and Open Editor requires a known Editor target. Use Select Target, or Build Project for other targets.');
}
async function protectSettings(root,vscode) {
  for (const relative of ['.vscode','.vscode/settings.json']) {
    const filename = path.join(root,relative);
    try { if ((await fs.lstat(filename)).isSymbolicLink()) throw new Error('Cannot update settings through symbolic link: '+relative); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if ((vscode.workspace.textDocuments || []).some(doc=>doc.uri.fsPath === filename && doc.isDirty)) throw new Error('Save '+relative+' before updating the engine path.');
  }
}
module.exports = {configurations,discoverTargets,readProject,selection,saveSelection,select,validateSelection,protectSettings};
