# v0.7.0 dependency validation

## Automated tests

239 tests pass: all 185 prior tests and 54 dependency cases. The expanded sidebar and menu expectations are intentional; the old setup mock now models all filesystem watcher events. New suites are `tests/dependencies.test.js` and `tests/dependencyUI.test.js`.

Coverage includes literal Add/AddRange/collection expressions; LF/CRLF and tabs/spaces; comments and false matches; malformed delimiters; conditional/helper/variable/computed/loop/alias refusals; duplicates and self-dependencies; add/remove/move/empty-list edits; unsaved documents and linked paths; rejected WorkspaceEdit preserving the original; native diff Apply/Cancel; explicit downgrade with exposed-header evidence; graph cycles and relationship warnings; project/plugin exact header keys and ambiguity; session cache reuse/invalidation; no engine scan on project refresh; informational diagnostics; recommended Public/Private Quick Fixes; and generated-module/class integration.

## Real UE 5.8.1 source/index checks

A full async engine scan indexed **69,932 headers** in approximately **9.98 seconds** on this machine. A second request returned Ready (cached). Representative exact ownership checks:

| Include | Owner |
| --- | --- |
| CoreMinimal.h | Core |
| UObject/Object.h | CoreUObject |
| Components/ActorComponent.h | Engine |
| Widgets/SWidget.h | SlateCore |
| Widgets/SCompoundWidget.h | SlateCore |
| Widgets/Input/SButton.h | Slate |
| Components/Widget.h | UMG |

Core.Build.cs uses AddRange collection expressions (`[...]`); the focused parser supports this literal form, while the complete complex Core rules remain a read-only engine candidate. Existing engine module/plugin boundaries were read only. No engine source files were edited.

## Real dependency edits and UBT/UHT compilation

Fresh disposable fixture: `%TEMP%/UnrealAutoSetup-v06-B5ZdmO/AutoSetupValidation.uproject` (the existing harness retains its v06 folder prefix).

The shared v0.7 mutation engine added **Projects as Private** and **SlateCore as Public** to the newly created ValidationRuntime.Build.cs. Its module source included Interfaces/IPluginManager.h and Widgets/SWidget.h. These changes were written only into the fresh fixture by the opt-in harness; the shipping command uses WorkspaceEdit and leaves the editor dirty.

| Stage | Result |
| --- | --- |
| VS Code project-file generation | Exit 0, 5.62 seconds |
| Editor Development Win64 compile/link with modified Build.cs and nine class templates | Exit 0, 40.02 seconds |
| Second Editor build after adding the blank plugin | Exit 0, 9.38 seconds |

Toolchain: UE 5.8.1, Visual Studio MSVC 14.50.35717 installation / toolchain 14.50.35737, Windows SDK 10.0.22621.0. Reflection-generated source and all nine class source files compiled. No production project was modified, and no compile failure occurred in this v0.7 run. Logs and validation-results.json remain in the fixture.

Repeat with a fresh disposable fixture: `node tests/real-unreal-validation.js "C:/Program Files/Epic Games/UE_5.8" dependencies`.

## Real VS Code integration

`tests/vscode-dependency-smoke.js` ran in an isolated Windows Extension Development Host using `%TEMP%/UnrealUXSmoke-05da420b3f3e407cbc2719b155ea56b1`.

- Activated the seven-section native Unreal sidebar and refreshed the real engine index.
- Applied a real Build.cs WorkspaceEdit, verified dirty editor contents, then executed VS Code Undo and verified the original text was restored.
- Opened a Public header with an Engine include absent from the source module's direct dependency list.
- Observed one **Unreal Dependencies** informational diagnostic and both Public and Private Quick Fix registrations via VS Code's Code Action API.
- `vscode-dependency-result.json` records success, engine header count, Undo, advisory message and Quick Fix labels.

Diff confirmation/Quick Fix mutation is covered by shared-engine mocked UI tests; the live host did not automate clicking Apply on a modal. A Windows directory junction is used for linked-path refusal tests because unprivileged file-symlink creation is unavailable in the default test environment.

## Deliberate limitations

Only recognized conventional constructors are editable. Conditional/complex files remain inspectable but read-only. No persistent cache is written, so there is no corrupt disk-cache load path; restart discards the session cache. Exact include matching does not implement C++ preprocessing, arbitrary include search paths, or complete transitive dependency semantics. Informational direct-declaration advisories are not compiler errors. Graph warnings/cycles cover known project/plugin edges, not all engine internals. Cross-plugin descriptors are not rewritten. No automatic builds, source-reference deletion, engine edits, cooking or packaging of Unreal projects are implemented.

The following sections retain prior-release evidence and their original test counts.

---

# v0.6.5 UX/runtime validation

185 unit/integration tests pass. All 155 v0.6 tests remain; only the assertion for the removed third status item was updated to verify the Build tooltip instead. Thirty new cases cover interval validation, serialization/coalescing, reset/disposal/error recovery, native sidebar sections/commands, Run success/failure/reuse, Build/Run/regeneration locking, scoped Explorer folders, Public/Private and flat mapping, cancellation/collision behavior, keybinding/menu metadata and structural reconciliation.

## Real VS Code extension-host checks

An isolated Windows VS Code Extension Development Host, with a new temporary project and separate user data/extensions directories, successfully:

- Loaded v0.6.5 and activated its commands and native TreeView.
- Opened the Unreal sidebar and executed Refresh.
- Opened the active project descriptor through the navigation command.
- Retrieved all six sidebar sections and discovered Public folder context data.
- Queried real Unreal process state: Stopped.
- Opened the installed default keybindings document and verified Ctrl+K, Ctrl+Alt+N has no other default command binding. Earlier candidates Ctrl+K, Ctrl+Shift+N and Ctrl+K, Ctrl+Alt+C conflicted with notifications/comment commands and were rejected before release.

