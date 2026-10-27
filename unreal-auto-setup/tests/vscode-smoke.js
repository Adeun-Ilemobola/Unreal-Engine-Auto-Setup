const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
exports.run=async()=>{
  const root=vscode.workspace.workspaceFolders[0].uri.fsPath;const result={};
  try {
    await vscode.commands.executeCommand('workbench.action.openDefaultKeybindingsFile');
    const document=vscode.workspace.textDocuments.find(doc=>doc.uri.scheme==='vscode' && /keybindings/i.test(doc.uri.path)) || vscode.window.activeTextEditor?.document;
    assert.ok(document);const defaults=document.getText();assert.ok(defaults.includes('ctrl+shift+t'));
    await fs.writeFile(path.join(root,'default-keybindings.txt'),defaults);
    result.keybindingCandidate='ctrl+k ctrl+alt+n';
    result.defaultCollision=[...defaults.matchAll(/\{[^{}]*\}/g)].some(match=>match[0].includes('"ctrl+k ctrl+alt+n"') && !match[0].includes('"unrealSetup.newClass"'));assert.equal(result.defaultCollision,false);
    await fs.writeFile(path.join(root,'default-keybindings.txt'),defaults);
    const extension=vscode.extensions.getExtension('local-tools.unreal-project-tools');assert.ok(extension);
    const api=await extension.activate();await api.refresh();
    result.version=extension.packageJSON.version;result.project=api.snapshot().project.name;result.editor=api.snapshot().editor.state;
    const commands=await vscode.commands.getCommands();
    for(const command of ['run','refresh','createClassHere','newClass','newModule','newPlugin']) assert.ok(commands.includes('unrealSetup.'+command));
    await vscode.commands.executeCommand('unrealSetup.controlCenter.focus');
    await vscode.commands.executeCommand('unrealSetup.refresh');
    await vscode.commands.executeCommand('unrealSetup.openProjectDescriptor');
    assert.equal(vscode.window.activeTextEditor.document.uri.fsPath,path.join(root,'Smoke.uproject'));
    const rows=require('../sidebar').rows(api.snapshot());assert.equal(rows.length,8);result.sections=rows.map(row=>row.label);
    assert.ok(api.snapshot().folders.some(folder=>folder.endsWith('Public')));
    result.success=true;
  } catch(error) {result.error=error.stack;throw error;}
  finally {await fs.writeFile(path.join(root,'vscode-smoke-result.json'),JSON.stringify(result,null,2));}
};
