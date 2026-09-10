"use strict";
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const safe=require('./classFiles');
const modules=require('./modules');
const templates=require('./moduleTemplates');
const descriptors=require('./descriptors');
async function unique(project,name,kind='module') {
  templates.validateName(name);
  const list=kind==='plugin'?await modules.plugins(project.root):await modules.discover(project.root);
  if(list.some(item=>item.name.toLowerCase()===name.toLowerCase())) throw new Error('An existing '+kind+' is named '+name+'.');
  const data=descriptors.parse(await fs.readFile(project.filename,'utf8')).data;
  const entries=data[kind==='plugin'?'Plugins':'Modules'];
  if(entries!==undefined && !Array.isArray(entries)) throw new Error('Invalid project descriptor array.');
  if(entries?.some(item=>item?.Name?.toLowerCase()===name.toLowerCase())) throw new Error('The project already declares '+name+'.');
  await safe.conflict(path.join(project.root,kind==='plugin'?'Plugins':'Source',name));
}
async function plan(project,{kind='module',name,moduleName=name,type='Runtime',layout='Public / Private',phase='Default',friendly=name,description=''}) {
  await unique(project,name,kind);if(kind==='plugin') await unique(project,moduleName);
  const original=await fs.readFile(project.filename,'utf8');descriptors.parse(original);
  const newRoot=path.join(project.root,kind==='plugin'?'Plugins':'Source',name);
  const module=templates.render(kind==='plugin'?path.join(newRoot,'Source',moduleName):newRoot,moduleName,type,layout,phase);
  const files=[...module.files];
  if(kind==='plugin') files.unshift({path:path.join(newRoot,name+'.uplugin'),text:templates.pluginDescriptor(name,friendly,description,module)});
  const replacement=kind==='module'?descriptors.append(original,'Modules',module.entry):original;
  return {project,kind,name,module,friendly,newRoot,files,original,replacement};
}
async function validate(plan,vscode,io=fs) {
  if(!vscode.workspace.isTrusted) throw new Error('Trust the workspace before creating modules or plugins.');
  const folders=vscode.workspace.workspaceFolders;
  if(folders && (folders.length!==1 || path.resolve(folders[0].uri.fsPath)!==path.resolve(plan.project.root))) throw new Error('Project folder changed; restart creation.');
  const dirty=(vscode.workspace.textDocuments || []).find(doc=>doc.isDirty && (path.resolve(doc.uri.fsPath).toLowerCase()===path.resolve(plan.project.filename).toLowerCase() || safe.inside(plan.newRoot,doc.uri.fsPath)));
  if(dirty) throw new Error('Save or close unsaved document: '+dirty.uri.fsPath);
  if(!safe.inside(plan.project.root,plan.newRoot)) throw new Error('Creation must stay inside the project.');
  for(const file of plan.files) {
    if(!safe.inside(plan.newRoot,file.path)) throw new Error('Invalid creation destination.');
    await safe.safeAncestors(file.path,io);await safe.conflict(file.path,io);
  }
  await safe.safeAncestors(plan.project.filename,io);await safe.conflict(plan.newRoot,io);
  if((await io.lstat(plan.project.filename)).nlink>1) throw new Error('Descriptor hard links are not supported.');
  if(await io.readFile(plan.project.filename,'utf8')!==plan.original) throw new Error('Project descriptor changed; restart creation.');
  await unique(plan.project,plan.name,plan.kind);
  if(plan.kind==='plugin') await unique(plan.project,plan.module.name);
}
async function commit(plan,vscode,{io=fs,afterDescriptor=async()=>{}}={}) {
  await validate(plan,vscode,io);
  const owned=[],dirs=[];let descriptorWritten=false;
  async function mkdir(dir) {
    if(dir===plan.project.root) return;
    if(!safe.inside(plan.project.root,dir)) throw new Error('Directory escapes project.');
    try {const stat=await io.lstat(dir);if(stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Unsafe directory: '+dir);return;} catch(error) {if(error.code!=='ENOENT') throw error;}
    await mkdir(path.dirname(dir));await safe.safeAncestors(dir,io);
    await io.mkdir(dir);dirs.push({path:dir,stat:await io.lstat(dir)});
  }
  async function write(file) {
    await safe.safeAncestors(file.path,io);
    const handle=await io.open(file.path,'wx');const record={path:file.path,stat:await handle.stat()};owned.push(record);
    try {await handle.writeFile(file.text,'utf8');await handle.sync();}
    finally {try {record.stat=await handle.stat();} finally {await handle.close();}}
  }
  async function replace(text,expected) {
    const temp={path:path.join(plan.project.root,'.unreal-descriptor-'+randomUUID()+'.tmp'),text};
    await write(temp);
    await safe.safeAncestors(plan.project.filename,io);
    if(await io.readFile(plan.project.filename,'utf8')!==expected) throw new Error('Descriptor changed concurrently; it was preserved.');
    await io.rename(temp.path,plan.project.filename);
  }
  try {
    await mkdir(path.dirname(plan.newRoot));
    await safe.conflict(plan.newRoot,io);await io.mkdir(plan.newRoot);dirs.push({path:plan.newRoot,stat:await io.lstat(plan.newRoot)});
    for(const file of plan.files) {if(!vscode.workspace.isTrusted) throw new Error('Workspace trust changed.');await mkdir(path.dirname(file.path));await write(file);}
    // Recheck configuration/trust immediately before committing the descriptor.
    if(!vscode.workspace.isTrusted) throw new Error('Workspace trust changed.');
    if((vscode.workspace.textDocuments || []).some(doc=>doc.isDirty && path.resolve(doc.uri.fsPath)===path.resolve(plan.project.filename))) throw new Error('Project descriptor has unsaved changes.');
    if(await io.readFile(plan.project.filename,'utf8')!==plan.original) throw new Error('Descriptor changed during creation.');
    if(plan.replacement!==plan.original) {await replace(plan.replacement,plan.original);descriptorWritten=true;}
    await afterDescriptor();return plan;
  } catch(error) {
    const remaining=[];
    if(descriptorWritten) {try {await replace(plan.original,plan.replacement);} catch {remaining.push(plan.project.filename);}}
    for(const record of owned.reverse()) {
      try {await safe.safeAncestors(record.path,io);const stat=await io.lstat(record.path);if(stat.dev!==record.stat.dev || stat.ino!==record.stat.ino || stat.size!==record.stat.size || stat.mtimeMs!==record.stat.mtimeMs) {remaining.push(record.path);continue;}await io.unlink(record.path);} catch(e) {if(e.code!=='ENOENT') remaining.push(record.path);}
    }
    for(const record of dirs.reverse()) {try {await safe.safeAncestors(record.path,io);const stat=await io.lstat(record.path);if(stat.dev===record.stat.dev && stat.ino===record.stat.ino) await io.rmdir(record.path);} catch {}}
    if(remaining.length) error.message+=' Rollback incomplete; inspect '+remaining.join(', ');
    throw error;
  }
}
module.exports={unique,plan,validate,commit};
