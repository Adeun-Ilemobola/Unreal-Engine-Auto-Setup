'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');

async function tool(engine) {
  if(!engine) return undefined;
  for(const relative of ['Engine/Binaries/DotNET/UnrealBuildTool/UnrealBuildTool.exe','Engine/Binaries/DotNET/UnrealBuildTool.exe']) {
    const filename=path.join(engine,relative);
    try {if((await fs.stat(filename)).isFile()) return filename;} catch {}
  }
  return undefined;
}
async function specification(engine,project) {
  const executable=await tool(engine);
  if(!executable) throw new Error('Engine-local UnrealBuildTool.exe not found. Build/install this engine’s UnrealBuildTool before regenerating.');
  return {kind:'generation',engine,project:project.filename,cwd:project.root,executable,args:['-projectfiles','-project='+project.filename,'-game','-progress','-vscode']};
}
async function snapshot(project,vscode,engine) {
  const saved=new Map();
  const relative=filename=>path.relative(project.root,filename);
  if((vscode.workspace.textDocuments || []).some(doc=>doc.isDirty && !relative(doc.uri.fsPath).startsWith('..') && !path.isAbsolute(relative(doc.uri.fsPath)))) throw new Error('Save open project documents before regenerating project files.');
  async function visit(filename) {
    if((vscode.workspace.textDocuments || []).some(doc=>doc.isDirty && doc.uri.fsPath===filename)) throw new Error('Save configuration before regeneration: '+filename);
    let stat;try {stat=await fs.lstat(filename);} catch(error) {if(error.code==='ENOENT') return;throw error;}
    if(stat.isSymbolicLink()) throw new Error('Project generation skipped: symbolic link '+relative(filename));
    if(stat.isDirectory()) {for(const entry of await fs.readdir(filename)) await visit(path.join(filename,entry));}
    else if(stat.isFile()) saved.set(filename,await fs.readFile(filename));
  }
  // UBT's VS Code generator can overwrite these; preserve all existing VS Code files.
  await visit(path.join(project.root,'.vscode'));
  await visit(path.join(project.root,'.clang-format'));
  await visit(project.filename);
  await visit(path.join(project.root,'.ignore'));
  for(const name of await fs.readdir(project.root)) if(name.endsWith('.code-workspace')) await visit(path.join(project.root,name));
  // The engine's VS Code generator may also write its provider configuration.
  if(engine && path.resolve(engine)!==path.resolve(project.root)) await visit(path.join(engine,'.vscode'));
  return saved;
}
async function restore(saved) {
  for(const [filename,content] of saved) {
    let current;
    let ancestor=filename;
    while(true) {
      try {if((await fs.lstat(ancestor)).isSymbolicLink()) throw new Error('Cannot restore configuration through a symbolic link: '+filename);}
      catch(error) {if(error.code!=='ENOENT') throw error;}
      const parent=path.dirname(ancestor);if(parent===ancestor) break;ancestor=parent;
    }
    try {
      current=await fs.readFile(filename);
    } catch(error) {if(error.code!=='ENOENT') throw error;}
    if(!current?.equals(content)) await fs.writeFile(filename,content);
  }
}
async function run(project,engine,vscode,state,builds,{automatic=false}={}) {
  if(!vscode.workspace.isTrusted) throw new Error('Trust the workspace before project generation.');
  const spec=await specification(engine,project);
  const saved=await snapshot(project,vscode,engine);
  const revision=state.get(project.filename).revision;
  let result;
  try {result=await builds.run({...spec,automatic}).done;}
  finally {await restore(saved);}
  state.generated(project.filename,revision,result.success);
  return result;
}
module.exports={tool,specification,snapshot,restore,run};
