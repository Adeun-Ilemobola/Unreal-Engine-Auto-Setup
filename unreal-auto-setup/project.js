'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const core = require('./core');
const configurations = ['Debug','DebugGame','Development','Shipping','Test'];

function validateDescriptor(value) {
  if(!value || typeof value!=='object' || Array.isArray(value)) throw new Error('Project descriptor must be a JSON object.');
  for(const key of ['Modules','Plugins']) {
    if(value[key]===undefined)continue;
    if(!Array.isArray(value[key]))throw new Error('Project descriptor '+key+' must be an array.');
    if(value[key].some(item=>!item || typeof item!=='object' || Array.isArray(item) || typeof item.Name!=='string' || !item.Name.trim()))throw new Error('Project descriptor '+key+' entries must be objects with a nonempty Name.');
  }
  return value;
}

function targetType(text) {
  // A bounded lexical inference, not C# evaluation. Unsupported interpolation/control flow
  // is intentionally Unknown: a single visible assignment need not execute for this target.
  if(text.length>1024*1024) return 'Unknown';
  let code='',i=0;
  while(i<text.length) {
    if(text.startsWith('//',i)) {const end=text.indexOf('\n',i);i=end<0?text.length:end;code+=' ';continue;}
    if(text.startsWith('/*',i)) {const end=text.indexOf('*/',i+2);if(end<0)return 'Unknown';i=end+2;code+=' ';continue;}
    if(text[i]==='$' || text.startsWith('@$',i)) return 'Unknown';
    const verbatim=text.startsWith('@"',i);
    if(verbatim || text[i]==='"' || text[i]==="'") {
      if(verbatim)i++;
      const quote=text[i++];let closed=false;
      if(quote==='"' && !verbatim && text.startsWith('""',i)) {
        let count=1;while(text[i]==='"'){count++;i++;}
        const end=text.indexOf('"'.repeat(count),i);if(end<0)return 'Unknown';i=end+count;closed=true;
      } else while(i<text.length) {
        if(text[i]===quote) {i++;if(verbatim && text[i]===quote){i++;continue;}closed=true;break;}
        if(text[i]==='\\' && !verbatim)i+=2;else i++;
      }
      if(!closed)return 'Unknown';code+=' __literal__ ';continue;
    }
    code+=text[i++];
  }
  const tokens=code.match(/[A-Za-z_][A-Za-z0-9_]*|[^\s]/g) || [];
  if(tokens.some(t=>['if','else','switch','for','foreach','while','do','try','catch','?','#'].includes(t)))return 'Unknown';
  let constructorStart=-1,constructorEnd=tokens.length;
  if(tokens.includes('class')) {
    if(tokens.filter(t=>t==='class').length!==1)return 'Unknown';
    const name=tokens[tokens.indexOf('class')+1],bodies=[];
    const afterGroup=start=>{
      let depth=0;
      for(let n=start;n<tokens.length;n++) {if(tokens[n]==='(')depth++;if(tokens[n]===')' && --depth===0)return n+1;}
      return tokens.length;
    };
    for(let n=0;n<tokens.length;n++) if(tokens[n]===name && tokens[n+1]==='(') {
      let end=afterGroup(n+1);
      if(tokens[end]===':' && tokens[end+1]==='base' && tokens[end+2]==='(')end=afterGroup(end+2);
      if(tokens[end]==='{')bodies.push(end);
    }
    if(bodies.length!==1)return 'Unknown';
    constructorStart=bodies[0];let depth=1;
    for(let n=constructorStart+1;n<tokens.length;n++) {
      if(tokens[n]==='{')depth++;
      if(tokens[n]==='}' && --depth===0){constructorEnd=n;break;}
    }
    if(depth!==0)return 'Unknown';
  }
  const types=[];
  for(let n=0;n<tokens.length;n++) if(tokens[n]==='Type' && tokens[n+1]==='=') {
    if(tokens[n-1]==='.' && (tokens[n-2]!=='this' || tokens[n-3]==='.'))continue;
    if(constructorStart>=0) {
      if(n<=constructorStart || n>=constructorEnd)return 'Unknown';
      let depth=0;for(let p=constructorStart+1;p<n;p++){if(tokens[p]==='{')depth++;if(tokens[p]==='}')depth--;}
      if(depth!==0)return 'Unknown';
    }
    if(tokens[n+2]!=='TargetType' || tokens[n+3]!=='.' || tokens[n+5]!==';')return 'Unknown';
    types.push(tokens[n+4]);
  }
  return types.length===1 && ['Editor','Game','Client','Server','Program'].includes(types[0])?types[0]:'Unknown';
}

async function discoverTargets(root) {
  let files;
  try { files = await fs.readdir(path.join(root,'Source')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const targets = [];
  for (const file of files.filter(name=>name.endsWith('.Target.cs')).sort()) {
    const code = await fs.readFile(path.join(root,'Source',file),'utf8');
    targets.push({name:file.replace(/\.Target\.cs$/,''),file,type:targetType(code)});
  }
  return targets;
}

/** @returns {Promise<import('./contracts').ProjectContext|undefined>} */
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
  const descriptor = validateDescriptor(JSON.parse((await fs.readFile(path.join(root,name),'utf8')).replace(/^\uFEFF/,'')));
  const targets=await discoverTargets(root);
  const current=vscode.workspace.workspaceFolders || [];
  if(current.length!==1 || current[0].uri.scheme!=='file' || current[0].uri.fsPath!==root)throw new Error('Workspace changed while reading the project. Retry in the active project.');
  return {folder,root,name,projects,config,descriptor,filename:path.join(root,name),targets};
}

function stateKey(project) { return 'buildSelection:' + project.filename; }
function selection(context, project) {
  const saved = context.workspaceState.get(stateKey(project)) || {};
  const editors = project.targets.filter(target=>target.type === 'Editor');
  const target = saved.target || core.chooseTarget(editors.map(item=>item.file),path.basename(project.name,'.uproject'));
  return {target,platform:saved.platform || 'Win64',configuration:saved.configuration || 'Development'};
}
async function saveSelection(context,project,value) { project.assertCurrent?.();await context.workspaceState.update(stateKey(project),value); }
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
module.exports = {configurations,discoverTargets,readProject,selection,saveSelection,select,validateSelection,protectSettings,validateDescriptor};
