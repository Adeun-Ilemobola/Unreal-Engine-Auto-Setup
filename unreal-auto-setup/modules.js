'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');

function apiMacro(name) {
  if(typeof name!=='string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name) || name.includes('__')) throw new Error('Unsupported module name. Use an ASCII letter followed by letters, digits or single underscores.');
  return name.toUpperCase()+'_API';
}
function stripComments(text) {return text.replace(/@?"(?:""|\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,token=>token.startsWith('/')?' ':token);}
function ruleCode(text) {return stripComments(text).replace(/@?"(?:""|\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,'""');}
async function directory(filename) {try {const stat=await fs.lstat(filename);return stat.isDirectory() && !stat.isSymbolicLink();} catch(error) {if(error.code==='ENOENT') return false;throw error;}}
async function inspect(root,origin,plugin) {
  const name=path.basename(root);let api;
  try {api=apiMacro(name);} catch {return undefined;}
  const buildFile=path.join(root,name+'.Build.cs');
  let text;
  try {const stat=await fs.lstat(buildFile);if(!stat.isFile() || stat.isSymbolicLink()) return undefined;text=await fs.readFile(buildFile,'utf8');}
  catch(error) {if(error.code==='ENOENT') return undefined;throw error;}
  const code=ruleCode(text);
  if(/\bType\s*=\s*ModuleType\s*\.\s*External\b/.test(code)) return undefined;
  if(!new RegExp('\\bclass\\s+'+name+'\\s*:\\s*(?:UnrealBuildTool\\.)?ModuleRules\\b').test(code) || !new RegExp('\\b'+name+'\\s*\\(\\s*ReadOnlyTargetRules\\s+\\w+').test(code)) return undefined;
  let depth=0;for(const char of code) {if(char==='{') depth++;if(char==='}' && --depth<0) return undefined;}if(depth!==0 || !code.includes('{')) return undefined;
  const publicPath=await directory(path.join(root,'Public'))?path.join(root,'Public'):undefined;
  const privatePath=await directory(path.join(root,'Private'))?path.join(root,'Private'):undefined;
  const layout=publicPath && privatePath?'Public / Private':privatePath?'Private only':publicPath?'Public only':'Flat';
  return {name,root,buildFile,publicPath,privatePath,origin,plugin,api,layout,ruleText:text};
}

async function discover(projectRoot) {
  const result=[];
  if(!await directory(projectRoot)) return result;
  const excluded=new Set(['Binaries','Intermediate','Saved','.git','node_modules']);
  async function walkSource(root,origin,plugin,depth=0) {
    if(depth>16 || !await directory(root)) return;
    const module=await inspect(root,origin,plugin);if(module) {result.push(module);return;}
    for(const entry of await fs.readdir(root,{withFileTypes:true})) if(entry.isDirectory() && !excluded.has(entry.name)) await walkSource(path.join(root,entry.name),origin,plugin,depth+1);
  }
  await walkSource(path.join(projectRoot,'Source'),'project');
  for(const plugin of await plugins(projectRoot)) {
    const before=result.length;
    await walkSource(path.join(plugin.root,'Source'),'plugin',path.basename(plugin.filename));
    const declared=new Map((plugin.descriptor.Modules || []).filter(item=>item && typeof item.Name==='string').map(item=>[item.Name,item]));
    for(let i=result.length-1;i>=before;i--) {
      if(!declared.has(result[i].name)) result.splice(i,1);
      else result[i].type=declared.get(result[i].name).Type;
    }
  }
  return result.sort((a,b)=>a.name.localeCompare(b.name) || a.root.localeCompare(b.root));
}
async function plugins(projectRoot) {
  const result=[];
  async function walk(root,depth=0) {
    if(depth>16 || !await directory(root)) return;
    const entries=await fs.readdir(root,{withFileTypes:true});
    const descriptors=entries.filter(item=>item.isFile() && item.name.endsWith('.uplugin'));
    if(descriptors.length) {
      for(const entry of descriptors) {
        try {
          const descriptor=require('./descriptors').parse(await fs.readFile(path.join(root,entry.name),'utf8')).data;
          if(descriptor.Modules!==undefined && !Array.isArray(descriptor.Modules)) continue;
          result.push({name:entry.name.slice(0,-8),root,filename:path.join(root,entry.name),descriptor});
        } catch(error) {if(error instanceof SyntaxError || /descriptor|Duplicate/i.test(error.message)) continue;throw error;}
      }
      return;
    }
    for(const entry of entries) if(entry.isDirectory() && !['Source','Binaries','Intermediate','Saved','.git','node_modules'].includes(entry.name)) await walk(path.join(root,entry.name),depth+1);
  }
  await walk(path.join(projectRoot,'Plugins'));return result;
}
function recent(context,project,list) {return list.find(item=>item.buildFile===context.workspaceState.get('classModule:'+project.filename)) || (list.length===1?list[0]:undefined);}
async function choose(vscode,context,project,list) {
  if(!list.length) throw new Error('No safely discoverable Unreal C++ modules found. Add a valid existing module before using this command.');
  if(list.length===1) return list[0];
  const previous=recent(context,project,list);
  const choices=list.map(item=>({label:item.name,description:item.origin+(item.plugin?' / '+item.plugin:'')+(item===previous?' / recent':''),detail:path.relative(project.root,item.root),module:item}));
  if(previous) choices.sort((a,b)=>Number(b.module===previous)-Number(a.module===previous));
  return (await vscode.window.showQuickPick(choices,{placeHolder:'Choose the existing Unreal module'}))?.module;
}
async function remember(context,project,module) {await context.workspaceState.update('classModule:'+project.filename,module.buildFile);}
module.exports={plugins,apiMacro,stripComments,discover,inspect,recent,choose,remember};
