'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
exports.run=async()=>{
 const vscode=require('vscode'),scratch=process.env.UNREAL_AUTO_SETUP_INTEGRATION_ROOT,record={scratch,checks:[]};
 try{
  const extension=vscode.extensions.getExtension('local-tools.unreal-project-tools');assert.ok(extension);
  assert.ok(extension.extensionPath.toLowerCase().startsWith(path.join(scratch,'extensions').toLowerCase()+path.sep));
  assert.equal(extension.packageJSON.version,'0.8.0');const api=await extension.activate();assert.ok(extension.isActive);record.extensionPath=extension.extensionPath;record.checks.push('Installed VSIX activation');
  const registered=await vscode.commands.getCommands(true);for(const item of extension.packageJSON.contributes.commands)assert.ok(registered.includes(item.command),item.command);record.checks.push('All public commands registered');
  assert.equal(typeof api.refresh,'function');assert.equal(typeof api.snapshot,'function');
  const templates=require(path.join(extension.extensionPath,'classTemplates'));assert.equal(templates.registry.length,17);
  const snippetFile=path.join(extension.extensionPath,extension.packageJSON.contributes.snippets[0].path),snippets=JSON.parse(await fs.readFile(snippetFile));assert.equal(Object.keys(snippets).length,4);
  for(const snippet of Object.values(snippets)){
   const doc=await vscode.workspace.openTextDocument({language:'cpp',content:''});const editor=await vscode.window.showTextDocument(doc);
   assert.equal(await editor.insertSnippet(new vscode.SnippetString(snippet.body.join('\n'))),true);assert.ok(doc.getText().length>0);assert.ok(!doc.getText().includes('${'));await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
  }
  record.checks.push('Four packaged snippets inserted by native editor');
  await require(path.join(extension.extensionPath,'processSupervisor')).verifyHelper();record.checks.push('Installed native helper integrity');
  record.status='Passed';
 }catch(error){record.status='Failed';record.error=error.stack;throw error;}
 finally{await fs.writeFile(path.resolve(__dirname,'../../docs/maintenance/runs/0013-phase4e-review/installed-package.json'),JSON.stringify(record,null,2));if(record.status==='Passed')await fs.writeFile(path.join(scratch,'completed.json'),'{}');}
};
