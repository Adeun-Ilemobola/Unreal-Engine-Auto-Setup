# Phase 3A changes and boundaries

This phase executed integration validation. It did not modify production extension JavaScript, manifest, version, dependencies, cancellation, regeneration preservation, automation policy or engine compatibility policy.

## Tracked/reviewable repository changes

- `.gitignore`: one narrow root-anchored rule, `/.local-test-projects/Phase3AIntegration/`, added before fixture creation. `git check-ignore -v --no-index` verified the descriptor and generated Source path. Source/docs remained trackable; status for `.local-test-projects` stays empty.
- `tools/phase3a/create-project.ps1`: guarded creation from the installed TP_Blank source template. Refuses an existing destination or missing ignore/template evidence; writes a purpose/repository/template ownership marker. Copies/renames Source according to observed TemplateDefs.ini rules; creates a 5.8 association and minimal Entry-map configuration without optional content. This is explicitly template-based, not Editor project-browser creation.
- `tools/phase3a/run-owned.cjs`: allowlisted executable/cwd/marker checks, argument-array process launching, per-command logs, PID/start/exit ledger. Console tools are hidden; the corrected Code launch is interactive. No unrelated termination capability is provided by this script.
- `tools/phase3a/host-tests.cjs`: real VS Code API driver for an isolated Development Host, with JSON request/result evidence. Uses actual registered Unreal commands and native dialogs; real documents, Undo/Redo, WorkspaceEdits, diagnostics and debug session APIs. Internal project/module/tracker calls are separately labeled measurement helpers. No public extension API/product feature was added.
- `tools/phase3a/request.cjs`: bounded file-based control client for that local driver. Exact requests/results reside in host-events.jsonl. It does not imply a command-return event is a passing assertion; file/build/diagnostic/session checks establish outcomes.
- `tools/phase3a/inspect-rpg.cjs`: read-only inspection of the confidently located RPGX project, using current internal discovery/policy helpers and before/after hashes. It does not activate the extension or build RPGX.
- `tools/phase3a/summarize.cjs`: after-host-stop curation of broad configuration/parser internals, timing extraction, generated-class shape checks/hashes and selected output-log collection. No screenshot payload processing or duplication of a real project backup.
- New immutable Phase 3A prompt/run records and maintenance index entry. Prior audit, Phase 1 and Phase 2 reports preserved; 99 baseline source/historical files checked unchanged before the planned index update.

## Disposable files created/changed

Only under the ignored owned fixture: ownership marker, initial `.uproject`, conventional game/Editor targets and runtime module from installed template; Config/Content/.vscode; four real wizard-created class pairs; ProbeRuntime module and ProbePlugin descriptor/source; a real editor-applied Private ProbeRuntime Build.cs dependency; controlled-error backup and temporary `#error` addition (restored); UBT/Editor intermediates/binaries/project metadata; private VS Code user data, empty extension directory, local driver-extension package and control/launch JSON.

The local driver-extension is an ignored development-path harness, not a globally installed extension. Existing companion extension directories were read/loaded, not copied over, installed, updated or removed. Private profile settings prevented automatic extension update checks; workspace trust was granted only to this folder after the user's explicit authorization. No global environment, registry or toolchain change.

## Important observed limitations/corrections

1. Build.version says 5.8.4 while LauncherInstalled.dat says 5.8.1. Recorded both; tested the installed binary/source patch, with no engine install/update.
2. The first automated host was Restricted; an initially hidden launcher window was corrected. A later real host received explicitly authorized folder trust. No test result was invented from a user reply while API trust stayed false.
3. VS Code `--extensionTestsPath` refused native modal confirmations. A local interactive Development Host driver replaced that runner for real wizard/preview confirmation tests. The failed wizard attempt created no class files; subsequent native workflows succeeded.
4. Driver fixes: compare Windows paths case-insensitively; accept the driver's real vscode API rather than an unmapped external require; handle repeated/circular snapshot references; clear stale stop requests before relaunch; omit broad configuration/parser internals from curated evidence. The initial empty diagnostics query was a driver path-case error, not a product parser failure; the repeated controlled failure verified real UnrealBuildTool C1189.
5. Run while Editor was active initially blocked because a newer restored-source revision remained dirty. A stable build covered it, and a later clean Run returned Reused. No unsafe build bypass or dirty-state clearing was added.
6. Basic debugger attach passed; the first Editor PID was absent after stopping debug, without a clean first-session exit log. Detach behavior is unverified, not labeled a proven production defect. The second session was separately observed in the native UI and closed normally with exit log evidence.
7. Index graph warnings are advisory and engine indexing is in-memory. The one measured combined engine/project scan was Ready with 69,946 headers; a later fresh host appropriately reported Not indexed with seven local headers. No cache or indexing optimization.
8. Memory pressure appeared in the Editor UI. Timings are small-fixture samples on this host, not representative scalability claims.

## Cleanup and preserved scope

Both recorded Editor PIDs are gone; the second session logged normal shutdown. Final CIM audit found zero explicitly project-associated Editor/build/host processes. Earlier forced termination targeted only a verified private-profile test host while no UBT was active. No uncertain process, user Editor, RPG content or sibling directory was terminated/deleted.

Fixture retained under its ignore rule for review/reproduction (~2.96 GB at measurement), with useful evidence copied into this run. No cleanup deletion, release packaging, installer overwrite, extension reinstall, engine migration, gameplay refactor, software installation, source-engine rebuild or Phase 3B work.
