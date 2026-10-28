# Repository and feature inventory

Audit date: 2026-10-27. Scope: current checkout, version 0.8.0. Paths below are relative to the repository root; line references refer to the unchanged source at audit time. Initial `git status --porcelain=v1` was empty. No AGENTS.md was found in the repository. Changes made by this audit are confined to `docs/audit/`.

## What the extension does

`local-tools.unreal-project-tools`, displayed as **Unreal Engine Auto Setup**, is a Windows/Win64 workflow extension for a single trusted local Unreal project folder. It initializes VS Code defaults, orchestrates external builds and project-file generation, monitors the project's Editor, attaches Microsoft C/C++ debugging, creates C++ classes/modules/plugins, and assists with module dependencies. It is neither an Unreal language server nor an Editor plugin.

The manifest declares VS Code `^1.100.0`, workspace extension hosting, no untrusted or virtual workspace support, and `onStartupFinished` activation (`unreal-auto-setup/package.json:1–31`). Runtime checks accept UE 5.8 and later, including later major versions; that is a policy check, not proof of compatibility (`core.js:16–18`).

## Repository contents

| Area | Contents and purpose |
| --- | --- |
| `unreal-auto-setup/` | Installable extension root: package manifest, 32 production CommonJS JavaScript modules, MIT license, SVG activity icon, user documentation |
| `unreal-auto-setup/tests/` | 21 `*.test.js` files, two fixture/helper modules, three opt-in VS Code smoke modules, one real Unreal validation harness |
| Root documentation | README, CAPABILITIES, VALIDATION, RELEASE-0.8.0; root README/CAPABILITIES/VALIDATION are byte-identical to extension copies at audit time |
| `build_bundle.py` | Standard-library Python VSIX and ZIP writer; handwritten manifest and explicit runtime-file list (`:1–31`) |
| Local ignored artifacts | Versioned VSIX installers from earlier releases through 0.8.0, and source ZIP bundles. These exist locally but are excluded by `.gitignore:1–5`; they are not tracked source |
| Absent tooling | No npm dependencies/devDependencies, lockfile, TypeScript configuration, bundler, linter configuration, formatter configuration for extension JS, checked-in CI workflow, launch configuration, or coverage report |

JavaScript runs directly in VS Code's Node extension host. Python is needed only for packaging. Generated artifacts are C++ headers/sources, C# ModuleRules, and JSON Unreal descriptors. XML is used for VSIX metadata. There is no React, webview, HTTP backend, database, telemetry client, or custom network service in production source.

## Complete contributed command inventory

All IDs below have prefix `unrealSetup.`. The manifest contributes **35 commands** (`package.json:33–180`); implementation also registers the internal `applyDependency` command used by Quick Fixes (`dependencyActions.js:142–145`).

| Commands | Verified behavior / owner |
| --- | --- |
| `setup`, `installExtensions` | Merge missing workspace defaults; install/activate companion extensions; preserve existing configuration; create a Skybox task when selection is valid. `extension.js:24–156` |
| `build` | Save documents, validate selection, require stopped project Editor, run managed Build.bat and publish Problems. `runner.js:69–145` |
| `run` | Reuse a clean running Editor; otherwise choose compatible Editor target/configuration, regenerate stale metadata if needed, build and open. `runner.js:78–143` |
| `buildAndRun` | Build and Open Editor using the selected known Editor target; shares operation gate. `runner.js:93–147` |
| `openEditor` | Open project without building, with duplicate/unknown-process checks. `runner.js:50–68` |
| `selectTarget`, `selectPlatform`, `selectConfiguration`, `selectBuild` | Persist selection; only Win64 offered; general settings/actions picker. `project.js:38–61`, `runner.js:153–165` |
| `regenerate` | Engine-local UBT `-projectfiles -game -progress -vscode`; snapshot and restore selected existing configuration. `generation.js:5–63` |
| `diagnose`, `openLatestLog` | Read-only project/tooling report in Output; newest regular `.log` in Saved/Logs opened as document. `diagnostics.js:13–127` |
| `attachDebugger` | Activate cpptools, freshly identify matching Editor PID, start dynamic `cppvsdbg` attach. No launch.json write. `debugger.js:7–31` |
| `newClass`, `createClassHere` | Preview and create .h/.cpp pair in discovered project/plugin module; Explorer command restricts type choices. `classWizard.js:34–63,81–86` |
| `newModule`, `newPlugin` | Preview and commit project module or project-local plugin; descriptor preservation and rollback checks. `structureWizard.js:23–62`, `creation.js:19–88` |
| `openModuleRules`, `openProjectDescriptor`, `openTargetRules`, `openPluginDescriptor` | Source/descriptor navigation using module/project pickers. `classWizard.js:65–90`, `structureWizard.js:64–78` |
| `inspectDependencies`, `addDependency`, `removeDependency`, `changeDependencyVisibility`, `manageDependencies` | Conservative Build.cs parsing; native diff confirmation; minimal undoable, unsaved WorkspaceEdit. `dependencyActions.js:50–121,142–145`, `dependencyEditor.js:5–69` |
| `findModuleForInclude`, `refreshDependencyIndex` | Exact include ownership lookup; explicit engine module/header indexing and refresh. `dependencyActions.js:45–49,123–135` |
| `refresh` | Reconcile filesystem/runtime state and refresh native sidebar. `runner.js:32–49` |
| `automationMode`, `autoBuildDelay`, `runtimeInterval` | Configure automation through pickers/input boxes. `runner.js:149–152` |
| `cancelPendingAutomaticBuild`, `cancelBuild` | Suppress queued automatic work while retaining changes, or request termination of owned build wrapper/tree. `runtimeCoordinator.js:46`, `build.js:29–31,93–99` |

