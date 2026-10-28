# Phase 1A validation — 2026-10-28 UTC

Evidence directory: `C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1a-20261028T172121Z`. All owned executables, fixtures, profiles and probe scripts were confined to the scratch root. Production code and existing tests were not changed. All test TEMP/TMP changes were scoped to processes. No engine tool, antivirus change, global environment change, publish or commit was performed.

## Current checks and actual outcomes

| Command / observation | Outcome |
|---|---|
| git branch --show-current; git rev-parse HEAD; git status --porcelain=v1 --untracked-files=all; git diff --binary HEAD; git diff --cached --binary | main at 1d13b3a7e8e3da41af9f7270b097c239641aaf9a; original dirty tree captured; index empty |
| Python baseline ZIP + SHA-256 manifest verification | 515 tracked/nonignored files recoverably captured; ignored Alpha VSIX separately copied; ignored fixture inventory retained |
| Read Alpha VSIX and compare all extension entries with source | All 51 match; all 41 installed runtime JS modules also match; actual profile activation not inspected |
| Read hex .zip and compare its files with extracted hex | 29 entries including directories; no content differences; direct workspace/database/task facts recorded |
| Read installed UE generator and Build.version | UE 5.8.4; conditional installed-engine .vscode writes found; no generator executed |
| `node tools/run-tests.cjs tests/generation.test.js tests/classWizard.test.js tests/classFiles.test.js tests/workspace-safety.test.js` | Initial restricted run: 31 tests, 28 pass / 3 fail. Two junction EPERM failures were environmental; one P1.1 failure was product acceptance. `focused-tests.log` |
| Same focused command with authorized filesystem/process permissions | 31 tests, 30 pass / 1 fail / 0 skipped / 0 TODO, exit 1. Sole failure is unchanged P1.1. `focused-tests-unsandboxed.log` |
| `node C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1a-20261028T172121Z\wizard-contract.cjs` | Exit 0; actual production registration/creation under simulated UI reproduces silent second invocation; dismissing pending message releases gate; both two-root orders rejected. `wizard-contract-result.json` |
| `node tools/run-extension-tests.cjs C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1a-20261028T172121Z\wizard-host.cjs` | Initial executable discovery failed in restricted environment. No host tests ran. `wizard-host.log` |
| Same native command with process-scoped VSCODE_PATH pointing to Microsoft's Code.exe | Host launch refused: update mutex held after 30 seconds. Runner timed out after 90 seconds, exit 1, no test results. `wizard-host-explicit.log`; retained scratch profile `C:\Dev\Scratch\UnrealAutoSetupTests\host-kzaJKz` |
| Read installed VS Code application metadata | Launched e646868227 app package is 1.143.1; parallel update directory 2c33b50b16 package is 1.144.0. No successfully activated current test host/version claim. `code` on PATH points to Cursor, so it was not substituted. |
| Compare generation.js, generationGuard.js, generationRecovery.js and tests/generation.test.js to HEAD | Content matches after Git newline normalization; original current-byte hashes retained in baseline manifest |
| Read-only scoped Win32 process query | Restricted CIM failed; authorized read-only query returned [] for Code/Editor/dotnet/supervisor/node referencing this run's two scratch paths. `final-owned-processes.json`. No process terminated; retained profile was not deleted. |

The full Node/Python/release suites and real Unreal build were not rerun. Phase 4E's 493/494 and Alpha dist validation are historical evidence, not present-run results. No claim of fixed class lifecycle, resolved IntelliSense, safe generator writes, native cancellation equivalence or green release follows from this focused audit.

## Official documentation reviewed

Consulted on 2026-10-28; each link is a supported contract source, distinct from source inspection or host observation. Epic pages returned UE 5.8 documentation. Current online VS Code API docs may contain APIs newer than the manifest minimum; no new API was implemented or certified against all permitted versions.

