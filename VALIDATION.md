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
