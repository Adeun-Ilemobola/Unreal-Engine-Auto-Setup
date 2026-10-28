# Phase 3A validation and exact execution evidence

Date: 2026-10-27. Repository: `C:\Dev\VSCodeTools\unreal-auto-setup`. PowerShell profiles disabled. Initial/final branch `main`; HEAD `dc91401b7e9eed159de80cc96713e58dfdd0a3e1`. Existing Phase 1/2 working-tree changes preserved. [Initial status](initial-status.txt), [initial hashes](initial-hashes.json), [result](RESULT.md), [matrix](COMPATIBILITY_MATRIX.md).

## Evidence read and baseline

Read the requested audit summary, Unreal integration, reliability/security, testing/tooling and roadmap reports; developer guide; Phase 1/2 execution results/validation; current Git status, ignore rules, source and existing tests. No comprehensive audit repeated. The original user prompt is archived as [0003 v1](../../prompts/0003-phase3a-compatibility-v1.md); the later explicit instruction `Authorize you to trust only this disposable folder` authorized the private test-profile trust action only.

Exact baseline test command, extension directory:

```powershell
npm test
```

Observed **363 tests, 362 passed, 0 ordinary failures, 0 cancelled, 0 skipped, 1 existing TODO**, exit 0. The TODO executes and fails P1.1's desired preservation assertion. It is unresolved data-loss evidence, not passing conflict-safety validation. The suite includes three real disposable PowerShell cases; most source tests use mocked VS Code/process APIs and are not the real-host workflows below.

## Exclusion before project creation

After reading .gitignore and verifying no destination collision, added only `/.local-test-projects/Phase3AIntegration/`. Executed before creation:

```powershell
git check-ignore -v --no-index .local-test-projects/Phase3AIntegration/Phase3AIntegration.uproject
git check-ignore --no-index unreal-auto-setup/extension.js docs/DEVELOPMENT.md
```

First command matched .gitignore line 40. Second returned 1 (neither legitimate path ignored), explicitly checked as expected. After creation the generated Source path matched the same rule; `git status --short -- .local-test-projects` returned no untracked project content. The directory is outside the packaged runtime source root.

## Installed inventory commands

Representative exact commands (read-only):

```powershell
Get-Content 'C:\ProgramData\Epic\UnrealEngineLauncher\LauncherInstalled.dat'
Get-Content 'C:\Program Files\Epic Games\UE_5.8\Engine\Build\Build.version'
Get-Item 'C:\Program Files\Epic Games\UE_5.8\Engine\Build\InstalledBuild.txt'
& 'C:\Users\Owner\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd' --version
& 'C:\Users\Owner\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd' --list-extensions --show-versions
& 'C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe' -products '*' -format json
Get-ChildItem 'C:\Program Files\Microsoft Visual Studio\18\Community\VC\Tools\MSVC' -Directory
Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\Include' -Directory
Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber
& 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.exe' -help
node --version
python --version
```

VS Code CLI and CIM initially encountered sandbox EPERM/access errors, then succeeded with approved outside-sandbox execution. CLI's current default-profile extension listing omitted some companion folders; their manifests and actual Development Host discovery establish versions/availability instead. `Get-Command code` showed Cursor's wrapper, so explicit Microsoft Code paths were used.

[environment-inventory.json](environment-inventory.json) records installed locations, toolsets, SDKs, host/CLI versions and UBT's selected compiler/SDK. [engine-binary-versions.json](engine-binary-versions.json) records UnrealEditor CL 58902052 metadata and UBT executable/DLL **5.8.0.0** file metadata within the **5.8.4** engine installation; assembly file versions are not silently relabeled as patch versions. Historical Launcher 5.8.1 metadata is distinguished from Build.version 5.8.4.

## Validated creation and first actual UBT build

Inspected installed `Templates/TP_Blank/Config/TemplateDefs.ini`, template .uproject, Source targets/module and engine GameProjectGeneration source. No validated project-creation commandlet was assumed. Used the authorized equivalent template-based method:

```powershell
& tools/phase3a/create-project.ps1
node tools/phase3a/run-owned.cjs .local-test-projects/Phase3AIntegration/initial-build.json
```

Creation script is retained for exact transformations. The recorded initial build spec/ledger invokes:

```text
C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.exe
Phase3AIntegrationEditor Win64 Development
-Project=C:\Dev\VSCodeTools\unreal-auto-setup\.local-test-projects\Phase3AIntegration\Phase3AIntegration.uproject
-WaitMutex -NoHotReloadFromIDE
-Log=C:\Dev\VSCodeTools\unreal-auto-setup\docs\maintenance\runs\0003-phase3a-2026-10-27\initial-ubt-detail.log
```