| Official source | Relevant contract / boundary |
|---|---|
| [Epic VS Code setup, UE 5.8](https://dev.epicgames.com/documentation/unreal-engine/setting-up-visual-studio-code-for-unreal-engine?application_version=5.8) | Editor refresh, context-menu generation and -vscode command-line generation are documented workflows. Sample include settings do not prove full current compiler configuration. |
| [UnrealBuildTool](https://dev.epicgames.com/documentation/unreal-engine/unreal-build-tool-in-unreal-engine) | Build graph is independent of IDE project files; .Build.cs controls module build properties. |
| [Compiling Game Projects](https://dev.epicgames.com/documentation/en-us/unreal-engine/compiling-game-projects-in-unreal-engine-using-cplusplus) | C++ template or Editor C++ class wizard establishes build/target rules. |
| [Build configurations](https://dev.epicgames.com/documentation/unreal-engine/build-configurations-reference-for-unreal-engine) | Target and configuration are separate; Editor differs from Game, DebugGame differs from Debug. |
| [Build configuration](https://dev.epicgames.com/documentation/en-us/unreal-engine/build-configuration-for-unreal-engine) | UBT reads engine, user and project-specific configuration locations; no machine-wide edits needed for this audit. |
| [VS Code workspaces](https://code.visualstudio.com/docs/editing/workspaces/workspaces) | A saved workspace lists roots; an untitled workspace is also native. |
| [Multi-root workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces) | Workspace versus resource settings differ; tasks/debug entries can live at workspace/folder scopes; names support explicit variable scoping. |
| [VS Code API](https://code.visualstudio.com/api/references/vscode-api) | getWorkspaceFolder resolves URI ownership; workspaceFolders/trust/change APIs exist. First-root changes can restart extension hosts. Information-message promises resolve on selection/dismissal, relevant to the active wizard lock. |
| [Variables](https://code.visualstudio.com/docs/reference/variables-reference) | `${workspaceFolder:<actual-name>}` addresses another root; shell quoting still matters. |
| [C/C++ IntelliSense](https://code.visualstudio.com/docs/cpp/configure-intellisense) | Missing translation-unit database entry falls back to base configuration; provider selection also matters. |
| [C/C++ settings](https://code.visualstudio.com/docs/cpp/customize-cpp-settings) | configurationProvider takes precedence over other properties; matching compileCommands input supplies per-file configuration. |
| [Task Provider](https://code.visualstudio.com/api/extension-guides/task-provider) | Custom types require a provider; Shell/Process/CustomExecution are options. CustomExecution leaves process/output management to the provider, not automatic equivalence with Job containment. |
| [Debugger extension API](https://code.visualstudio.com/api/extension-guides/debugger-extension) | Debug adapters/configuration providers are distinct; reuse cpptools rather than invent an adapter. |
| [Testing extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension) | Extension Development Host and isolated user-data directories support controlled integration testing. |
| [Workspace trust](https://code.visualstudio.com/api/extension-guides/workspace-trust) | Manifest support declaration and runtime trust govern unsafe execution; trust is not engine-write authorization. |

Two attempted Markdown representations of VS Code pages failed retrieval (unsupported content type/timeout); their normal HTML pages were successfully consulted instead. No documentation conclusion depends on the failed fetches.

## Known verification limits

Native wizard, cpptools diagnostics and separate SkyBox/no-SkyBox active-provider runs remain blocked/unverified. New baseline A/C fixtures were not created; baseline B is an observed existing capture. No installed-engine regeneration was attempted because installed source establishes a possible engine-root write, forbidden by this audit's scope. No inferred safe alternative output flag was used. See REPRODUCTION_MATRIX.md for exact steps and interpretation.

## Final preservation and documentation checks

`preservation-check.json` verifies all 515 baseline files exist and match, except INDEX.md whose original bytes remain an exact prefix before the new entry. The Alpha VSIX is unchanged, the master-plan copy is byte-identical, and all inventoried hex and engine .vscode files retain their original hashes. All relative links in the new reports resolve. HEAD and empty index remain unchanged. `git diff --check` passed after correcting line endings only in the newly appended index entry. No preceding index bytes were changed.
