'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { runStage, validate } = require('./real-unreal-validation');
const testTemp = require('./testTemp');
async function cleanup(directory) {
 if (require('node:fs').existsSync(path.join(testTemp.base,'.retain'))) return;
 await fs.rm(directory,{recursive:true,force:true,maxRetries:10,retryDelay:100});
}

test('P4E: root exit waits for the contained descendant',async()=>{
 const root=await fs.mkdtemp(path.join(testTemp.root(),'tree-stage-'));
 try {
 const marker=path.join(root,'descendant-finished');
 await fs.writeFile(path.join(root,'child.js'),"setTimeout(()=>require('fs').writeFileSync(process.argv[2],'done'),2000)");
 await fs.writeFile(path.join(root,'parent.js'),"require('child_process').spawn(process.execPath,[require('path').join(__dirname,'child.js'),process.argv[2]],{stdio:'ignore',detached:true}).unref();process.exit(0)");
 const stage=await runStage('descendant',process.execPath,[path.join(root,'parent.js'),marker],root,path.join(root,'log'),10000);
 assert.equal(stage.status,'Passed');assert.equal(await fs.readFile(marker,'utf8'),'done');assert.equal(stage.proof.activeProcesses,0);
 }finally{await cleanup(root);}
});
test('P4E: cancellation waits for owned job completion',async()=>{
 const root=await fs.mkdtemp(path.join(testTemp.root(),'cancel-stage-'));const controller=new AbortController();controller.abort();
 try {const stage=await runStage('cancel',process.execPath,['-e','setTimeout(()=>{},30000)'],root,path.join(root,'log'),10000,{signal:controller.signal});assert.equal(stage.status,'Failed');assert.equal(stage.cancelled,true);assert.equal(stage.proof.activeProcesses,0);}
 finally{await cleanup(root);}
});
test('P4E: log persistence error is a failure after verified completion',async()=>{
 const root=await fs.mkdtemp(path.join(testTemp.root(),'log-stage-'));
 try {const stage=await runStage('log',process.execPath,['-e','process.exit(0)'],root,root);assert.equal(stage.status,'Failed');assert.match(stage.error,/log could not be written/);assert.equal(stage.proof.activeProcesses,0);}
 finally{await cleanup(root);}
});
test('P4E: a disposable-looking existing project is never overwritten',async()=>{
 const root=await fs.mkdtemp(path.join(testTemp.root(),'UnrealAutoSetup-v06-existing-'));const project=path.join(root,'Original.uproject');await fs.writeFile(project,'original');
 try {await assert.rejects(validate({engine:root,root}),/overwrite/);assert.equal(await fs.readFile(project,'utf8'),'original');}
 finally{await cleanup(root);}
});

test('P4.2: runStage captures nonzero child process exit code and marks stage Failed', async () => {
  const scratch = await fs.mkdtemp(path.join(testTemp.root(), 'p42-fail-'));
  const logFile = path.join(scratch, 'stage.log');
  try {
    const stage = await runStage('testStage', process.execPath, ['-e', 'process.exit(42)'], scratch, logFile);
    assert.equal(stage.name, 'testStage');
    assert.equal(stage.exitCode, 42);
    assert.equal(stage.status, 'Failed');
    assert.equal(stage.timedOut, false);
    assert.ok(await fs.stat(logFile));
  } finally {
    await cleanup(scratch);
  }
});

test('P4.2: runStage enforces bounded execution time and terminates hung child', async () => {
  const scratch = await fs.mkdtemp(path.join(testTemp.root(), 'p42-hang-'));
  const logFile = path.join(scratch, 'hang.log');
  try {
    const start = Date.now();
    const stage = await runStage('hangStage', process.execPath, ['-e', 'setInterval(() => {}, 1000)'], scratch, logFile, 500);
    const duration = Date.now() - start;
    assert.equal(stage.name, 'hangStage');
    assert.equal(stage.status, 'Failed');
    assert.equal(stage.timedOut, true);
    assert.ok(stage.error.includes('timed out'));
    assert.ok(duration >= 450 && duration < 12000, 'Waits for verified owned-tree termination after timeout');
    assert.equal(stage.proof.activeProcesses,0);
  } finally {
    await cleanup(scratch);
  }
});

test('P4.2: runStage handles missing executable and records error cleanly', async () => {
  const scratch = await fs.mkdtemp(path.join(testTemp.root(), 'p42-missing-'));
  const logFile = path.join(scratch, 'missing.log');
  try {
    const fakeExe = path.join(scratch, 'nonexistent_ubt.exe');
    const stage = await runStage('missingStage', fakeExe, [], scratch, logFile);
    assert.equal(stage.name, 'missingStage');
    assert.equal(stage.status, 'Failed');
    assert.ok(stage.error);
  } finally {
    await cleanup(scratch);
  }
});

test('P4.2: validate rejects non-disposable project path', async () => {
  await assert.rejects(
    validate({ engine: 'C:\\UE', root: 'C:\\MyImportantProject' }),
    /Refusing to run real Unreal validation outside disposable test directory/
  );
});

