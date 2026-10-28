# P1.1 remains OPEN

## Current behavior and acceptance

`generation.js:22` creates engine-local UBT arguments `-projectfiles -project=<absolute descriptor> -game -progress -vscode`. `generation.run` acquires a cooperative in-host guard, rejects dirty documents, captures bounded baseline/recovery copies, blocks unresolved prior transactions, invokes the supervised tool, observes post-state and reports Conflict/RecoveryFailed when ownership cannot be established. `restore` is a compatibility comparison-only export, not a restore operation. It does not replay snapshots over user edits.

Current focused execution of unchanged `tests/generation.test.js:10` fails at line 21: expected `{"existing":false}`, actual `overwritten by stub generator`. This is a real failed preservation assertion, not a TODO. Other focused tests passing does not close it. Real concurrent-save preservation was not retested in Phase 1A.

The safety improvement prevents the extension from restoring old bytes over later saves. It cannot prevent UBT itself overwriting earlier user settings. Copies and conflict warnings are recovery evidence, not successful automatic preservation. The observer expressly does not attribute a writer. In-host generationGuard excludes cooperating extension mutations only; it does not lock UBT, SkyBox, another host or external editors. Windows process supervision establishes execution ownership, not file-write authorization.

## Write map

| Path / scope | Present or possible writer / evidence | Conflict and future boundary |
|---|---|---|
| Project .vscode/settings.json | extension.setup via config.update; engine.remember; runtime settings commands | User/editor and companion settings share file. Preserve scope and JSONC; no engine-root config update. |
| Project .vscode/tasks.json | setup appends custom UnrealBuildTool task via config API | Separate from native workspace tasks; task ownership and selection duplicate. Prefer explicit native/owned task integration later. |
| Project .vscode/c_cpp_properties.json | setup creates only if absent; UBT writes full file | Direct competing ownership; one writer or separate supported input is needed. |
| Project .code-workspace | UBT writes workspace including settings/tasks/launch; users edit it | User workspace and generated metadata have conflicting lifetimes. Import read-only or deliberately separate owner; no snapshot replay. |
| Project .vscode/compileCommands_*.json and matching *.rsp directories | UBT generator | Metadata must track new translation units/targets. Do not hand-edit generated commands or promise build refreshes them. |
| Project .ignore | UBT generator writes it | Included in recovery capture; user changes may be overwritten by generator. |
| Project .clang-format | setup write-new; recovery captures it | No direct write found in inspected VSCode generator; do not label all protected files proven UBT outputs. |
| Project .uproject | module creation descriptor update; Editor | Protected by regeneration recovery, but inspected VSCode generator does not directly write it. Module creation check-then-rename remains a separate concurrency review item. |
| Project Source / Plugins source, .Build.cs, .uplugin | classFiles and creation write-new; dependencyEditor uses WorkspaceEdit | Project-owned edits only; UBT interprets rules, UHT generates reflection output. .Target.cs discovery/navigation is read-only in these production flows. |
| Project Intermediate / Binaries / Saved and plugin intermediates | UBT/UHT/Editor; SkyBox queries can cache under Intermediate/ProjectFiles/.vscode | Build/metadata output, distinct from authoring source; not exhaustively traced by generationRecovery. |
| Engine .vscode/c_cpp_properties.json, databases and response files | **UBT VSCode generator can write these for foreign projects when bIncludeEngineSource is true** | Violates desired no-engine-write boundary even if our JS only reads it. No installed-engine generation was run. |
| Engine source / .Build.cs / installed binaries | Reads for discovery/indexing; no intentional extension authoring path | Deny writes in future identity/write policy; package/compiler external side effects need actual trace. |
| Extension globalStorageUri/regeneration-v1 | recovery baseline/observed/document/filesystem/result artifacts | Keep bounded storage and explicit conflict review. Never automatic replay. |
| Extension globalStorageUri/operations-v1 | operationOwnership and native supervisor journals/logs/cancel/completion | Keep proof-based release; no arbitrary PID cleanup or claim deletion. |
| Host workspaceState | selection/configured/recent-module data | Must become identity-aware; not evidence of metadata freshness. |

## Installed UE source evidence (read-only)

File: `C:\Program Files\Epic Games\UE_5.8\Engine\Source\Programs\UnrealBuildTool\ProjectFiles\VisualStudioCode\VSCodeProjectFileGenerator.cs`.

- WritePrimaryProjectFile lines 268–306: creates project .vscode, calls ignore/properties/workspace writers; conditional second WriteCppPropertiesFile uses Unreal.RootDirectory/.vscode.
- WriteCppPropertiesFile lines 621–695: writes c_cpp_properties.json and target/default configuration data.
- WriteConfiguration around line 762: compileCommands_<project>.json; response writer lines 879–886 creates per-module *.rsp.
- Line 1678: .ignore write; line 1811: workspace write. Nested task/launch sections are generated before that write.

This establishes concrete generator write paths and a conditional engine-write hazard, not an exhaustive filesystem trace of UBT, SDK discovery, logging or compilation. The extension passes no independently verified output-isolation switch. Phase 1A does not invent one or execute generation to test it on installed UE.

## Trigger map and failure modes

Manual regenerate invokes generation directly. New class offers optional regenerate without marking a plain source pair structurally stale. Module/plugin creation marks structure stale and offers regeneration. `runner.js` also regenerates stale structure before Build-and-Open / Run, and in opted-in autoBuildAndRegenerate; manual Build has different behavior. Watch mode observes but does not itself build. SkyBox's target Query path is independent and bypasses our admission/recovery guard.

Dirty preflight cannot prevent a save after launch. External writes may occur before notification delivery; event silence does not prove no race. A failed/cancelled UBT operation can already have overwritten files. New files and changed identities also create conflicts; bounded storage may refuse a large engine config set. Recovery finalization failure returns failure, not success. No “settings restored” success should be inferred from process exit zero.

## Future options, not implementation

1. Minimal user/extension-owned workspace with UBT build invocation, and separately owned metadata: preferred investigation because it avoids competing writers, but metadata completeness needs proof.
2. Native generated workspace treated as generated, with user settings elsewhere: simpler ownership but regeneration is explicit and engine-output risks remain.
3. Supported cpptools provider over authoritative UBT data: could avoid database edits, but has target/query freshness, concurrency and maintenance costs; compare SkyBox behavior first.
4. Isolated generation/import: only if actual UE help/source proves a destination mechanism and no hidden engine writes. Snapshot restoration and hash-based writer guesses are rejected.

Closure requires real normal/failure/cancel/concurrent-save file-preservation evidence, explicit engine-write prevention and accurate readiness state. Keep current failing acceptance until a stronger replacement is demonstrated. This phase makes no preservation fix.