Fixture: `%TEMP%/UnrealUXSmoke-05da420b3f3e407cbc2719b155ea56b1`. The default-keybindings document and `vscode-smoke-result.json` retain the results. The opt-in harness is `tests/vscode-smoke.js`, intended for VS Code's `--extensionTestsPath`, not the normal Node test runner. The initial sandboxed renderer failed to launch; authorized desktop execution completed successfully.

These are automated live extension-host interactions, not a manual visual inspection or simulated keyboard keypress. Explorer UI visibility is validated by its contribution predicate and live scoped-folder data, with complete destination creation tested in mocked VS Code fixtures. No real Unreal Editor launch, PIE session, or new UHT/UBT compile was performed for this UX patch. Running/reuse/build-failure behavior uses process fixtures and existing PowerShell build tests. The previous real v0.6 compile evidence is retained below.

Auto-build and module/plugin Explorer menus remain deferred. Runtime polling is lightweight state reconciliation only. Future/default keybindings or third-party extensions may introduce a conflict; users can customize the chord.

---

# v0.6.0 validation report

## Automated tests

155 tests pass: all 91 v0.5 regressions and 64 new tests. Coverage includes C++/C# names and API macros; all six module types; loading phases/layouts; strict descriptor validation and preservation; project/plugin collisions; preflight, failed writes, descriptor restoration and preservation of concurrent edits; wizard cancellation, previews, stale state, class discovery and source navigation. VS Code UI is mocked. Filesystem tests use disposable temporary folders. Existing real PowerShell process/diagnostic tests remain passing.

Added test files: `tests/structure.test.js`, `tests/structureWizard.test.js`. The inherited-constructor regression is added to `tests/classTemplates.test.js`. `tests/real-unreal-validation.js` is an explicit opt-in integration harness, excluded from the normal `*.test.js` suite.

## Installed engine source verification

UE 5.8.1 under `C:/Program Files/Epic Games/UE_5.8`:

- `Engine/Source/Runtime/Projects/Public/ModuleDescriptor.h`: six supported EHostType values and ten ELoadingPhase values. Developer is explicitly deprecated and labeled accordingly in the UI.
- `Engine/Source/Runtime/Projects/Private/PluginDescriptor.cpp`: latest plugin FileVersion is 3 and EnabledByDefault parsing.
- `Engine/Source/Runtime/Projects/Private/PluginManager.cpp`: project-local plugins participate in default discovery/enablement.
- `Engine/Plugins/Editor/PluginBrowser/Templates/Blank/Source/PLUGIN_NAME`: ModuleRules conventions, module include and IMPLEMENT_MODULE pattern.
- All nine class-template base headers were verified during v0.5; v0.6 additionally compiles all nine types.

## Real disposable-project build

Successful fixture: `%TEMP%/UnrealAutoSetup-v06-qa3EGm/AutoSetupValidation.uproject`.

| Stage | Result |
| --- | --- |
| Create Runtime project module, Public/Private layout | Success through extension creation transaction |
| Create all nine class types in that module | Success through existing class planner/writer |
| UBT VS Code project generation | Exit 0 |
| UHT/reflection output and Editor Development Win64 compile/link | Exit 0, 37.21 seconds |
| Create blank Runtime plugin, Flat layout | Success, no project Plugins-array edit |
| Editor compile/link with discovered plugin | Exit 0, 9.17 seconds |

The fixture's target rules list only its original primary module in ExtraModuleNames. The added Runtime module compiled from its project descriptor declaration without editing existing target rules. Generated reflection compilation (`Module.ValidationRuntime.gen.cpp`) and per-class compilation succeeded for UObject, Actor, ActorComponent, SceneComponent, Unreal Interface, GameInstanceSubsystem, WorldSubsystem, EngineSubsystem and LocalPlayerSubsystem. UObject/Actor/components used Blueprintable exposure; interface/subsystems used Blueprint Type.

Toolchain: Visual Studio 14.50.35737 (MSVC 14.50.35717 installation), Windows SDK 10.0.22621.0, installed UE 5.8.1. The fixture uses BuildSettingsVersion.V7 and Unreal5_8 include order. Logs and `validation-results.json` remain inside the disposable fixture; the user’s production project source was not modified.

## Failures found and resolved

1. The first sandboxed UBT invocation was denied access to its normal local trace backup. Authorized execution with standard UBT log/cache access resolved the environment restriction.
2. Real compilation found v0.5 templates without their own constructor inherited JavaScript Object.prototype.constructor. They emitted `function Object() { [native code] }` into C++, causing C2065/C2146 and related errors. Registry defaults now explicitly set constructor to undefined, and a regression asserts exact constructor-free source output.
3. The initial hand-written disposable primary-module source omitted its matching header first, triggering Unreal's include-order check. The harness was corrected. This was not a generated v0.6 module-template defect.

A fresh complete rerun passed all three UBT stages. No outstanding compilation error remains in the tested configurations.

## Scope and limits

No Unreal Editor launch, in-Editor Play test, packaging or cooked build was performed. Runtime modules/plugins were compiled; the other five host types are template/source-validated, not all independently compiled in their target environments. Not every Blueprint exposure/layout/type combination was compiled. Future UE releases are not guaranteed. No engine-wide plugin modification, generic dependency editing, or module/plugin delete/rename/move feature is implemented.

To repeat with a new temporary project: `node tests/real-unreal-validation.js "C:/Program Files/Epic Games/UE_5.8"`. It deliberately retains the disposable project and logs for inspection; it requires access to normal Unreal build caches/logs.
