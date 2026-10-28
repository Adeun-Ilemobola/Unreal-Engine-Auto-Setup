# Phase 3A — Verified compatibility baseline

Status: **Completed for the installed environment and the workflows listed below**, 2026-10-27. This is a bounded integration baseline, not certification of every engine/configuration. No Phase 3B work begun. [Prompt](../../prompts/0003-phase3a-compatibility-v1.md), [changes](CHANGES.md), [exact validation](VALIDATION.md), [compatibility matrix](COMPATIBILITY_MATRIX.md), [performance](PERFORMANCE_BASELINE.md), [RPG review](RPG_COMPATIBILITY.md).

## Environment actually tested

- Epic installed/promoted **Unreal Engine 5.8.4**, CL **58902052**, at `C:\Program Files\Epic Games\UE_5.8`; InstalledBuild.txt present. Build.version is the authoritative observed patch. LauncherInstalled.dat still reports 5.8.1 and is stale relative to the binaries/source installation; historical 5.8.1 evidence remains historical.
- **Windows 11 Home 10.0.26300**, x64; **VS Code 1.143.1**, commit e646868227c3e3a9e3f24277c8c7220be42c0be7. Used the explicit Microsoft VS Code executable because `code` on PATH resolves to Cursor.
- UBT selected **MSVC 14.50.35739** from toolset folder 14.50.35717 in Visual Studio Community 2026 **18.11.1**, with **Windows SDK 10.0.22621.0**. Other installed toolsets/SDKs were inventoried, not certified.
- Repository extension **local-tools.unreal-project-tools 0.8.0**, loaded directly in an isolated Development Host; existing **Microsoft C/C++ 1.35.4** and **Skybox 0.1.2** files also loaded in development mode. No global installation/update. Same-version global extension files exist, but the maintained source differs and this run does not certify that older installed copy.
- CLI Node **24.19.0**, VS Code extension-host Node **24.21.0**, Python **3.14.7**. See [inventory](environment-inventory.json), [host environment](host-environment.json), and [binary versions](engine-binary-versions.json).

## Disposable project and execution

Created `C:\Dev\VSCodeTools\unreal-auto-setup\.local-test-projects\Phase3AIntegration` only after adding and checking the narrow `/.local-test-projects/Phase3AIntegration/` ignore rule. Unrelated source/docs remain trackable, and runtime packaging preflight excludes this project.

Creation was **scripted from the installed TP_Blank C++ template**, following its TemplateDefs.ini Source filename/content rename rules. It was not created through the Unreal Editor project browser and is not described as Editor-created. Retained template V7 build settings/Unreal5_8 include order and ordinary game/Editor targets; created a 5.8-associated descriptor, minimal Entry-map configs, no optional Modeling Tools/Starter Content, one initial runtime module. The first real UBT build established that this template-based project is executable, not just a fabricated descriptor. The Actor was then created through the real extension wizard.

The test host used a private user-data/empty extension directory under this ignored fixture and explicit development paths for existing sources/companions. Workspace trust was initially false. After the user's explicit instruction authorizing trust of this exact folder, native trust controls were used only for the disposable folder in the private profile. No global security setting was changed.

## Real integration results

| Workflow | Observed result |
| --- | --- |
| Discovery/setup | Passed: real host recognized the selected descriptor, engine, Editor target and Win64 Development selection; created defaults/tasks/provider config; preserved custom `files.exclude.Content=false` and existing .clang-format. Manual setup repeated safely. |
| C++ wizards | Passed: native Quick Picks, previews and confirmations created UProbeObject, AProbeActor, UProbeComponent and UProbeSubsystem (Game Instance). Four static output checks confirmed UCLASS, GENERATED_BODY, generated include, base class and PHASE3AINTEGRATION_API. All compiled with UHT. |
| Module/plugin | Passed: native wizards created Runtime/Default ProbeRuntime with Public/Private layout and a project-local ProbePlugin. Project module declaration appended; plugin has its own descriptor and EnabledByDefault=true. All DLLs compiled. |
| Dependency editing | Passed: native inspection reported Editable, a real diff preview added a Private ProbeRuntime dependency, WorkspaceEdit left Build.cs dirty, Undo restored original text/clean state, Redo restored the edit, Save persisted it. No direct rules rewrite was substituted for the UI workflow. |
| Ordinary regeneration | Passed under controlled no-concurrent-edit conditions: actual UBT projectfiles invocation via the extension returned Succeeded/0 in 6.56 s. All **22 protected-file hashes** matched afterward, including existing shared engine .vscode files. This does not resolve P1.1. |
| Compilation | Passed: initial CLI Development Editor build 38.67 s UBT time; generated classes/module/plugin build via extension 39.28 s UBT time. Controlled #error yielded Failed/6; restored code yielded Succeeded/0. Recheck verified real VS Code UnrealBuildTool C1189 at ProbeActor.cpp:8. Stable final build also succeeded. |
| Companions | Passed basic configuration path: selected project and Phase3AIntegrationEditor Win64 Development in Skybox's native picker; provider configuration stayed authoritative and sampled C/C++ include diagnostics cleared. Engine index command completed once. Full IntelliSense feature coverage remains partial. |
| Editor/runtime | Passed: extension opened test-owned Editor PIDs 12320 and later 77056; matching command lines recorded. First Run with a newer restored-source revision blocked conservatively. After stable build, clean Run returned Reused without another build/launch. Active-Editor Build returned Blocked. Second session visibly opened Entry in the real Editor and exited normally. |
| Debugger | Passed basic cppvsdbg attach to PID 12320, session name/type verified. After stopping that debugger, the first PID was no longer present; a clean detach contract was not established. Separate second-session normal exit was verified. No breakpoint/stepping/PIE/Live Coding automation. |

