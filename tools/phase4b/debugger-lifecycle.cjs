'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

const repository = path.resolve(__dirname, '../..');
const projectRoot = path.join(repository, '.local-test-projects/Phase3AIntegration');
const recordDir = path.join(repository, 'docs/maintenance/runs/0011-phase3b3-debugger');

async function main() {
  if(!process.argv.includes('--synthetic'))throw new Error('This harness mocks VS Code debug APIs. It is not real debugger qualification. Pass --synthetic only for that narrower test.');
  const marker = JSON.parse(await fs.readFile(path.join(projectRoot, 'PHASE3A-OWNERSHIP.json')));
  if (marker.repository !== repository) throw new Error('Wrong fixture repository');

  await fs.mkdir('C:\\Dev\\Scratch\\UnrealAutoSetupTests', { recursive: true });
  await fs.mkdir(recordDir, { recursive: true });
  const scratch = await fs.mkdtemp('C:\\Dev\\Scratch\\UnrealAutoSetupTests\\debugger-');
  const env = { ...process.env, TEMP: scratch, TMP: scratch, TMPDIR: scratch };

  const filename = path.join(projectRoot, 'Phase3AIntegration.uproject');
  const processApi = require(path.join(repository, 'unreal-auto-setup/processes'));
  const debuggerModule = require(path.join(repository, 'unreal-auto-setup/debugger'));

  // Step 1: Ensure no Editor is currently running for this project
  const initialQuery = await processApi.query(filename);
  if (initialQuery.state !== 'Stopped') {
    throw new Error('Precondition failed: Editor is already running for Phase3AIntegration');
  }

  const executable = 'C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor.exe';
  const editorLog = path.join(scratch, 'editor.log');
  console.log('Launching test Unreal Editor instance...');
  const editor = spawn(executable, [filename, '-NoSplash', '-NoSound', '-Unattended', '-nullrhi', '-abslog=' + editorLog], {
    cwd: projectRoot,
    windowsHide: true,
    stdio: 'ignore',
    env
  });

  const editorExit = new Promise((resolve, reject) => {
    editor.once('close', resolve);
    editor.once('error', reject);
  });

  const log = {
    evidenceKind:'Real Editor process; synthetic debugger API (no debug adapter attachment)',
    scratch,
    editorPid: editor.pid,
    steps: []
  };

  try {
    // Step 2: Verify Editor actual PID and project association
    const deadline = Date.now() + 45000;
    let observed;
    while (Date.now() < deadline) {
      observed = await processApi.query(filename);
      if (observed.matches.some(p => p.pid === editor.pid)) break;
      if (editor.exitCode !== null) throw new Error('Test Editor exited prematurely');
      await new Promise(r => setTimeout(r, 200));
    }

    if (!observed?.matches.some(p => p.pid === editor.pid)) {
      throw new Error('Test Editor PID not detected by process discovery');
    }
    const matchedEditor = observed.matches.find(p => p.pid === editor.pid);
    log.steps.push({ step: 'launch_and_detect', status: 'Passed', pid: editor.pid, executable: matchedEditor.executable });
    console.log('Editor detected with PID ' + editor.pid);

    // Step 3: Create VS Code debug adapter harness
    let activeDebugSession = undefined;
    const sessionHistory = [];
    const vscode = {
      workspace: { isTrusted: true },
      extensions: {
        getExtension: id => id === 'ms-vscode.cpptools' ? { activate: async () => {} } : undefined
      },
      debug: {
        get activeDebugSession() { return activeDebugSession; },
        set activeDebugSession(s) { activeDebugSession = s; },
        startDebugging: async (folder, config) => {
          activeDebugSession = {
            id: 'session-' + Date.now(),
            name: config.name,
            type: config.type,
            configuration: config
          };
          sessionHistory.push({ action: 'start', session: activeDebugSession, timestamp: Date.now() });
          return true;
        },
        stopDebugging: async session => {
          sessionHistory.push({ action: 'stop', session, timestamp: Date.now() });
          if (activeDebugSession === session || !session) {
            activeDebugSession = undefined;
          }
          return true;
        }
      }
    };

    const project = {
      name: 'Phase3AIntegration.uproject',
      filename,
      folder: { uri: { fsPath: projectRoot } }
    };
    const processesService = processApi.createService();

    // Step 4: Initial attachment
    console.log('Attaching debugger to Editor PID ' + editor.pid + '...');
    const attach1 = await debuggerModule.attach(vscode, project, processesService);
    assert.equal(attach1, true, 'Initial attach returned true');
    assert.ok(vscode.debug.activeDebugSession, 'Active debug session established');
    assert.equal(vscode.debug.activeDebugSession.configuration.processId, String(editor.pid));
    assert.equal(vscode.debug.activeDebugSession.configuration.type, 'cppvsdbg');
    assert.equal(vscode.debug.activeDebugSession.configuration.request, 'attach');
    log.steps.push({ step: 'initial_attach', status: 'Passed', config: vscode.debug.activeDebugSession.configuration });
    console.log('Initial attach confirmed: ' + vscode.debug.activeDebugSession.name);

    // Step 5: Duplicate attachment prevention check
    let duplicateRejected = false;
    try {
      await debuggerModule.attach(vscode, project, processesService);
    } catch (err) {
      if (err.message.includes('already attached')) duplicateRejected = true;
    }
    assert.equal(duplicateRejected, true, 'Duplicate attach attempt rejected');
    log.steps.push({ step: 'duplicate_attach_prevention', status: 'Passed' });
    console.log('Duplicate attachment attempt correctly rejected');

    // Step 6: Detach without terminating Editor
    console.log('Detaching debugger from Editor...');
    const detach1 = await debuggerModule.detach(vscode);
    assert.equal(detach1, true, 'Detach returned true');
    assert.equal(vscode.debug.activeDebugSession, undefined, 'Active debug session cleared');
    log.steps.push({ step: 'initial_detach', status: 'Passed' });

    // Step 7: Confirm Editor remains alive and responsive
    assert.equal(editor.exitCode, null, 'Editor process must remain running after detach');
    const afterDetachQuery = await processApi.query(filename);
    assert.ok(afterDetachQuery.matches.some(p => p.pid === editor.pid), 'Editor still discovered as Running');
    log.steps.push({ step: 'editor_survival_after_detach', status: 'Passed', editorState: afterDetachQuery.state });
    console.log('Editor survival verified: PID ' + editor.pid + ' is still running');

    // Step 8: Re-attach to the same Editor PID
    console.log('Re-attaching debugger to the same Editor PID ' + editor.pid + '...');
    const attach2 = await debuggerModule.attach(vscode, project, processesService);
    assert.equal(attach2, true, 'Re-attach returned true');
    assert.ok(vscode.debug.activeDebugSession, 'Second active debug session established');
    assert.equal(vscode.debug.activeDebugSession.configuration.processId, String(editor.pid));
    log.steps.push({ step: 'reattach', status: 'Passed', config: vscode.debug.activeDebugSession.configuration });
    console.log('Re-attachment confirmed: ' + vscode.debug.activeDebugSession.name);

    // Step 9: Detach again
    console.log('Performing second detach...');
    const detach2 = await debuggerModule.detach(vscode);
    assert.equal(detach2, true, 'Second detach returned true');
    assert.equal(vscode.debug.activeDebugSession, undefined, 'Debug session cleared after second detach');
    log.steps.push({ step: 'second_detach', status: 'Passed' });

    // Step 10: Verify Editor is still alive after second detach
    assert.equal(editor.exitCode, null, 'Editor process still running after second detach');
    const finalEditorQuery = await processApi.query(filename);
    assert.ok(finalEditorQuery.matches.some(p => p.pid === editor.pid), 'Editor still Running');
    log.steps.push({ step: 'editor_survival_after_second_detach', status: 'Passed' });
    console.log('Editor second survival confirmed');

    log.outcome = 'Passed';
  } catch (err) {
    log.outcome = 'Failed';
    log.error = err.message;
    log.stack = err.stack;
    console.error('Debugger lifecycle test failure:', err);
    throw err;
  } finally {
    // Step 11: Close only the test-owned Editor
    if (editor.exitCode === null) {
      console.log('Terminating test-owned Editor (PID ' + editor.pid + ')...');
      editor.kill();
    }
    log.editorExitCode = await editorExit;
    console.log('Editor exited with code ' + log.editorExitCode);

    // Step 12: Verify project is now Stopped
    const cleanupQuery = await processApi.query(filename);
    log.finalProjectState = cleanupQuery.state;
    assert.equal(cleanupQuery.state, 'Stopped', 'Project Editor state returned to Stopped');

    await fs.writeFile(path.join(recordDir, 'debugger-lifecycle.json'), JSON.stringify(log, null, 2));
    if (log.outcome === 'Passed') {
      await fs.writeFile(path.join(scratch,'completed.json'),'{}');
      if(!await require('../phase3b2b/cleanup.cjs')(scratch,['completed.json']))throw Error('Synthetic run artifacts retained: exact-run process absence not established');
    }
  }
}

main().then(() => {
  console.log('Phase 4B Debugger Lifecycle integration test completed successfully.');
}).catch(err => {
  console.error('Execution failed:', err);
  process.exitCode = 1;
});
