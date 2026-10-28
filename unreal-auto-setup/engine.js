'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {supportedVersion,numericAssociation} = require('./enginePolicy');
const {protectSettings} = require('./project');
function normalize(root) { root=path.resolve(root); return path.basename(root).toLowerCase()==='engine' ? path.dirname(root) : root; }
async function exists(filename) { try { return (await fs.stat(filename)).isFile(); } catch { return false; } }
async function inspect(root,association) {
  if (!root) return {path:undefined,compatible:false,build:false,editor:false,error:'Engine path not resolved'};
  root=normalize(root);
  const result={path:root,build:await exists(path.join(root,'Engine','Build','BatchFiles','Build.bat')),editor:await exists(path.join(root,'Engine','Binaries','Win64','UnrealEditor.exe')),compatible:false};
  try {
    const version=JSON.parse((await fs.readFile(path.join(root,'Engine','Build','Build.version'),'utf8')).replace(/^\uFEFF/,''));
    result.version=version;
    const associationVersion=numericAssociation(association);
    result.compatible=supportedVersion(version.MajorVersion,version.MinorVersion) && (!associationVersion || (+associationVersion[1]===version.MajorVersion && +associationVersion[2]===version.MinorVersion));
    if (!result.compatible) result.error='Engine must be UE 5.8+ and match the numeric project association';
  } catch(error) { result.error='Cannot read Build.version: '+error.message; }
  return result;
}
async function candidates(association,{readFile=fs.readFile,registry=promisify(execFile),programData=process.env.ProgramData || 'C:\\ProgramData'}={}) {
  const numeric=numericAssociation(association);
  if (!numeric) return [];
  const version=numeric[1]+'.'+numeric[2], roots=[];
  try {
    const data=JSON.parse((await readFile(path.join(programData,'Epic','UnrealEngineLauncher','LauncherInstalled.dat'),'utf8')).replace(/^\uFEFF/,''));
    for (const entry of data.InstallationList || []) if (entry.AppName==='UE_'+version && typeof entry.InstallLocation==='string') roots.push(entry.InstallLocation);
  } catch {}
  // Query only the associated version, never enumerate the disk or execute project data.
  for (const view of ['64','32']) {
    try {
      const reg=path.join(process.env.SystemRoot || 'C:\\Windows','System32','reg.exe');
      const result=await registry(reg,['query','HKLM\\SOFTWARE\\EpicGames\\Unreal Engine\\'+version,'/v','InstalledDirectory','/reg:'+view],{windowsHide:true,timeout:3000});
      const match=/InstalledDirectory\s+REG_SZ\s+(.+)/i.exec(result.stdout);
      if (match) roots.push(match[1].trim());
    } catch {}
  }
  return [...new Set(roots.map(normalize))];
}
async function resolve(project,{pick,discover=candidates,requireBuild=true,requireEditor=true}={}) {
  const usable=result=>result.compatible && (!requireBuild || result.build) && (!requireEditor || result.editor);
  const configured=project.config.get('unrealEngine.enginePath');
  const association=project.descriptor.EngineAssociation;
  // Explicit configuration remains authoritative; do not silently replace user choices.
  if (configured) {
    const result=await inspect(configured,association);
    if (!usable(result)) throw new Error(result.error || 'Configured engine is missing '+(requireBuild && !result.build ? 'Build.bat' : 'UnrealEditor.exe')+'. Correct unrealEngine.enginePath.');
    return result;
  }
  for (const root of await discover(association)) {
    const result=await inspect(root,association);
    if (usable(result)) return result;
  }
  if (!pick) return undefined;
  const root=await pick();
  if (!root) return undefined;
  const result=await inspect(root,association);
  if (!usable(result)) throw new Error(result.error || 'Selected engine is missing required Build.bat/UnrealEditor.exe files.');
  return result;
}
async function remember(vscode,project,result) {
  if (!result || project.config.get('unrealEngine.enginePath')) return;
  return require('./generationGuard').mutate([project.root], async()=>{
  if (!vscode.workspace.isTrusted) throw new Error('Trust the workspace before remembering its engine.');
  await protectSettings(project.root,vscode);
  project.assertCurrent?.();
  await project.config.update('unrealEngine.enginePath',result.path,vscode.ConfigurationTarget.Workspace);
  });
}
module.exports={inspect,candidates,resolve,remember,normalize};
