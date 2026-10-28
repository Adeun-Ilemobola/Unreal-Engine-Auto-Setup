'use strict';
/**
 * P4.1 Reproducible Native Extension-Host Test Launcher
 * Launches VS Code Extension Development Host with isolated scratch profile, extensions dir, and workspace.
 */
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const repository = path.resolve(__dirname, '..');
const extensionPath = path.join(repository, 'unreal-auto-setup');
const scratchBase = 'C:\\Dev\\Scratch\\UnrealAutoSetupTests';

function findVSCode() {
  if (process.env.VSCODE_PATH && fsSync.existsSync(process.env.VSCODE_PATH)) {
    return process.env.VSCODE_PATH;
  }
  for(const base of [process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA,'Programs'),process.env.ProgramFiles].filter(Boolean)) {
    const candidate=path.join(base,'Microsoft VS Code','Code.exe');if(fsSync.existsSync(candidate))return candidate;
  }

  try {
    const stdout = cp.execSync('where.exe Code.exe', { encoding: 'utf8' });
    const first = stdout.split(/\r?\n/).find(line => line.trim().length > 0);
    if (first && fsSync.existsSync(first)) return first;
  } catch {}

  throw new Error('VS Code executable (Code.exe) not found. Set VSCODE_PATH environment variable.');
}

async function prepareLightweightWorkspace(workspaceDir) {
  await fs.mkdir(path.join(workspaceDir, 'Source', 'LightweightHost', 'Public'), { recursive: true });
  await fs.mkdir(path.join(workspaceDir, 'Source', 'LightweightHost', 'Private'), { recursive: true });

  const uproject = path.join(workspaceDir, 'LightweightHost.uproject');
  await fs.writeFile(uproject, JSON.stringify({
    FileVersion: 3,
    EngineAssociation: '5.8',
    Modules: [{ Name: 'LightweightHost', Type: 'Runtime', LoadingPhase: 'Default' }]
  }, null, 2));

  const buildCs = path.join(workspaceDir, 'Source', 'LightweightHost', 'LightweightHost.Build.cs');
  await fs.writeFile(buildCs, `
using UnrealBuildTool;
public class LightweightHost : ModuleRules {
    public LightweightHost(ReadOnlyTargetRules Target) : base(Target) {
        PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine" });
    }
}
`);

  const targetCs = path.join(workspaceDir, 'Source', 'LightweightHostEditor.Target.cs');
  await fs.writeFile(targetCs, `using UnrealBuildTool;
public class LightweightHostEditorTarget : TargetRules {
    public LightweightHostEditorTarget(TargetInfo Target) : base(Target) {
        Type = TargetType.Editor;
        ExtraModuleNames.Add("LightweightHost");
    }
}
`);

  const gameTargetCs = path.join(workspaceDir, 'Source', 'LightweightHost.Target.cs');
  await fs.writeFile(gameTargetCs, `using UnrealBuildTool;
public class LightweightHostTarget : TargetRules {
    public LightweightHostTarget(TargetInfo Target) : base(Target) {
        Type = TargetType.Game;
        ExtraModuleNames.Add("LightweightHost");
    }
}
`);
}

async function main() {
  const codeExe = findVSCode();
  console.log('Using VS Code:', codeExe);

  await fs.mkdir(scratchBase, { recursive: true });
  const runDir = await fs.mkdtemp(path.join(scratchBase,'host-'));
  const profileDir = path.join(runDir, 'profile');
  const extensionsDir = path.join(runDir, 'extensions');
  const workspaceDir = path.join(runDir, 'LightweightHost');

  await fs.mkdir(path.join(profileDir, 'User'), { recursive: true });
  await fs.mkdir(extensionsDir, { recursive: true });
  await prepareLightweightWorkspace(workspaceDir);

  // Settings: Trust workspace, disable auto-update, telemetry
  await fs.writeFile(path.join(profileDir, 'User', 'settings.json'), JSON.stringify({
    'security.workspace.trust.enabled': false,
    'security.workspace.trust.emptyWindow': false,
    'unrealSetup.autoSetup': false,
    'unrealSetup.automationMode': 'watch',
    'extensions.autoUpdate': false,
    'extensions.autoCheckUpdates': false,
    'telemetry.telemetryLevel': 'off',
    'update.mode': 'none'
  }, null, 2));

  // Determine test suite script
  const requestedTest = process.argv[2] || 'tests/host-runner-suite.js';
  const testScript = path.isAbsolute(requestedTest) ? requestedTest : path.join(extensionPath, requestedTest);

  console.log(`Starting isolated test host for: ${path.basename(testScript)}`);
  console.log(`Scratch directory: ${runDir}`);

  const args = [
    '--new-window',
    '--disable-gpu',
    '--disable-telemetry',
    '--user-data-dir=' + profileDir,
    '--extensions-dir=' + extensionsDir,
    '--extensionDevelopmentPath=' + extensionPath,
    '--extensionTestsPath=' + testScript,
    workspaceDir
  ];

  const env = {
    ...process.env,
    TEMP: runDir,
    TMP: runDir,
    TMPDIR: runDir
  };
  delete env.ELECTRON_RUN_AS_NODE;

  const child = cp.spawn(codeExe, args, {
    env,
    stdio: 'inherit',
    windowsHide: true
  });
  let spawnError;child.on('error',error=>{spawnError=error;});

  const resultsFile = path.join(workspaceDir, 'p41-host-results.json');
  const deadline = Date.now() + 90000; // 90 seconds timeout
  let results = null;

  try {
    while (Date.now() < deadline) {
      if(spawnError)throw spawnError;
      if (fsSync.existsSync(resultsFile)) {
        try {
          const content = await fs.readFile(resultsFile, 'utf8');
          results = JSON.parse(content);
          if (results && results.total !== undefined) break;
        } catch {}
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!results) {
      throw new Error(`Extension host test timed out after 90s without producing ${resultsFile}`);
    }

    console.log('\n--- P4.1 Extension Host Validation Results ---');
    console.log(`Total Scenarios: ${results.total}`);
    console.log(`Passed:          ${results.passed}`);
    console.log(`Failed:          ${results.failed}`);
    for (const [name, data] of Object.entries(results.scenarios || {})) {
      console.log(`  [${data.passed ? 'PASS' : 'FAIL'}] ${name}`);
    }

    const scenarios=Object.values(results.scenarios || {});
    if (!results.allPassed || scenarios.length!==results.total || scenarios.some(s=>s.passed!==true) || results.passed!==scenarios.length || results.failed!==0) {
      throw new Error(`Host tests failed: ${results.failed} failures`);
    }

    console.log('\nAll P4.1 validation scenarios passed successfully.');
  } finally {
    // Root exit is not tree completion. Reuse the existing exact-run absence check.
    if(results)console.log('HOST_RESULTS '+JSON.stringify(results));
    let cleaned=false;
    if(results?.allPassed && results.passed===results.total && !results.fatalError) {
      for(let i=0;i<10 && !cleaned;i++){await new Promise(r=>setTimeout(r,1000));cleaned=await require('./phase3b2b/cleanup.cjs')(runDir,['LightweightHost/p41-host-results.json']).catch(()=>false);}
    }
    if(!cleaned){child.unref();console.error('Retained run; process completion not established: '+runDir);process.exitCode=1;}
    else console.log('Verified completed cleanup: '+runDir);
  }
}

main().catch(err => {
  console.error('P4.1 Runner error:', err.message);
  process.exitCode = 1;
});
