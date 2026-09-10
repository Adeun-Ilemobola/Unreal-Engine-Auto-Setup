"use strict";
const fs=require('node:fs/promises'),path=require('node:path');
const modules=require('./modules'),safe=require('./classFiles');
const excluded=new Set(['binaries','intermediate','saved','deriveddatacache','.git','node_modules']);
function mapping(module,folder) {
  const relative=path.relative(module.root,folder);
  if(relative && !safe.inside(module.root,folder)) throw new Error('Choose a folder inside an existing Unreal module.');
  if(relative.split(/[\\/]/).some(part=>excluded.has(part.toLowerCase()))) throw new Error('Generated/output folders cannot contain new Unreal classes.');
  if(!relative) return '';
  const parts=relative.split(path.sep);
  if(module.publicPath || module.privatePath) {
    if(!['Public','Private'].includes(parts[0]) || (parts[0]==='Public' && !module.publicPath) || (parts[0]==='Private' && !module.privatePath)) throw new Error('Choose the module root or an existing Public/Private source folder.');
    parts.shift();
  }
  return parts.join('/');
}
async function destination(project,uri,list) {
  if(!uri || (uri.scheme && uri.scheme!=='file') || !uri.fsPath) throw new Error('Right-click a local module folder in Explorer.');
  const folder=path.resolve(uri.fsPath);
  if(path.relative(project.root,folder).split(/[\\/]/).some(part=>excluded.has(part.toLowerCase()))) throw new Error('Generated/output folders cannot contain new Unreal classes.');
  await safe.safeAncestors(folder);
  if(!(await fs.lstat(folder)).isDirectory()) throw new Error('Choose a folder, not a source file.');
  const module=(list || await modules.discover(project.root)).find(item=>folder===item.root || safe.inside(item.root,folder));
  if(!module) throw new Error('This folder is not inside a discovered Unreal C++ module.');
  return {module,folder:mapping(module,folder)};
}
async function locations(list,vscode) {
  const result=[];
  async function walk(module,root,depth=0) {
    if(depth>16) return;
    const stat=await fs.lstat(root);if(stat.isSymbolicLink() || !stat.isDirectory()) return;
    try {mapping(module,root);} catch {return;}
    result.push(root,vscode.Uri.file(root).path || root);
    for(const item of await fs.readdir(root,{withFileTypes:true})) if(item.isDirectory() && !excluded.has(item.name.toLowerCase())) await walk(module,path.join(root,item.name),depth+1);
  }
  for(const module of list) await walk(module,module.root);
  return [...new Set(result)];
}
module.exports={mapping,destination,locations};