Passed, exit 0; **38.67 s UBT / 39.091 s launcher**, seven project actions. UBT selected MSVC **14.50.35739**, Windows SDK **10.0.22621.0**. [Initial console](initial-ubt-build.log), [detailed log](initial-ubt-detail.log), [owned process ledger](owned-processes.jsonl). Installed engine binaries were used; no engine source rebuild or modification.

## Real VS Code hosts and native workflows

Each launch used `node tools/phase3a/run-owned.cjs <fixture-launch-spec.json>`. Full executable, argument arrays, private user-data/extension paths, PID and exit data are in [owned-processes.jsonl](owned-processes.jsonl). Existing source/companion paths were supplied with repeated --extensionDevelopmentPath; no extension installation/update. The final interactive launcher spec is retained in the ignored fixture as interactive-host-verified.json.

The initial --extensionTestsPath host loaded actual source and existing companions but reported isTrusted=false. The first waiting launch was hidden by the harness; corrected to interactive. User replies alone were not treated as evidence of trust while the API remained false. After explicit authorization to perform the trust action, native controls selected exactly the disposable folder in its private profile, and host-events records workspace-trust-granted.

The automated runner refused modal creation confirmation with `DialogService: refused to show dialog in tests`. This attempt was not counted as a passing class-creation test. An ignored, test-only driver-extension was then loaded through a development path in an ordinary interactive host. Native modals worked there. Driver-only fixes addressed case-sensitive workspace/diagnostic path comparisons, passing the correct vscode API, circular snapshot reporting and a stale stop request. Product code remained unchanged.

The host driver executes real `vscode.commands.executeCommand` calls from control JSON. Exact request IDs/command IDs/URI arguments/results/timestamps are in [host-events.jsonl](host-events.jsonl). For example, class requests used:

```powershell
@{id='object-native';operation='command';command='unrealSetup.newClass'} | ConvertTo-Json | Set-Content .local-test-projects/Phase3AIntegration/control/request.json
```

Native UI was observed and operated with the computer-use skill. Each wizard's actual Quick Picks, input fields and modal preview were used; no fake showQuickPick/showInformationMessage implementation substituted for these results.

| Request(s) | Real UI/actions and verified output |
| --- | --- |
| object-native | UObject → ProbeObject → Native only → default Flat folder → review/create → open source beside header. UProbeObject files created. |
| actor-native | Actor → ProbeActor → Native only → default folder → review/create. AProbeActor files created. |
| component-native | Actor Component → ProbeComponent → Native only → default folder → review/create. UProbeComponent files created. |
| subsystem-native | Game Instance Subsystem → ProbeSubsystem → Native only → default folder → review/create. UProbeSubsystem files created. |
| module-native | ProbeRuntime → Runtime → Public/Private → Default loading-phase preview → Create. Project descriptor appended. |
| plugin-native | ProbePlugin name/display/module, blank description → Runtime → Public/Private → Default preview → Create. Local EnabledByDefault plugin descriptor/source created. |
| inspect-dependencies | URI of Source/Phase3AIntegration/Phase3AIntegration.Build.cs; actual modal reported Editable and conventional lists. |
| add-dependency | Same source URI → discovered ProbeRuntime → Private → native diff/modal Apply. Build.cs left dirty; source text not directly rewritten by harness. |
| setup-companion | Manual setup command, then Skybox's actual project picker and Phase3AIntegrationEditor Win64 Development configuration picker. |

Four generated-class shape checks passed and source/config/plugin hashes were saved in [generated-source-checks.json](generated-source-checks.json). Real compiled output proves reflected types and templates passed UHT/MSVC. The wizards' success notification was opened/dismissed to let the awaited command complete; no unrecorded background wizard was assumed finished.

### Actual WorkspaceEdit/Undo/Redo/save

```powershell
node tools/phase3a/request.cjs dependency-undo document Source/Phase3AIntegration/Phase3AIntegration.Build.cs undo
node tools/phase3a/request.cjs dependency-redo document Source/Phase3AIntegration/Phase3AIntegration.Build.cs redo
node tools/phase3a/request.cjs dependency-saved document Source/Phase3AIntegration/Phase3AIntegration.Build.cs save
```

Observed Undo restored original source and dirty=false; Redo restored the Private ProbeRuntime edit and dirty=true; Save preserved that text with dirty=false. Earlier dependency-dirty event also recorded the unsaved applied text. This was a real VS Code document/Undo stack, not a WorkspaceEdit mock.