## Menus, UI and settings

The activity bar contains a native Unreal TreeView with Project, Build Configuration, Runtime, Actions, Creation, Dependencies, Automation, and Navigation sections (`sidebar.js:7–15`). Two permanent status items are Build and Run (`runner.js:27–47`). Additional UI uses QuickPick, InputBox, message dialogs, terminals, Output channels, Problems, editor tabs and native diff previews. No HTML/webview surface exists.

The view title contributes Refresh. Explorer contributes Create Class Here and Manage Module Dependencies; the C++ editor context menu contributes Find Module for Include. Conditions use project-active/trust, folder/rules lists and resolved-include context keys. The class shortcut is `ctrl+k ctrl+alt+n` (`package.json:248–283`).

| Setting, prefix `unrealSetup.` | Default and behavior |
| --- | --- |
| `autoSetup` | true, window scope; automatic initialization, independent of build automation |
| `automationMode` | `watch`, resource scope; `off`, `watch`, `autoBuild`, `autoBuildAndRegenerate` |
| `autoBuildDelay` | 30 seconds, resource scope; supported range 5–300 |
| `runtimeRefreshInterval` | 30 seconds; 0 disables polling, runtime accepts 10–3600; manifest minimum 0 also permits values 1–9 that runtime replaces with 30 |
| `verboseRuntimeLogging` | false, resource scope; reconciliation detail logs |

Settings evidence: `package.json:182–236`, `runtimeWatcher.js:3`, `runtimeCoordinator.js:3–5`. The extension also consumes Skybox's `unrealEngine.enginePath` and `unrealEngine.defaultProject`. Setup supplies missing `files.associations`, Explorer/search excludes, C/C++ formatting, C++ format-on-save/indentation, and bracket/whitespace preferences (`core.js:49–58`). It hides Content and Config through defaults; this is existing intentional behavior, not asset support.

## Templates and integration boundaries

Class types: UObject, Actor, ActorComponent, SceneComponent, Unreal Interface, GameInstanceSubsystem, WorldSubsystem, EngineSubsystem, LocalPlayerSubsystem. Exposure choices depend on type; interface output explicitly prevents Blueprint implementation. Layout follows Public/Private, single-sided or flat modules. Explorer creation exposes only the first five types (`classTemplates.js:4–15,36–62`, `classWizard.js:41`).

Module/plugin creation offers Runtime, RuntimeNoCommandlet, Developer (marked deprecated), Editor, EditorNoCommandlet, Program; ten loading phases; Flat or Public/Private layouts. Plugins are code-only with EnabledByDefault=true (`moduleTemplates.js:5–26`). This is a supported subset of Unreal host types, not an exhaustive engine enum.

| Dependency/tool | Role and boundary |
| --- | --- |
| `vscode` | Host-provided commands, configuration, state, UI, files/events, diagnostics, edits and debugger APIs; not an npm dependency |
| Node built-ins | Async filesystem, paths, child processes, util/promisify, crypto UUID; tests use node:test/assert/events/os/vm |
| `ms-vscode.cpptools` | Formatting, C/C++ language services and cppvsdbg; extensionPack member and setup-time installation target |
| `skyboxlabs.unrealengine-tools` | IntelliSense configuration provider and generated UnrealBuildTool task type; separate interactive configuration selection |
| Windows PowerShell | Encoded command wrapper for builds/Editor launch, CIM process query, Live Coding mutex inspection |
| `reg.exe` | Associated engine version's HKLM InstalledDirectory lookup in 32/64-bit views |
| `taskkill.exe` | Terminate extension-owned build wrapper PID/tree on cancellation |
| Unreal installation | Build.version, Build.bat, UnrealBuildTool.exe, UnrealEditor.exe, optional engine header/module indexing |
| MSVC / Windows SDK | External Unreal build prerequisites; neither installed nor fully validated by this extension |

No direct UHT invocation: UBT drives reflection generation. No Blueprint asset editing, PIE control, cooking, packaging, deployment, module deletion/rename, arbitrary C# evaluation, external Live Coding trigger, multi-root support, or independent IntelliSense engine is implemented. See [Unreal integration](03-unreal-integration.md) for compatibility limits.