The initial --extensionTestsPath host refused modal confirmations (`DialogService: refused to show dialog in tests`). It was replaced with a real interactive Development Host and a local driver; modal class/dependency workflows then passed. Test-driver corrections also addressed hidden launch, path-case filtering, circular JSON reporting and a stale stop request. These are recorded as harness limitations/corrections, not production defects. No helper-only test was promoted to a real-host result.

## Measurements and existing project

One measured non-active extension activation wait: **3.469 s**. On the completed three-module/one-plugin fixture, project discovery **1.43–2.02 ms**, module discovery **3.49–5.84 ms**, plugin discovery **0.53–0.54 ms**, disk reconciliation **4.04–9.41 ms**, runtime refresh **573–903 ms**. One combined project/engine index command took **5.474 s**, reporting **69,946 combined headers**. These few warm-process samples are not a benchmark distribution. An Editor memory-pressure warning limits extrapolation; no optimization was implemented.

Confidently located `C:\Dev\Unreal\RPGX\RPGX.uproject`. Read-only review found a 5.8 association, conventional RPGX/RPGXEditor targets, historical matching settings/provider config and an older task label whose arguments remain recognized. Protected config and all discovered build-rule hashes stayed unchanged. No RPG build, regeneration, migration, Editor launch or gameplay change was performed. Discovery lists disabled local plugin modules too; this is distinct from UBT enablement.

## Cleanup, preservation and remaining limits

Second Editor log reaches `Editor shut down` and `Exiting`. Final read-only audit found **zero explicitly project-associated Editor/build/test-host processes**; [cleanup record](cleanup.json). No uncertain process was terminated. An earlier hidden test-host tree was stopped only after verifying its private disposable-profile command line; no UBT was active then.

The fixture is **retained under its verified ignore rule** for review/reproduction, approximately **2.96 GB** including binaries, intermediates, Editor caches and private VS Code profile. No sibling directory/RPG content was deleted. Necessary summaries/output logs were copied into this run before host closure; broad VS Code configuration/parser internals were omitted from curated snapshots.

Source tests: **363 tests, 362 passed, 0 ordinary failures/skips/cancelled, 1 existing P1.1 TODO**. Four packaging tests passed. Syntax passed for 76 JS/CommonJS files plus the creation PowerShell parser check. Preflight: 43 runtime package inputs, 37 modules, three documentation mirrors. These source/tool checks are separate from the real-host results above.

Initial/final branch main; HEAD `dc91401b7e9eed159de80cc96713e58dfdd0a3e1`. No commits. **99 baseline source/historical files** verified unchanged before index update. Production source, public IDs/settings, v0.8.0, installed software/toolchains, engine source, and historical reports preserved. Only the narrow ignore rule, integration tools, prompt/run and maintenance index are Phase 3A additions/changes.

**P1.1 remains Blocked:** ordinary generation success does not prove conflict-safe restoration. **P1.2 remains Partially complete:** ownership/gating can be lost across host reload; no real UBT orphan experiment was performed. No outstanding installation/global-change approval was needed or acted upon. Phase 3B should first address these safety limits and explicitly test debugger detach, then extend the disposable host/engine compatibility matrix and measure representative RPG-scale latency before any optimization. No Phase 3B work started.