### Regeneration boundaries and byte checks

Saved all documents, confirmed fixture identity and no further creation/edit action was pending, then hashed existing project .vscode/.clang-format/.uproject and engine .vscode files. No concurrent edit was injected. Exact command:

```powershell
node tools/phase3a/request.cjs save-before-generation saveAll
node tools/phase3a/request.cjs ordinary-generation command unrealSetup.regenerate
```

Production generation.specification invoked engine-local UBT with:

```text
-projectfiles -project=<absolute disposable Phase3AIntegration.uproject> -game -progress -vscode
```

Result **Succeeded/0**, 6.564 s driver. All **22 pre-existing protected files** matched before/after SHA-256 values: [before](regeneration-before.json), [after](regeneration-after.json). Actual outputs include .ignore, Phase3AIntegration.code-workspace and compileCommands_Default/Phase3AIntegration JSON, alongside preserved provider/tasks/settings. New expected generated outputs are distinct from protected pre-existing byte checks. Existing shared engine config was included in preservation; shared engine source was not edited. No engine-config concurrent-edit experiment or conflict-safety claim. P1.1 implementation untouched.

### Real managed builds, failure, Problems and repair

```powershell
node tools/phase3a/request.cjs generated-code-build command unrealSetup.build
```

Passed **Succeeded/0**, 40.485 s driver / 39.28 s UBT, 20 actions, including all generated classes and ProbeRuntime/ProbePlugin DLLs. The real production build service invoked PowerShell → Build.bat → bundled dotnet/UBT; [managed process command lines](managed-build-processes.json) and [complete collected build output](managed-build-output.log).

Controlled test: copied only the disposable ProbeActor.cpp to its owned control backup, appended `#error PHASE3A_CONTROLLED_FAILURE`, ran build and diagnostic query, restored the exact source in finally, rebuilt. Actual shell sequence:

