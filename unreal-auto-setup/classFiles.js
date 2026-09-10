'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const modules=require('./modules');

function inside(root,filename) {
  const relative=path.relative(path.resolve(root),path.resolve(filename));
  return relative!=='' && relative!=='..' && !relative.startsWith('..'+path.sep) && !path.isAbsolute(relative);
}
async function safeAncestors(filename,io=fs) {
  let current=path.resolve(filename);
  while(true) {
    try {if((await io.lstat(current)).isSymbolicLink()) throw new Error('Cannot generate through a symbolic link: '+current);}
    catch(error) {if(error.code!=='ENOENT') throw error;}
    const parent=path.dirname(current);if(parent===current) return;current=parent;
  }
}
async function conflict(filename,io=fs) {
  try {
    const names=await io.readdir(path.dirname(filename));
    const match=names.find(name=>name.toLowerCase()===path.basename(filename).toLowerCase());
    if(match) throw new Error('Destination already exists: '+path.join(path.dirname(filename),match));
  } catch(error) {if(error.code!=='ENOENT') throw error;}
}
async function validate(plan,vscode,{io=fs}={}) {
  if(!vscode.workspace.isTrusted) throw new Error('Trust the workspace before creating Unreal source files.');
  const folders=vscode.workspace.workspaceFolders;
  if(folders && (folders.length!==1 || path.resolve(folders[0].uri.fsPath)!==path.resolve(plan.project.root))) throw new Error('The active project folder changed. Restart the class wizard.');
  if(!inside(plan.project.root,plan.module.root)) throw new Error('The module must be inside the active project.');
  await safeAncestors(plan.project.filename,io);
  await safeAncestors(plan.module.buildFile,io);
  const current=await modules.inspect(plan.module.root,plan.module.origin,plan.module.plugin);
  if(!current || current.ruleText!==plan.module.ruleText || current.publicPath!==plan.module.publicPath || current.privatePath!==plan.module.privatePath) throw new Error('Module rules or layout changed. Restart the class wizard.');
  const protectedPaths=[plan.project.filename,plan.module.buildFile,...plan.files.map(file=>file.path)];
  const dirty=(vscode.workspace.textDocuments || []).find(doc=>doc.isDirty && protectedPaths.some(filename=>path.resolve(filename).toLowerCase()===path.resolve(doc.uri.fsPath).toLowerCase()));
  if(dirty) throw new Error('Save or close the unsaved document before class creation: '+dirty.uri.fsPath);
  for(const file of plan.files) {
    if(!inside(plan.module.root,file.path) || !/\.(h|cpp)$/.test(file.path)) throw new Error('Invalid class destination: '+file.path);
    await safeAncestors(file.path,io);await conflict(file.path,io);
  }
}
async function create(plan,vscode,{io=fs}={}) {
  await validate(plan,vscode,{io});
  const created=[],directories=[];
  async function makeDirectory(directory) {
    if(!inside(plan.module.root,directory) && directory!==plan.module.root) throw new Error('Directory escapes selected module.');
    try {const stat=await io.lstat(directory);if(stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Unsafe output directory: '+directory);return;}
    catch(error) {if(error.code!=='ENOENT') throw error;}
    await makeDirectory(path.dirname(directory));
    await safeAncestors(directory,io);
    try {await io.mkdir(directory);directories.push({path:directory,stat:await io.lstat(directory)});}
    catch(error) {if(error.code!=='EEXIST') throw error;await safeAncestors(directory,io);}
  }
  try {
    for(const file of plan.files) {
      if(!vscode.workspace.isTrusted) throw new Error('Workspace trust changed during class creation.');
      await makeDirectory(path.dirname(file.path));await safeAncestors(file.path,io);await conflict(file.path,io);
      const handle=await io.open(file.path,'wx');
      const record={path:file.path,stat:await handle.stat()};created.push(record);
      try {await handle.writeFile(file.text,'utf8');await handle.sync();}
      finally {try {record.stat=await handle.stat();} finally {await handle.close();}}
    }
    if(!vscode.workspace.isTrusted) throw new Error('Workspace trust changed during class creation.');
    return plan.files.map(file=>file.path);
  } catch(error) {
    const remaining=[];
    // Remove only files created by this operation, still carrying the same identity/content timestamps.
    for(const record of created.reverse()) {
      try {
        await safeAncestors(record.path,io);
        const stat=await io.lstat(record.path);
        if(stat.dev!==record.stat.dev || stat.ino!==record.stat.ino || stat.size!==record.stat.size || stat.mtimeMs!==record.stat.mtimeMs) {remaining.push(record.path);continue;}
        await io.unlink(record.path);
      } catch(rollbackError) {if(rollbackError.code!=='ENOENT') remaining.push(record.path);}
    }
    for(const record of directories.reverse()) {
      try {await safeAncestors(record.path,io);const stat=await io.lstat(record.path);if(stat.dev===record.stat.dev && stat.ino===record.stat.ino) await io.rmdir(record.path);} catch {}
    }
    if(remaining.length) error.message+=' Rollback incomplete; inspect: '+remaining.join(', ');
    throw error;
  }
}
module.exports={inside,safeAncestors,conflict,validate,create};
