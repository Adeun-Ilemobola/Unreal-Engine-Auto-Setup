# Unreal Engine Auto Setup — v0.3 capability report

## Release scope

Version 0.3.0 extends the existing implementation. The stable package name, publisher ID, and pre-existing command IDs remain unchanged for upgrades. The product name and output channel are Unreal Engine Auto Setup.

## Implemented capabilities

| Area | Implementation |
| --- | --- |
| Initialization | Trusted single-folder discovery, automatic/manual triggers, companion installation, version checks, missing-default merging, create-only formatter/provider files, preserved tasks, repeatability |
| Build state | Per-project target/platform/configuration in workspace state; legacy default Editor / Win64 / Development; Quick Pick commands and compact status display |
| Discovery | Immediate Source target files; known TargetType assignments and explicit Unknown classification; no C# execution |
| Build | Direct Build.bat invocation using current selection; save-all check; terminal output; failure gate; concurrent-operation guard |
| Editor | Separate open-only and build-and-open commands; standard project + -log launch; build-and-open requires an Editor target |
| Engine | Configured path first, numeric Epic manifest/registry lookup, candidate validation, picker fallback, protected workspace path persistence |
| Diagnose Project | Structured read-only findings, output-channel rendering, file/engine/extension/trust/selection checks |
| Latest log | Newest regular .log immediately under Saved/Logs opened in VS Code |
| Preservation | Existing project settings and explicit false values win; existing files/tasks remain authoritative; dirty-document/symlink protections retained |

## Commands

| User-facing command | Stable ID |
| --- | --- |
| Unreal: Set Up This Project | `unrealSetup.setup` |
| Unreal: Install Required Extensions | `unrealSetup.installExtensions` |
| Unreal: Build Project | `unrealSetup.build` |
| Unreal: Open Editor | `unrealSetup.openEditor` |
| Unreal: Build and Open Editor | `unrealSetup.buildAndRun` |
| Unreal: Select Target | `unrealSetup.selectTarget` |
| Unreal: Select Platform | `unrealSetup.selectPlatform` |
| Unreal: Select Configuration | `unrealSetup.selectConfiguration` |
| Unreal: Select Build Settings | `unrealSetup.selectBuild` |
| Unreal: Diagnose Project | `unrealSetup.diagnose` |
| Unreal: Open Latest Project Log | `unrealSetup.openLatestLog` |

Status bar: Build, Editor, and a clickable `Target | Win64 | Configuration` selection. Build and Open remains in the Command Palette to keep the bar compact.

## Files and state

| Location | Policy |
| --- | --- |
| `.vscode/settings.json` | Add missing defaults via Workspace settings API; engine detection only fills an absent engine path |
| `.vscode/c_cpp_properties.json` | Create if absent; Skybox provider configuration |
| `.vscode/tasks.json` | Append missing valid-selection tasks; retain previous tasks and default choices |
| `.clang-format` | Create if absent; existing content is never replaced |
| VS Code workspace state | Existing initialization marker plus `buildSelection:<absolute project path>` selection; no manual migration required |
| Saved/Logs | Read-only latest-log lookup |

The helper's build state does not change Skybox's IntelliSense state. Existing static build tasks do not follow later selection changes automatically. Setup can add a new selection's task without replacing an older one.

## Module responsibilities

- `extension.js`: lifecycle, setup, companion installation, generated settings/files/tasks, Skybox activation.
- `core.js`: unchanged default rules, merging, minimum-version and target-name helpers, exclusive file creation.
- `runner.js`: commands, status controls, PowerShell scripts and terminal lifecycle.
- `project.js`: root project reading, target discovery, selection persistence/validation and engine-settings write protection.
- `engine.js`: normalized paths, engine inspection, bounded Windows discovery, resolution and remembering absent settings.
- `diagnostics.js`: structured findings and output rendering, newest-log lookup and document opening.
- `package.json`: v0.3 metadata, commands and companion pack.
- `build_bundle.py`: packages runtime modules, README and this report into the VSIX; produces a source ZIP.

## Validation coverage

The original regression scenarios are retained and extended. Tests cover:

- Existing explicit false values, custom formatter/provider files and task/default preservation.
- Repeated setup and selected-configuration task generation.
- Restricted mode and missing companion extension installation.
- Workspace configuration scope, including the original files.associations failure.
- Default selection, persistence across contexts, per-project isolation, cancellation and missing targets.
- Multiple target types and ambiguous/unknown target classification.
- All five configuration values in generated build commands.
- Status bar selection changes used by the actual build command.
- Open Editor without Build.bat, save-all or compilation.
- Real PowerShell execution proving that failed builds prevent editor launch and successful builds pass the project path without -game.
- Epic manifest and version-specific registry candidates, automatic success, manual fallback/cancellation, invalid candidates and explicit-path preservation.
- Healthy/broken/malformed-project diagnostics without settings or workspace-state writes.
- Latest-log modification-time ordering, extension filtering and absent directories.

Tests use mocks/stubs rather than an installed Unreal build. Full real-project compilation, Editor behavior, and every Epic installer layout remain integration-validation limitations. Future UE releases may need compatibility updates.

## Deferred work

No repair actions, debugger, Problems parsing, Live Coding management, class generation, packaging/cooking, Insights, multiplayer launch orchestration, or log tailing are implemented. The diagnostic findings are separate from presentation so a later repair feature can consume them without mixing mutations into the current report.