```powershell
$phaseCpp='.local-test-projects/Phase3AIntegration/Source/Phase3AIntegration/ProbeActor.cpp'
Copy-Item -LiteralPath $phaseCpp -Destination .local-test-projects/Phase3AIntegration/control/ProbeActor.original.cpp
try {
  [IO.File]::AppendAllText((Join-Path (Get-Location).Path $phaseCpp),"`n#error PHASE3A_CONTROLLED_FAILURE`n")
  node tools/phase3a/request.cjs controlled-compile-failure command unrealSetup.build
  node tools/phase3a/request.cjs controlled-failure-diagnostics diagnostics
} finally {
  Copy-Item -LiteralPath .local-test-projects/Phase3AIntegration/control/ProbeActor.original.cpp -Destination $phaseCpp
}
node tools/phase3a/request.cjs repaired-code-build command unrealSetup.build
```

Failed/6 followed by Succeeded/0. Initial Problems query was invalid because the driver compared upper/lowercase Windows paths case-sensitively. After fixing only that driver and reopening an idle host, repeated the same controlled source addition/restore with request IDs failure-diagnostics-recheck, verified-compiler-diagnostics, final-restored-build. Real VS Code API returned **UnrealBuildTool severity Error, C1189 text, ProbeActor.cpp line 8**; restored build passed again. Source restoration occurred in finally both times. Final stable-clean-build also passed after a pending newer disk revision was reconciled. No malformed/complex Build.cs was forced into editable state.

### Companions, runtime and debugger

Skybox queried the real installed engine/fixture targets; selected Phase3AIntegrationEditor Win64 Development in native UI. The existing configurationProvider remained unchanged. [Post-selection diagnostics](post-config-provider-diagnostics.json) showed no sampled C/C++ include errors. This validates a basic provider path, not every IntelliSense operation. The existing C# companion recommendation was left uninstalled.

```powershell
node tools/phase3a/request.cjs launch-owned-editor command unrealSetup.openEditor
node tools/phase3a/request.cjs clean-run-reuse command unrealSetup.run
node tools/phase3a/request.cjs editor-active-build-guard command unrealSetup.build
node tools/phase3a/request.cjs attach-owned-editor command unrealSetup.attachDebugger
node tools/phase3a/request.cjs attached-debug-state debugState
node tools/phase3a/request.cjs stop-debugger-before-close stopDebug
```

PID **12320** matched only the disposable project's command line; [first Editor ownership](owned-editor.json). The first Run had a newer restored-source Implementation revision and correctly returned Blocked, as did explicit Build while Editor was active. Attach passed with active session `Unreal: Attach Phase3AIntegration.uproject (PID 12320)`, type cppvsdbg. After stopping debugging the PID was absent; no clean detach or first-session normal-exit claim. A guarded close attempt refused to act on the now-missing/nonmatching PID; no uncertain process was touched.

Then executed stable-clean-build, relaunch-owned-editor and clean-run-second-session. After successful stable build, PID **77056** launched, and clean Run returned **Reused**. [Second ownership](owned-editor-second.json). Native UI showed Phase3AIntegration / Entry in Unreal Editor. Closed that specific returned Editor window with Alt+F4; [second session summary](editor-second-session-summary.log) reaches `Editor shut down` and `Exiting`. No PIE or undocumented Live Coding input.

The final Doctor command used the real extension host; [extension/Doctor output](extension-and-doctor-output.log). Engine indexing was explicitly measured once, then discarded by a normal idle host restart; final Doctor's Not indexed/seven local headers is expected for that new session, not a contradictory engine-scan result.

## Performance, RPG review and cleanup

```powershell
node tools/phase3a/request.cjs driver-ready measure
node tools/phase3a/request.cjs engine-index-once command unrealSetup.refreshDependencyIndex
node tools/phase3a/request.cjs indexed-runtime-measure measure
node tools/phase3a/request.cjs final-runtime-measure measure
node tools/phase3a/inspect-rpg.cjs
node tools/phase3a/summarize.cjs
```

The first measure request was initialized via control JSON with the same id/operation. Results and sample/count caveats are in [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md). Summarization ran only after host stop, omitted broad VS Code configuration/parser internals, and retained command/error/timing/build/ownership evidence.

RPG path came from `rg --files C:\Dev -g '*.uproject' -g '!node_modules' -g '!Intermediate' -g '!Binaries' -g '!Saved'`. Review was read-only; current internal modules understood historical config/task arguments/targets. Final hashes matched descriptor, settings/tasks/provider, clang-format and three discovered Build.cs files. No RPG host/build/regeneration/migration or write. [RPG findings](RPG_COMPATIBILITY.md).

Private host was saved/closed using save-final-documents and stop-final-host stop close. Final CIM query filtered only known executable types and exact Phase3AIntegration association; **0 associated processes**. [Cleanup](cleanup.json) records UTC check, tested Editor PIDs and retained directory. Full scans were read-only; no uncertain process was terminated. Earlier hidden host termination verified its exact private-profile command line and happened without active UBT. No intentional orphan/reload test of real UBT.

Retained the ignored fixture (~2.96 GB at measurement) for inspection/reproduction. No recursive deletion was performed; original RPG and siblings untouched. No outstanding global-install/change approval acted on.

A final all-process-name association audit, excluding only its own PowerShell PID, also found **0** readable command lines containing Phase3AIntegration: [final process audit](final-process-audit.json). This includes compiler/linker names rather than relying only on the earlier selected executable list; it does not assert ownership of unrelated shared services. [Final Git status](final-status.txt) retains the inherited diff and the new narrow test/documentation changes.

## Final source/tool checks

```powershell
python -B -m unittest discover -s tests -p 'test_*.py' -v
python -B bundle_sources.py
git diff --check
git check-ignore -v --no-index .local-test-projects/Phase3AIntegration/Phase3AIntegration.uproject
git status --short -- .local-test-projects
```

Four Python tests passed outside sandbox; preflight passed **43 inputs, 37 runtime modules, 3 mirrored documents** without building an archive. Fixture cannot enter these inputs or build_bundle's runtime-source recursion. JS syntax command checked all extension .js plus tools .cjs: **76 files passed**. PowerShell Language.Parser.ParseFile checked create-project.ps1 with zero parse errors. Initial-hash comparison verified **99 baseline source/historical files unchanged** (maintenance INDEX excluded for intentional update); current public manifest/version unchanged. RPG final hash comparisons passed.

No real-host result rests solely on internal helper calls. Real native setup/wizard/preview/Undo/compile/Editor/debugger evidence is distinct from source tests and timing helpers. Full future engine/platform compatibility, clean debug detach, breakpoint/stepping, RPG gameplay, P1.1 conflict safety and P1.2 cross-reload ownership remain outside the established baseline. No release package, software installation, global extension replacement, engine migration or Phase 3B implementation.

Final developer/maintenance link validation passed for all **102 local links**. Whitespace and narrow exclusion checks passed; unrelated source and this run's RESULT.md remain trackable.