test('P4.2: validate marks failed generation, skips dependent stages, and returns success=false', async () => {
  const scratch = await fs.mkdtemp(path.join(testTemp.root(), 'UnrealAutoSetup-v06-genfail-'));
  const mockScript = path.join(scratch, 'mock_ubt.bat');
  await fs.writeFile(mockScript, '@echo off\r\necho Mock generation failure\r\nexit /b 2\r\n');

  try {
    const report = await validate({
      engine: scratch,
      root: scratch,
      ubtPath: mockScript,
      timeoutMs: 10000,
      mockUbt: true
    });

    assert.equal(report.success, false);
    assert.equal(report.stages.length, 3);
    assert.equal(report.stages[0].name, 'generation');
    assert.equal(report.stages[0].status, 'Failed');
    assert.equal(report.stages[0].exitCode, 2);
    assert.equal(report.stages[1].name, 'moduleBuild');
    assert.equal(report.stages[1].status, 'Skipped');
    assert.equal(report.stages[2].name, 'pluginBuild');
    assert.equal(report.stages[2].status, 'Skipped');

    // Confirm validation-results.json was written with the failure
    const saved = JSON.parse(await fs.readFile(path.join(scratch, 'validation-results.json'), 'utf8'));
    assert.equal(saved.success, false);
    assert.equal(saved.stages[0].status, 'Failed');
  } finally {
    await cleanup(scratch);
  }
});

test('P4.2: validate marks failed module build, skips plugin build, and returns success=false', async () => {
  const scratch = await fs.mkdtemp(path.join(testTemp.root(), 'UnrealAutoSetup-v06-modfail-'));
  const mockScript = path.join(scratch, 'mock_ubt.js');
  // Pass generation (-projectfiles), fail moduleBuild (Development)
  await fs.writeFile(mockScript, `
    const args = process.argv.slice(2);
    if (args.includes('-projectfiles')) {
      console.log('Generation success');
      process.exit(0);
    } else {
      console.error('Module compilation error: syntax error in cpp');
      process.exit(1);
    }
  `);

  const wrapper = path.join(scratch, 'mock_wrapper.bat');
  await fs.writeFile(wrapper, `@echo off\r\n"${process.execPath}" "${mockScript}" %*\r\n`);

  try {
    const report = await validate({
      engine: scratch,
      root: scratch,
      ubtPath: wrapper,
      timeoutMs: 10000,
      mockUbt: true
    });

    assert.equal(report.success, false);
    assert.equal(report.stages[0].name, 'generation');
    assert.equal(report.stages[0].status, 'Passed');
    assert.equal(report.stages[1].name, 'moduleBuild');
    assert.equal(report.stages[1].status, 'Failed');
    assert.equal(report.stages[1].exitCode, 1);
    assert.equal(report.stages[2].name, 'pluginBuild');
    assert.equal(report.stages[2].status, 'Skipped');
  } finally {
    await cleanup(scratch);
  }
});

test('P4.2: validate marks failed plugin compilation and returns success=false', async () => {
  const scratch = await fs.mkdtemp(path.join(testTemp.root(), 'UnrealAutoSetup-v06-plugfail-'));
  const mockScript = path.join(scratch, 'mock_plugin_fail.js');
  // Pass stage 1 (generation) and stage 2 (moduleBuild), fail stage 3 (pluginBuild)
  await fs.writeFile(mockScript, `
    const fs = require('fs');
    const path = require('path');
    const countFile = path.join(__dirname, 'callcount.txt');
    let count = 0;
    try { count = parseInt(fs.readFileSync(countFile, 'utf8'), 10) || 0; } catch {}
    count++;
    fs.writeFileSync(countFile, String(count));
    if (count <= 2) {
      process.exit(0);
    } else {
      console.error('Plugin build error');
      process.exit(5);
    }
  `);
  const wrapper = path.join(scratch, 'mock_wrapper.bat');
  await fs.writeFile(wrapper, `@echo off\r\n"${process.execPath}" "${mockScript}" %*\r\n`);

  try {
    const report = await validate({
      engine: scratch,
      root: scratch,
      ubtPath: wrapper,
      timeoutMs: 10000,
      mockUbt: true
    });

    assert.equal(report.success, false);
    assert.equal(report.stages.length, 3);
    assert.equal(report.stages[0].name, 'generation');
    assert.equal(report.stages[0].status, 'Passed');
    assert.equal(report.stages[1].name, 'moduleBuild');
    assert.equal(report.stages[1].status, 'Passed');
    assert.equal(report.stages[2].name, 'pluginBuild');
    assert.equal(report.stages[2].status, 'Failed');
    assert.equal(report.stages[2].exitCode, 5);
  } finally {
    await cleanup(scratch);
  }
});

test('P4.2: successful synthetic validation marks all stages Passed and returns success=true', async () => {
  const scratch = await fs.mkdtemp(path.join(testTemp.root(), 'UnrealAutoSetup-v06-success-'));
  const wrapper = path.join(scratch, 'mock_success.bat');
  await fs.writeFile(wrapper, '@echo off\r\necho Mock success\r\nexit /b 0\r\n');

  try {
    const report = await validate({
      engine: scratch,
      root: scratch,
      ubtPath: wrapper,
      timeoutMs: 10000,
      mockUbt: true
    });

    assert.equal(report.success, true);
    assert.equal(report.stages.length, 3);
    assert.equal(report.stages[0].status, 'Passed');
    assert.equal(report.stages[1].status, 'Passed');
    assert.equal(report.stages[2].status, 'Passed');
  } finally {
    await cleanup(scratch);
  }
});
