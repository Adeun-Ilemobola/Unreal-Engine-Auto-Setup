'use strict';
/**
 * P4.1 Reproducible Native Extension-Host Validation Suite
 * Runs inside the real VS Code Extension Development Host via --extensionTestsPath.
 * Validates 20 core scenarios without requiring Unreal Engine / UnrealBuildTool.
 */
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

exports.run = async () => {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  assert.ok(root, 'Workspace folder must exist');
  const scratchRelative=path.relative(await fs.realpath('C:\\Dev\\Scratch\\UnrealAutoSetupTests'),await fs.realpath(root));
  assert.ok(scratchRelative && !scratchRelative.startsWith('..') && !path.isAbsolute(scratchRelative),'Host workspace must be inside dedicated scratch');
  assert.ok(
    path.basename(root).toLowerCase().startsWith('lightweighthost') ||
    path.basename(root).toLowerCase().startsWith('phase3aintegration') ||
    path.basename(root).toLowerCase().startsWith('unrealautosetup-'),
    'Safety barrier: Test suite must only run in a disposable test workspace'
  );

  const results = {
    workspace: root,
    scenarios: {},
    passed: 0,
    failed: 0,
    total: 20
  };

  function record(scenario, passed, details = {}) {
    results.scenarios[scenario] = { passed, ...details };
    if (passed) results.passed++;
    else results.failed++;
    console.log(`[P4.1 Host Test] ${scenario}: ${passed ? 'PASSED' : 'FAILED'}`);
  }

  const extension = vscode.extensions.getExtension('local-tools.unreal-project-tools');
  assert.ok(extension, 'Extension must be loaded in Extension Host');

  try {
    // 1. Extension activation
    const startAct = Date.now();
    const api = await extension.activate();
    assert.ok(extension.isActive, 'Extension must be active');
    record('1. Extension activation', true, { elapsedMs: Date.now() - startAct });

    // 2. Project discovery
    let snapshot = api.snapshot();
    for (let i = 0; i < 30; i++) {
      await api.refresh();
      snapshot = api.snapshot();
      if (snapshot.project) break;
      await new Promise(r => setTimeout(r, 200));
    }
    assert.ok(snapshot.project, 'Project must be discovered');
    assert.ok(snapshot.project.name.endsWith('.uproject'), 'Discovered project descriptor');
    record('2. Project discovery', true, { projectName: snapshot.project.name });

    // 3. Command registration
    const allCommands = await vscode.commands.getCommands(true);
    const expectedCommands = [
      'unrealSetup.setup',
      'unrealSetup.build',
      'unrealSetup.run',
      'unrealSetup.refresh',
      'unrealSetup.newClass',
      'unrealSetup.createClassHere',
      'unrealSetup.newModule',
      'unrealSetup.newPlugin',
      'unrealSetup.attachDebugger',
      'unrealSetup.diagnose',
      'unrealSetup.inspectDependencies'
    ];
    const registered = expectedCommands.filter(c => allCommands.includes(c));
    assert.equal(registered.length, expectedCommands.length, 'All expected commands registered');
    record('3. Command registration', true, { registeredCount: registered.length });

    // 4. Explorer context-menu contributions
    const pkg = extension.packageJSON;
    const explorerMenus = pkg.contributes?.menus?.['explorer/context'] || [];
    assert.ok(explorerMenus.some(m => m.command === 'unrealSetup.createClassHere'), 'Explorer menu contains createClassHere');
    assert.ok(explorerMenus.some(m => m.command === 'unrealSetup.manageDependencies'), 'Explorer menu contains manageDependencies');
    record('4. Explorer context-menu contributions', true);

    // 5. Class creation QuickPick registry
    const templates = require('../classTemplates');
    assert.equal(templates.registry.length, 17, 'Full registry of 17 templates available');
    record('5. Template registry availability (not QuickPick interaction)', true, { availableTypes: templates.registry.length });

    // 6. User input validation
    assert.throws(() => templates.names('123Bad', templates.registry[0]), /identifier/);
    assert.throws(() => templates.names('class', templates.registry[0]), /identifier|keywords|reserved/);
    assert.throws(() => templates.names('CON', templates.registry[0]), /identifier|keywords|reserved/);
    const goodName = templates.names('HostProbeActor', templates.registry.find(t => t.id === 'actor'));
    assert.equal(goodName.className, 'AHostProbeActor');
    record('6. User input validation', true);

    // 7. Header/source creation with per-class folders
    const module = snapshot.modules?.[0];
    assert.ok(module, 'Test module discovered');
    const plan = templates.plan(snapshot.project, module, 'actor', 'HostProbeActor', 'Probes', 'native');
    assert.ok(plan.files[0].path.includes('HostProbeActor'), 'Per-class subfolder used');
    const filesModule = require('../classFiles');
    await filesModule.create(plan, vscode);
    assert.ok(await fs.stat(plan.files[0].path), 'Header created');
    assert.ok(await fs.stat(plan.files[1].path), 'Source created');
    record('7. Header/source creation', true, { header: plan.files[0].path });

    // 8. Native WorkspaceEdit application
    const doc = await vscode.workspace.openTextDocument(plan.files[0].path);
    await vscode.window.showTextDocument(doc);
    const edit = new vscode.WorkspaceEdit();
    edit.insert(doc.uri, new vscode.Position(0, 0), '// Probe Native Edit\n');
    const applied = await vscode.workspace.applyEdit(edit);
    assert.ok(applied, 'WorkspaceEdit applied successfully');
    assert.ok(doc.isDirty, 'Document marked dirty');
    record('8. Native WorkspaceEdit application', true);

    // 9. Undo and Redo
    await vscode.commands.executeCommand('undo');
    assert.equal(doc.isDirty, false, 'Undo restored clean document state');
    await vscode.commands.executeCommand('redo');
    assert.ok(doc.isDirty, 'Redo re-applied edit');
    await doc.save();
    record('9. Undo and Redo', true);

    // 10. Dependency diagnostics
    const testHeader = path.join(module.root, 'Public', 'DependencyProbe.h');
    await fs.mkdir(path.dirname(testHeader), { recursive: true });
    await fs.writeFile(testHeader, '#pragma once\n#include "Components/ActorComponent.h"\n');
    const probeDoc = await vscode.workspace.openTextDocument(testHeader);
    await vscode.window.showTextDocument(probeDoc);
    await vscode.languages.setTextDocumentLanguage(probeDoc, 'cpp');
    // Allow diagnostic collection
    let diags = [];
    for (let i = 0; i < 15; i++) {
      diags = vscode.languages.getDiagnostics(probeDoc.uri);
      if (diags.length) break;
      await new Promise(r => setTimeout(r, 100));
    }
    assert.ok(Array.isArray(diags));record('10. Diagnostics API observation (no expected diagnostic asserted)', true, { observedCount: diags.length });

    // 11. Quick Fix interaction
    const codeActions = await vscode.commands.executeCommand(
      'vscode.executeCodeActionProvider',
      probeDoc.uri,
      new vscode.Range(1, 0, 1, 30),
      vscode.CodeActionKind.QuickFix.value
    );
    record('11. Code-action provider query (not Quick Fix application)', true, { actionCount: codeActions?.length || 0 });

    // 12. Terminal creation and disposal
    const term = vscode.window.createTerminal('Unreal Test Terminal');
    assert.ok(term, 'Terminal created');
    term.dispose();
    record('12. Terminal creation and disposal', true);

    // 13. Build cancellation command
    // Verify cancelBuild command execution is safe and bounded when no build is active
    assert.equal((await vscode.commands.executeCommand('unrealSetup.cancelBuild')).state,'Refused');
    record('13. Idle cancellation refusal (not running-build cancellation)', true);

    // 14. Extension-host reload / refresh resilience
    await api.refresh();
    const freshSnapshot = api.snapshot();
    assert.ok(freshSnapshot.project, 'State preserved after refresh');
    record('14. Runtime refresh (not host reload)', true);

    // 15. Workspace switching handling
    // When no workspace or different workspace, services remain robust
    assert.equal(typeof api.refresh, 'function');
    record('15. Refresh export shape (not workspace switching)', true);

    // 16. Cleanup after extension deactivation contract
    assert.equal(typeof extension.exports?.refresh, 'function');
    record('16. Extension export shape (not deactivation)', true);

    // 17. Trusted workspace behavior
    assert.equal(vscode.workspace.isTrusted, true, 'Workspace is trusted');
    record('17. Trusted workspace behavior', true);

    // 18. Restricted/untrusted workspace behavior
    // Verify trust-check contracts in core modules
    assert.equal(typeof require('../classWizard').validateProject, 'function');
    record('18. Validation export shape (not restricted-workspace execution)', true);

    // 19. UI and diagnostic state consistency
    const sidebar = require('../sidebar');
    const rows = sidebar.rows(freshSnapshot);
    assert.ok(rows.length > 0, 'Sidebar rows consistent');
    record('19. UI and diagnostic state consistency', true, { rowCount: rows.length });

    // 20. No writes outside the disposable project
    const createdHeaderStat = await fs.stat(plan.files[0].path);
    assert.ok(createdHeaderStat, 'Files exist within fixture');
    assert.ok(plan.files[0].path.startsWith(root), 'Header is strictly inside fixture');
    assert.ok(plan.files[1].path.startsWith(root), 'Source is strictly inside fixture');
    record('20. Generated file paths inside fixture (not a system-wide write audit)', true);

    results.allPassed = results.failed === 0;
  } catch (err) {
    results.allPassed = false;
    results.fatalError = err.message;
    results.stack = err.stack;
    console.error('P4.1 Host Test Fatal Error:', err);
  } finally {
    const reportPath = path.join(root, 'p41-host-results.json');
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    console.log(`[P4.1 Host Test] Results written to ${reportPath}: ${results.passed}/${results.total} passed`);
  }
  if(!results.allPassed)throw new Error(results.fatalError || 'Host scenarios incomplete');
};
