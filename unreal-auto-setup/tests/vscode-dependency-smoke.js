const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
exports.run=async()=>{
  const root=vscode.workspace.workspaceFolders[0].uri.fsPath,result={};
  try {
    await require('./vscode-smoke').run();
    const api=await vscode.extensions.getExtension('local-tools.unreal-project-tools').activate();
    await vscode.commands.executeCommand('unrealSetup.refreshDependencyIndex');await api.refresh();
    result.index=api.snapshot().dependencies.index;assert.match(result.index.status,/Ready/);assert.ok(result.index.headers>10000);
    const module=api.snapshot().modules[0],project=api.snapshot().project;
    const editor=require('../dependencyEditor'),original=await fs.readFile(module.buildFile,'utf8'),proposal=editor.mutate(original,module.name,{name:'Projects',visibility:'Private'});
    const doc=await vscode.workspace.openTextDocument(module.buildFile);await vscode.window.showTextDocument(doc);await editor.apply(vscode,project,module,proposal);assert.equal(doc.getText(),proposal.proposed);assert.ok(doc.isDirty);
    await vscode.commands.executeCommand('undo');assert.equal(doc.getText(),original);result.workspaceEditUndo=true;
    const filename=path.join(module.root,'Public','SmokeInclude.h');await fs.writeFile(filename,'#pragma once\n#include "Components/ActorComponent.h"\n');
    const source=await vscode.workspace.openTextDocument(filename);await vscode.window.showTextDocument(source);await vscode.languages.setTextDocumentLanguage(source,'cpp');
    let found=[];for(let n=0;n<30;n++){found=vscode.languages.getDiagnostics(source.uri).filter(d=>d.source==='Unreal Dependencies');if(found.length)break;await new Promise(r=>setTimeout(r,200));}
    assert.equal(found.length,1);const fixes=await vscode.commands.executeCommand('vscode.executeCodeActionProvider',source.uri,found[0].range,vscode.CodeActionKind.QuickFix.value);
    assert.ok(fixes.some(f=>f.title.includes('Public Unreal dependency')));assert.ok(fixes.some(f=>f.title.includes('Private Unreal dependency')));result.diagnostic=found[0].message;result.quickFixes=fixes.filter(f=>f.title.includes('Unreal dependency')).map(f=>f.title);result.success=true;
  } catch(error){result.error=error.stack;throw error;} finally {await fs.writeFile(path.join(root,'vscode-dependency-result.json'),JSON.stringify(result,null,2));}
};
