"use strict";
const fs=require('node:fs/promises'),path=require('node:path');
const parser=require('./buildCsParser'),safe=require('./classFiles'),modules=require('./modules');
const category=visibility=>visibility+'DependencyModuleNames';
function mutate(text,moduleName,{operation='add',name,visibility='Private'}) {
  if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(name) || !['Public','Private'].includes(visibility)) throw new Error('Invalid dependency name or visibility.');
  if(operation!=='remove' && name.toLowerCase()===moduleName.toLowerCase()) throw new Error('Self-dependencies are not allowed.');
  const model=parser.parse(text,moduleName);if(!model.editable) throw new Error('Build.cs is '+model.status+': '+model.reasons.join(' '));
  const found=model.dependencies.filter(d=>d.name.toLowerCase()===name.toLowerCase() && d.visibility!=='Read Only');
  if(operation==='add' && found.length) throw new Error(name+' already exists as '+found[0].visibility+'. Public already provides visibility; use explicit Change Dependency Visibility to move it.');
  if(operation!=='add' && found.length!==1) throw new Error('Dependency cannot be identified unambiguously.');
  if(operation==='move' && found[0].visibility===visibility) throw new Error('Dependency already has this visibility.');
  if(!['add','remove','move'].includes(operation)) throw new Error('Unsupported dependency operation.');
  const edits=[];
  if(operation==='remove' || operation==='move') {
    const dep=found[0],d=dep.declaration;
    if(d.method==='Add') for(const token of model.tokens.slice(d.tokenStart,d.tokenEnd+1)) edits.push({start:token.start,end:token.end,text:''});
    else {
      const tokens=model.tokens,index=tokens.findIndex(t=>t.start===dep.start);
      edits.push({start:dep.start,end:dep.end,text:''});
      const comma=tokens[index+1]?.value===','?tokens[index+1]:tokens[index-1]?.value===','?tokens[index-1]:undefined;
      if(comma) edits.push({start:comma.start,end:comma.end,text:''});
    }
  }
  if(operation==='add' || operation==='move') {
    const candidates=model.declarations.filter(d=>d.category===category(visibility) && d.method==='AddRange');
    const eol=text.includes('\r\n')?'\r\n':'\n';
    if(candidates.length===1) {
      const d=candidates[0],last=d.entries.at(-1),close=d.close;
      const multiline=text.slice(d.open.end,close.start).includes('\n');
      if(multiline) {
        const lineStart=text.lastIndexOf('\n',close.start-1)+1;
        const closeIndent=text.slice(lineStart,close.start);const at=/^[\t ]*$/.test(closeIndent)?lineStart:close.start;
        const indent=last?(/^[\t ]*/.exec(text.slice(text.lastIndexOf('\n',last.start-1)+1,last.start))[0]):closeIndent+'  ';
        if(last && !model.tokens.some(t=>t.start>=last.end && t.end<=close.start && t.value===',')) edits.push({start:last.end,end:last.end,text:','});
        edits.push({start:at,end:at,text:indent+'"'+name+'",'+eol});
      } else {
        const lastToken=model.tokens[model.tokens.indexOf(close)-1],trailing=lastToken?.value===',';
        edits.push({start:close.start,end:close.start,text:(last&&!trailing?', ':' ')+ '"'+name+'"'+(trailing?', ':' ')});
      }
    } else {
      const close=model.constructor.close,start=text.lastIndexOf('\n',close.start-1)+1,indent=/^[\t ]*$/.test(text.slice(start,close.start))?text.slice(start,close.start):'  ';
      const unit=text.includes('\t')?'\t':'  ';
      const at=/^[\t ]*$/.test(text.slice(start,close.start))?start:close.start;
      edits.push({start:at,end:at,text:(at===close.start?eol:'')+indent+unit+category(visibility)+'.Add("'+name+'");'+eol});
    }
  }
  let proposed=text;for(const e of [...edits].sort((a,b)=>b.start-a.start || b.end-a.end)) proposed=proposed.slice(0,e.start)+e.text+proposed.slice(e.end);
  const checked=parser.parse(proposed,moduleName);if(!checked.editable) throw new Error('Proposed dependency edit failed structural verification.');
  return {original:text,proposed,edits,model:checked};
}
async function validate(project,module,vscode,original) {
  if(!vscode.workspace.isTrusted) throw new Error('Trust the workspace before editing dependencies.');
  if(!safe.inside(project.root,module.root) || path.resolve(module.buildFile)!==path.join(path.resolve(module.root),module.name+'.Build.cs')) throw new Error('Build.cs must belong to a project-local module.');
  const folders=vscode.workspace.workspaceFolders;if(folders && (folders.length!==1 || path.resolve(folders[0].uri.fsPath)!==path.resolve(project.root))) throw new Error('The active workspace changed.');
  await safe.safeAncestors(module.buildFile);
  if((await fs.lstat(module.buildFile)).nlink!==1) throw new Error('Build.cs hard links are not supported.');
  const actual=(await modules.discover(project.root)).find(m=>m.buildFile===module.buildFile);if(!actual) throw new Error('Selected module is no longer discovered.');
  if(vscode.workspace.textDocuments.some(doc=>doc.isDirty && path.resolve(doc.uri.fsPath).toLowerCase()===path.resolve(module.buildFile).toLowerCase())) throw new Error('Save Build.cs before changing dependencies.');
  if(await fs.readFile(module.buildFile,'utf8')!==original) throw new Error('Build.cs changed since preview; restart the operation.');
}
async function apply(vscode,project,module,change) {
  await validate(project,module,vscode,change.original);
  const doc=await vscode.workspace.openTextDocument(vscode.Uri.file(module.buildFile));
  if(doc.isDirty || doc.getText()!==change.original) throw new Error('Build.cs editor changed since preview.');
  const edit=new vscode.WorkspaceEdit();for(const e of change.edits) edit.replace(doc.uri,new vscode.Range(doc.positionAt(e.start),doc.positionAt(e.end)),e.text);
  if(!await vscode.workspace.applyEdit(edit)) throw new Error('VS Code refused the dependency edit; no changes were applied.');
  // Keep the edit in the editor/Undo stack. Never silently write behind a dirty buffer.
  return doc;
}
module.exports={mutate,validate,apply};
