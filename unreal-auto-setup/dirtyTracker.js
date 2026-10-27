'use strict';
const path=require('node:path'),fs=require('node:fs/promises');
const ignored=/^(Binaries|Intermediate|Saved|DerivedDataCache|\.git)$/i;
function inside(root,file) {const rel=path.relative(root,file);return !!rel && !rel.startsWith('..'+path.sep) && !path.isAbsolute(rel);}
function classify(project,modules,file) {
  if(!inside(project.root,file) || path.relative(project.root,file).split(path.sep).some(p=>ignored.test(p))) return;
  if(file===project.filename || /\.uplugin$/i.test(file) && inside(path.join(project.root,'Plugins'),file) || /\.Target\.cs$/i.test(file) && inside(path.join(project.root,'Source'),file)) return 'Structure';
  if(!modules.some(m=>inside(m.root,file))) return;
  if(/\.Build\.cs$/i.test(file)) return 'Structure';
  if(/\.cpp$/i.test(file)) return 'Implementation';
  if(/\.(h|inl|ipp)$/i.test(file)) return 'Header';
}
async function files(project,modules) {
  const result=new Map();
  async function visit(file) {
    let stat;try {stat=await fs.lstat(file);} catch(error){if(error.code==='ENOENT')return;throw error;}
    if(stat.isSymbolicLink()) return;
    if(stat.isDirectory()) {for(const name of await fs.readdir(file)) if(!ignored.test(name)) await visit(path.join(file,name));}
    else if(classify(project,modules,file)) result.set(file,stat.mtimeMs+':'+stat.size);
  }
  await visit(project.filename);
  // Local module trees only; engine and generated outputs never scanned.
  for(const module of modules) await visit(module.root);
  for(const target of project.targets || []) await visit(path.join(project.root,'Source',target.file));
  for(const plugin of await require('./modules').plugins(project.root)) await visit(plugin.filename);
  return result;
}
function create() {
  let revision=0;const dirty=new Map();
  return {dirty,mark(file,kind){dirty.set(file,{file,kind,revision:++revision});return revision;},token:()=>revision,
    complete(token,kind){for(const [file,item] of dirty) if(item.revision<=token && (!kind || item.kind===kind)) dirty.delete(file);},
    list:()=>[...dirty.values()],clear(){dirty.clear();revision=0;}};
}
module.exports={inside,classify,files,create};
