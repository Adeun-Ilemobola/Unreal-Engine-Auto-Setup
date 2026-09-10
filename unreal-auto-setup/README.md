# Unreal Engine Auto Setup

Initialize Unreal projects, create C++ classes, modules and project plugins, build with compiler Problems, monitor project Editors, attach the C++ debugger, and regenerate project files from VS Code.

**Release:** 0.6.5 · **Platform:** Windows / Win64 · **Unreal Engine:** 5.8+ · **VS Code:** 1.100.0+ · **License:** MIT

Future Unreal Engine releases may require compatibility updates. This is a locally packaged extension with experimental build/editor controls. Its stable extension ID remains `local-tools.unreal-project-tools` so earlier installations can upgrade normally.

## Install and get started

1. In the VS Code profile you use for Unreal, select **Extensions > ... > Install from VSIX...** and install `unreal-project-tools-0.6.5.vsix`.
2. Reload VS Code if prompted. Open the single folder directly containing your `.uproject` and trust the workspace.
3. Automatic initialization adds missing configuration. If prompted, choose an engine installation and complete Skybox's IntelliSense selection.
4. Use **Build** to compile the active selection or **Run** to get the project ready in Unreal Editor. Open the **Unreal** sidebar for configuration and tools.
5. Click **Play** inside Unreal Editor to test the project.

The extension runs in profiles where it is installed/enabled. It does not switch profiles automatically. Unreal Engine, Visual Studio C++ build tools, the Windows SDK, and engine prerequisites must be installed separately. Source engines need a working build environment and an editor executable before using Editor controls.

## Unreal controls in VS Code

The status bar contains exactly two permanent actions from this extension: **Build** and **Run**. Build compiles the persistent Target/Platform/Configuration selection using the existing managed pipeline, saves files first, retains terminal output, updates Problems and records its result. Its icon indicates activity or the last result; configuration details remain in the tooltip.

**Run** checks the active project's Editor first. If it is already running, Run reuses it without rebuilding or starting another process. If no matching Editor exists, Run builds an Editor target and launches only after success. If the current selection is a Game/Program target, Run selects the sole Editor target or asks among available Editor targets; Shipping/Test requires an explicit compatible configuration choice. Those choices are saved through the existing selection system. Without an Editor target, use Open Editor for a Blueprint-only project. Unknown process detection blocks launching to avoid duplicates. No automatic PIE/Play is triggered.

Build, Run, Build and Open Editor, and regeneration share one operation lock. A second request reveals the active build terminal where available and reports that work is already active. The advanced **Build and Open Editor** command still builds even when an Editor is already running, preserving existing behavior and Live Coding warnings.

Open **Unreal** in the Activity Bar for the native control center:

| Section | Contents |
| --- | --- |
| Project | Project name/path, detected engine version or unresolved association, recent module |
| Build Configuration | Clickable Target, Platform and Configuration selectors |
| Runtime | Editor state/PIDs, last build result, metadata freshness |
| Actions | Build, Run, Open Editor, Build and Open Editor, Attach Debugger, regeneration, Doctor and logs |
| Creation | Full New C++ Class, New Module and New Plugin wizards |
| Navigation | Project descriptor, module rules, target rules and plugin descriptor |

The view's Refresh icon updates state only. It never builds or regenerates. Advanced commands remain in the Command Palette, including Select Build Settings. The sidebar updates after operations, creation, configuration, structural metadata events, debug/focus events and periodic reconciliation. This native TreeView uses VS Code's existing UI, with no webview.

### Runtime refresh setting

`unrealSetup.runtimeRefreshInterval` defaults to **30 seconds**. Set **0** to disable periodic polling, or choose **10–3600 seconds** (for example 10, 30 or 60). Invalid values, including positive values below 10, fall back to 30. Fractional valid values are rounded down. Disabling polling retains manual and event-driven refresh.

The watcher reads lightweight process, descriptor, target/module/plugin and engine state. File timestamps reconcile missed structural events. It never invokes UBT, regenerates or compiles on a timer. Refreshes are serialized and event requests coalesced. Workspace/configuration changes reset timers and filesystem watches; disposal prevents late results from updating the view. A transient failure after a valid project retains fallback reconciliation. Polling also runs while the window is unfocused; focus events provide an immediate refresh.

**Automatic build-on-change is not implemented.** No autoBuild setting is advertised and no source save or timer starts a build. Project Doctor reports watcher configuration and this disabled-by-design behavior independently of the watcher.

### Explorer creation and keyboard access

Right-click a discovered module folder and choose **Unreal: Create Class Here**. The compact type list is UObject, Actor, Actor Component, Scene Component and Unreal Interface. It uses the full wizard's naming, exposure, preview, templates and safe file writer; the destination comes from the selected folder instead of a separate folder prompt.

A Public/Inventory or Private/Inventory selection maps to Public/Inventory for the header and Private/Inventory for the source. The module root maps to its default layout; flat modules retain colocated files. Only known safe module directories appear in the Explorer menu. Binaries, Intermediate, Saved, DerivedDataCache, symlinks and unrelated folders are rejected again at invocation. New folders may need the next event/poll or explicit sidebar Refresh before the menu appears. Module/plugin Explorer entries are deferred; use the sidebar for those operations.

The full **Unreal: New C++ Class** wizard remains available with all nine types. Its default Windows shortcut is **Ctrl+K, then Ctrl+Alt+N**, active in a trusted Unreal project. It was checked against the installed Windows default keybindings in a real VS Code host; users and other extensions can override it. Ctrl+Shift+T remains untouched.

## Required companion extensions

| Extension | Role |
| --- | --- |
| Microsoft C/C++ (`ms-vscode.cpptools`) | C++ language services and clang-format integration |
| Skybox Labs Unreal Engine Integrations (`skyboxlabs.unrealengine-tools`) | Unreal integration, IntelliSense configuration, and the generated UnrealBuildTool task provider |

Both are extension-pack members. VS Code installs them with the helper, and initialization checks for missing companions. **Unreal: Install Required Extensions** retries installation. Marketplace access is needed for missing extensions; enable extensions and reload when prompted. C# tooling, themes, and CMake are optional and are not bundled.

## Automatic and manual initialization

Initialization runs at startup, when workspace folders change, when trust is granted, and when a root `.uproject` is created. It selects the configured project, the sole project, or asks you to choose. It verifies the engine version and adds missing setup defaults.

Completed initialization is remembered per workspace/project. Repeat automatic initialization skips completed projects. **Unreal: Set Up This Project** manually adds missing defaults again. Set `unrealSetup.autoSetup` to `false` to keep initialization manual; build/editor commands remain available.

Setup creates a missing `.clang-format` and `.vscode/c_cpp_properties.json`, adds missing workspace settings, and appends a build task for the current valid selection. Setup never starts a build.

### Preservation guarantees

- Existing `.clang-format` and `c_cpp_properties.json` files remain unchanged.
- Existing workspace/folder values, including explicit `false`, take precedence; missing nested values are added.
- Existing tasks and an explicitly declared default build task are retained; equivalent tasks are not duplicated.
- Setup refuses its protected configuration paths when they are symbolic links or have unsaved documents.
- New engine-path writes also check `.vscode` and unsaved settings. Existing configured engine paths are not replaced automatically.
- Project files already created remain after disabling or uninstalling the extension.

Initialization is incremental, not transactional. A later failure may leave earlier additions in place; rerunning setup preserves those additions. Newly added workspace defaults can override inherited user/profile settings.

### Defaults added

File associations map `*.h` and `*.inl` to C++. C++ formatting uses Microsoft C/C++, clang-format's file style, format-on-save, and two-space indentation. Bracket-pair coloring and guides are enabled, with whitespace shown in selections.

Explorer and search hide Binaries, DerivedDataCache, Intermediate, Saved, and Content recursively. Explorer also hides `.idea`, `.vs`, Config, solution files, and `.vsconfig`. Source and Plugins stay visible under the supplied defaults. Exclusions do not delete files.

The generated formatter uses LLVM C++ style, same-line braces, two-space indentation/continuation, a 100-column limit, preserved include order, and type-aligned pointers. Existing or nested formatter files remain authoritative.

## Configuration selection

The Unreal sidebar shows the persistent Target, Platform and Configuration. Click a field to change it, or use:

- **Unreal: Select Target**
- **Unreal: Select Platform**
- **Unreal: Select Configuration**

Selections are stored in VS Code workspace state separately for each project and survive reloads. New and upgraded projects without saved selections default to their identifiable Editor target / Win64 / Development. Switching selections does not rewrite project settings or existing tasks.

Targets are discovered from immediate `Source/*.Target.cs` files. Game, Editor, Client, Server, Program, and unknown/ambiguous target types can be listed. Discovery reads text and does not execute or fully interpret C# rules. Unknown types are labeled; an ambiguous default requires an explicit choice. Removed targets remain visible as the saved selection until you select a replacement, and builds report the missing target.

Win64 is the only platform in v0.4. Configurations are Debug, DebugGame, Development, Shipping, and Test. Editor targets reject Shipping/Test with an actionable message. Other target/configuration availability is ultimately validated by UnrealBuildTool and the installed engine.

Skybox's IntelliSense configuration is separate from these build selections. Setup opens its selector; changes in this helper do not silently update Skybox's internal state.

## Build controls and Problems

**Build** / **Unreal: Build Project** saves open file-backed documents, validates the current project and selection, and invokes engine-local `Build.bat`. The shared build specification contains the engine, project, target, platform, configuration and arguments, including `-WaitMutex` and `-NoHotReloadFromIDE`.

The extension controls the build process and streams full stdout/stderr to a VS Code terminal. Common MSVC and UnrealHeaderTool source diagnostics also appear in **Problems**, including file, line, optional column, severity, code and message. Clicking a Problem navigates to its source. Informational lines and unsupported formats are ignored. Diagnostics from the previous extension build of that project are cleared when a new build begins; current warnings/errors remain after completion.

The status item shows build activity and the latest success/failure icon. Its tooltip shows the current selection and latest status; Project Doctor includes target, platform, configuration, start/completion times and exit code. Results are session-scoped; full logs are not stored in workspace state. Closing an active build terminal cancels its extension-owned process tree. Only one build/generation operation runs at a time in an extension instance.

Initialization still adds compatible Skybox `UnrealBuildTool` tasks from the same normalized selection. Existing tasks are preserved snapshots. They do not change with later selections and are executed by Skybox, so this release's diagnostic collection and latest-result tracking apply to the helper's **Build Project** and **Build and Open Editor** commands, not arbitrary external or Skybox builds. Rerun setup to add a task for a new valid selection.

## Editor runtime controls

| Command | Behavior |
| --- | --- |
| **Unreal: Open Editor** / **Editor** button | Opens the project without a build or save-all operation, after checking for an existing project Editor |
| **Unreal: Build Project** / **Build** button | Builds the selected target without opening an Editor |
| **Unreal: Build and Open Editor** | Requires a known Editor target; builds, then opens only on success and only if no matching Editor is already running |
| **Unreal: Attach Debugger to Editor** | Explicitly attaches Microsoft C/C++'s Windows debugger to a matching project Editor |

The status bar contains only Build and Run. Editor state, PIDs, selected configuration and metadata freshness live in the Unreal sidebar.

Windows process detection uses PowerShell/CIM and compares absolute `.uproject` arguments to the active project, case-insensitively. It records matching PIDs, executable paths and command lines when Windows exposes them. Unrelated Editor processes are not treated as the current project. Missing/inaccessible command lines or query failures can produce Unknown. Runtime refreshes occur on relevant commands, workspace/metadata/debug/focus events, plus the configurable runtime reconciliation timer. Closely spaced reads are cached for five seconds; launch/attach actions request fresh reads.

If an Editor already exists, Open Editor reports its PID rather than launching another. The helper also suppresses repeat launch requests during a short startup grace period. Unknown detection blocks automatic launch to avoid duplicates; use Diagnose Project to inspect the issue. It does not force-focus native windows, terminate existing Editors, or automatically attach a debugger.

Editor launch remains `UnrealEditor.exe <project.uproject> -log`; click Play inside Unreal Editor. The helper does not start standalone game mode. Open Editor works without a C++ target or Build.bat if a valid explicit engine with an Editor executable is configured. It does not choose configuration-specific Editor executables; Debug/DebugGame outputs may need additional Unreal launch configuration.

### Attach debugger

Start the project's Editor, then run **Unreal: Attach Debugger to Editor** or choose it from the Unreal sidebar. A single matching process is selected automatically; multiple matches produce a PID/executable picker. The helper rechecks the PID before attaching and reports missing processes, unavailable C/C++, failed queries or a rejected debug session.

Attachment supplies a dynamic `cppvsdbg` / `attach` configuration to VS Code with the chosen process ID. It does not create or modify `launch.json`. Debug symbols, native debugger permissions and Microsoft C/C++ availability remain requirements. Debugging never starts automatically.

### Live Coding awareness

If a failed external build reports a recognized Live Coding/open-Editor conflict, the terminal and a warning explain that the build was blocked and that the Editor/Live Coding state needs attention. The extension does not press Editor buttons, inject shortcuts, or control Live Coding.

## Regenerate project files

**Unreal: Regenerate Project Files** resolves the active engine's `UnrealBuildTool.exe`, normally under `Engine/Binaries/DotNET/UnrealBuildTool`, and validates it before execution. It invokes `-projectfiles -project=<active project> -game -progress -vscode` through the same visible process/terminal service used for builds. There is no dependency on a global UnrealVersionSelector. DLL-only UBT installations without an executable are not supported by this command yet.

UBT may create/update generated metadata. Existing `.vscode` files, root `.code-workspace` files, `.ignore`, `.clang-format`, the project descriptor, and existing engine `.vscode` files are captured and restored if changed, on success or failure. Unsaved project/configuration documents and protected symlinks block generation. Existing user configuration therefore remains authoritative, even if a regenerated provider file would otherwise contain newer values. This preservation step is not transactional across an extension-host or machine crash.

Changes to `.Build.cs`, `.Target.cs`, the active `.uproject`, and `.uplugin` files mark metadata as potentially stale. Ordinary `.cpp`/`.h` edits do not. The state is shown in the Unreal sidebar and Project Doctor without repeated save notifications. Regeneration is always manual. A successful generation clears stale state only if no additional metadata edits occurred during the operation; failures retain it. Stale state is session-scoped and means observed changes, not a complete freshness audit.

## Create an Unreal C++ class

Run **Unreal: New C++ Class** from the Command Palette or the Unreal sidebar. The wizard validates the project, selects an existing module, then asks for a class type, name, Blueprint exposure and optional logical subfolder. A confirmation shows the project, module, generated class names, API macro and both destination paths before anything is written.

| Type | Base class | Base include |
| --- | --- | --- |
| UObject | `UObject` | `UObject/Object.h` |
| Actor | `AActor` | `GameFramework/Actor.h` |
| Actor Component | `UActorComponent` | `Components/ActorComponent.h` |
| Scene Component | `USceneComponent` | `Components/SceneComponent.h` |
| Unreal Interface | `UInterface` and native I-class | `UObject/Interface.h` |
| Game Instance Subsystem | `UGameInstanceSubsystem` | `Subsystems/GameInstanceSubsystem.h` |
| World Subsystem | `UWorldSubsystem` | `Subsystems/WorldSubsystem.h` |
| Engine Subsystem | `UEngineSubsystem` | `Subsystems/EngineSubsystem.h` |
| Local Player Subsystem | `ULocalPlayerSubsystem` | `Subsystems/LocalPlayerSubsystem.h` |

### Modules, names and placement

Discovery scans project `Source` and existing project plugins, including nested module/category folders. It requires a matching `<Module>/<Module>.Build.cs` with recognizable ModuleRules inheritance and constructor; plugin modules must also be declared in a valid `.uplugin`. It skips symlinks, generated directories, external-only modules and malformed/unrecognized rules. It never executes C#. Unusual dynamic rules may not be recognized. A sole module is automatic; multiple modules produce a picker showing origin and location, with the most recently used module first.

The API macro comes from the selected module: module `Gameplay` produces `GAMEPLAY_API`, independently of the project and class name. Names accept ASCII C++ identifiers; invalid names, keywords, reserved identifiers, Windows device names and path characters are rejected for correction. `InventoryComponent` and `UInventoryComponent` both generate `UInventoryComponent` in `InventoryComponent.h/.cpp`. A matching prefix followed by an uppercase letter is treated as an explicit prefix; the preview makes ambiguous names visible. Interfaces generate both `UInteractable` and `IInteractable` in `Interactable.h/.cpp`.

For modules with both Public and Private directories, logical folder `Inventory` places the header under `Public/Inventory` and source under `Private/Inventory`. Flat modules keep both files together under the module and optional subfolder. A module with only Public or only Private keeps both files under that existing directory. The wizard does not introduce a new Public/Private layout. Source includes use the logical path relative to Public/Private; flat modules use the colocated header basename so they do not depend on legacy module-root include paths.

### Templates and exposure

Every template includes CoreMinimal, its base header, then its own `.generated.h` last. Actors and components get minimal constructors with ticking disabled; UObject and subsystems have no unnecessary constructors or overrides. Interfaces use the standard UINTERFACE wrapper and native I-class, each with GENERATED_BODY.

UObject, Actor and component templates offer Native only, Blueprint Type and Blueprintable. Interface and subsystem templates offer Native only and Blueprint Type. Native only adds no Blueprint exposure specifier; inherited base-class flags can remain. Blueprintable adds Blueprintable and BlueprintType. Exposed components also get BlueprintSpawnableComponent metadata. Interfaces remain implemented in C++ (`CannotImplementInterfaceInBlueprint`); Blueprint Type permits Blueprint type use, not Blueprint interface implementation.

### Creation safety and next actions

The wizard checks trust, workspace identity, module rules/layout, unsaved destination/rule/descriptor documents, path containment, symlinks and both destination collisions. It creates new files exclusively and never overwrites existing sources. A second-file failure triggers best-effort rollback of files and empty directories created by that operation. Files changed by another actor are retained and reported. This is not a crash-proof filesystem transaction or a global class-name collision check.

Build.cs and Target.cs are never edited. The preview advises about apparently missing Core/CoreUObject/Engine dependencies; this is a conservative text check, not C# dependency evaluation. Save needed rule changes yourself before compiling.

The header opens after creation. The success notification offers **Open Source Beside Header** or **Regenerate Project Files**. Regeneration is optional: creating source files alone does not mark Build.cs/Target.cs metadata stale. Existing stale state remains intact. Modules are discovered afresh on each command.

### Source navigation

- **Unreal: Open Module Build.cs** opens the sole module or asks which module.
- **Unreal: Open Project Descriptor** opens the active `.uproject`.
- **Unreal: Open Target Rules** opens the sole discovered target or asks which `.Target.cs` to open.

All four new commands are also available from the Unreal sidebar. No additional status-bar items are added.

## Create modules and project-local plugins

**Unreal: New Module** creates a new module under `Source/<Name>`. Enter a valid module name, choose its type and source layout, then review every file and the exact module declaration before confirming. **Unreal: New Plugin** creates a blank C++ plugin under `Plugins/<Name>` with a friendly name, optional description and one module. Its initial module name defaults to the plugin name and can be changed.

Both commands are available from the Command Palette and Unreal sidebar. **Unreal: Open Plugin Descriptor** opens the only project plugin or offers a picker. Existing Open Module Build.cs and New C++ Class commands immediately discover new project and plugin modules without a restart.

| Module type | Intended host |
| --- | --- |
| Runtime | Normal runtime module; default for ordinary names |
| RuntimeNoCommandlet | Runtime, excluding Editor commandlets |
| Developer | Legacy Editor/Program behavior; deprecated by UE 5.8 and labeled in the picker |
| Editor | Editor-only; default for names ending in Editor |
| EditorNoCommandlet | Editor-only, excluding commandlets |
| Program | Program targets only; creating it does not create a Program target |

A clear existing Flat or Public/Private convention determines the default layout; mixed or absent conventions default to Public/Private. Flat places Build.cs, header and source together. Public/Private places the module header in Public and source in Private. Both use a minimal exported IModuleInterface class and IMPLEMENT_MODULE. Build.cs uses explicit/shared PCHs with Core/CoreUObject/Engine dependencies, or only Core for Program modules. Editor-only dependencies are not added speculatively.

Loading phase normally stays **Default** with no extra prompt. The preview offers **Advanced Loading Phase** for PreDefault, PostDefault, PostEngineInit, PostConfigInit, PostSplashScreen, PreEarlyLoadingScreen, PreLoadingScreen, EarliestPossible or None. These values were verified in UE 5.8.1; low-level phases require the developer to understand when dependencies become available.

### Descriptor behavior

New project modules append Name, Type and LoadingPhase to the active `.uproject` Modules array. A strict JSON/token utility inserts only the new array entry or property, retaining unrelated text, field ordering, unknown values, existing modules, engine association and plugin declarations. Malformed JSON, duplicate object keys and invalid relevant arrays are rejected. The original descriptor bytes are retained for rollback; no permanent backup is created.

New plugin descriptors use FileVersion 3, Version 1, VersionName 1.0, the entered friendly name/description, Category Other, CanContainContent false, EnabledByDefault true and one Modules entry. CreatedBy is omitted. Project-local plugin discovery and default enablement were verified in the UE plugin manager and a real build. The wizard does not change the `.uproject` Plugins array and refuses an already-declared plugin name, including disabled declarations. Target/platform restrictions and manually configured project overrides can still affect plugin loading.

### Creation safety

Names must be safe C++/C# identifiers and API macros; keywords, reserved filenames, invalid paths and case-insensitive collisions are rejected. Existing discovered modules, plugin names, descriptor declarations and destination directories are checked. Trust, workspace identity, descriptor changes, unsaved documents, symlinks and descriptor hard links are checked before creation. All new files use exclusive writes. Existing arbitrary Build.cs and Target.cs files are never edited.

Creation tracks its own files and directories. A failure rolls them back only while their identities and contents still match; pre-existing files and concurrent user edits are preserved. Project descriptor changes use a flushed temporary sibling file and rename, with an original-content comparison before replacement. If a later failure occurs, restoration uses the same comparison strategy. Incomplete rollback identifies remaining files for inspection. This is best-effort transactional creation, not a crash-proof multi-file transaction or protection against every external filesystem race.

Successful structural creation marks metadata stale, remembers the module and opens its Build.cs. Regenerate Project Files is offered once and runs only when selected. Source-only class creation retains its different behavior: no false structural-stale marker. No generic dependency editing, module/plugin delete/rename/move, engine-wide plugin installation, specialized plugin templates or Marketplace tooling is included. A Blueprint-only project may still need target rules/toolchain setup to build; this wizard does not create or edit targets.

## Engine detection

An existing `unrealEngine.enginePath` is authoritative. If invalid, the helper reports the issue rather than replacing the user's value.

When no engine path is configured and the project has a numeric association, the helper checks matching entries in Epic's `LauncherInstalled.dat` under ProgramData and the version-specific `InstalledDirectory` Windows registry entry, in both registry views. It never crawls the disk. Automatic candidates must have a matching major/minor `Build.version`, Build.bat, and UnrealEditor.exe.

A successfully resolved path is normalized and remembered at workspace scope. Numeric setup may finish without an engine being found; a later build/open offers the folder picker. Custom/source/GUID associations use explicit configuration or manual folder selection, without guessing a matching build. For manual selection, required files depend on the operation. The installation root or its Engine subfolder is accepted.

The version check requires 5.8+ and matches numeric associations by major/minor. It does not prove that a manually chosen custom engine corresponds to a particular GUID or that every future engine version is compatible.

## Diagnostics and project logs

**Unreal: Diagnose Project** writes a read-only report to **Output > Unreal Engine Auto Setup**. It includes project/Source discovery, selected target/platform/configuration, engine version/files, companion extensions, trust, generated files, runtime state and matching PIDs/executables, debugger availability and active session, latest extension build, metadata stale state, UBT/regeneration availability, discovered modules with Build.cs/layout/API details, the selected/default module, class-generation availability, the last class created this session, module host types, project plugin descriptors/module counts/default enablement, and module/plugin creation availability. It can inspect engine/process information but does not save settings, install extensions, build, generate, or repair anything.

**Unreal: Open Latest Project Log** opens the newest regular `.log` directly under `Saved/Logs` by modification time, including backup logs. Missing logs produce a notification. It does not parse or tail logs.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Sidebar stale or new Explorer folder missing | Click Refresh in the Unreal sidebar; inspect runtimeRefreshInterval and Diagnose Project |
| Run reuses Editor without rebuilding | Use Build or Build and Open Editor explicitly when an external rebuild is intended |
| Shortcut unavailable | Open a trusted Unreal project and check user/extension keybinding overrides |
| Buttons absent | Reload VS Code and check the profile, workspace trust, and directly opened project folder |
| Engine unresolved | Run a build/open command to select the installation, or set `unrealEngine.enginePath` |
| Engine mismatch or missing files | Correct the configured path; use Diagnose Project to inspect it |
| Missing/ambiguous target | Run Select Target; custom C# expressions are not fully interpreted |
| Shipping/Test rejected for Editor | Select Development/DebugGame/Debug or use a non-Editor target |
| Companion installation fails | Check Marketplace access, retry Install Required Extensions, and enable/reload as prompted |
| Unsaved configuration | Save it before rerunning initialization or remembering an engine |
| Build or Live Coding conflict | Inspect terminal output; close the existing Unreal Editor and retry when Unreal requires it |
| IntelliSense incomplete | Use Skybox's Select Build Configuration command separately |
| Project log needed | Run Open Latest Project Log |
| Editor Unknown / launch skipped | Run Diagnose Project; check Windows process-query permissions and whether Editor command lines are readable |
| Attach fails | Confirm the project Editor is running and C/C++ is enabled; check Debug Console and native debugger permissions/symbols |
| Project Files May Need Refresh | Save configuration and run Regenerate Project Files; inspect its terminal if generation fails |
| No class modules found | Use New Module, or check existing ModuleRules names/constructors and plugin module declarations |
| New module/plugin name rejected | Choose a unique C++/C# identifier; existing directories and descriptor entries are never reused |
| Descriptor changed / rollback incomplete | Inspect the reported paths, save current changes and restart creation; do not blindly retry over leftover files |
| Plugin does not load | Inspect its module host type, target/platform restrictions and project overrides with Project Doctor |
| Class destination exists | Choose another name or folder; generation never replaces existing files |
| Class dependency advisory | Review the selected module’s Build.cs and add any genuinely missing dependencies yourself |
| No Problems appear | Confirm this was an extension-managed build and that output includes a supported source-file/line diagnostic |

## Current limitations

One local Windows project root only; no multi-root or virtual workspace support. The extension does not activate in Restricted Mode. Discovery does not execute C# or recursively inspect nested targets. Build controls need a C++ target; Blueprint-only projects can use Open Editor. Some configurations require source engines or additional engine components. Paths containing quotes, percent signs, exclamation marks, or certain control characters are rejected by terminal generation.

No module/plugin deletion or renaming, engine plugin creation, Blueprint asset creation, automatic Build.cs/Target.cs editing, additional class-template families, cooking/packaging/deployment, custom debugger backend, custom IntelliSense engine, Live Coding control, Insights, multiplayer orchestration, automatic repair, or real-time log tailing is included. Compiler parsing covers common source diagnostics, not every Unreal message. Process matching cannot reliably identify Editors launched with relative-only project arguments or hidden command lines.

## Development and capability report

See [CAPABILITIES.md](CAPABILITIES.md) for the implementation inventory, command IDs, state/files, and validation scope.

Run `node --test tests/*.test.js` from the extension source directory. From the repository root, run `python build_bundle.py` to produce `unreal-project-tools-0.6.5.vsix` and `Unreal-Engine-Auto-Setup.zip`. No npm runtime dependencies are used.

The v0.6.5 suite has **185 passing tests**: all 155 previous tests remain (the intentionally replaced third-status-item assertion was updated), with 30 new UX/runtime cases covering the sidebar, Build/Run behavior, operation locking, refresh scheduling/disposal, Explorer mapping, metadata reconciliation and contribution metadata. Mocked VS Code APIs and disposable filesystem fixtures verify UI and failure paths. Existing real PowerShell build/diagnostic tests also pass.

**Prior v0.6 UE 5.8.1 compilation validation succeeded.** A fresh disposable project generated a Runtime module in Public/Private layout, regenerated VS Code project files, compiled all nine v0.5 class types through Unreal's reflection/build pipeline, and linked the Editor target. A blank Runtime plugin in Flat layout was then generated and discovered without `.uproject` plugin enablement changes; the Editor target compiled and linked again. Target rules were created only in the disposable test fixture. No production project source was changed.

The v0.6 build exposed and fixed a v0.5 JavaScript inherited-constructor bug affecting constructor-free templates. The initial disposable harness also needed its matching primary-module header included first. Both problems were corrected before the successful rerun. The first sandboxed attempt was blocked at UBT log access; the authorized rerun used normal UBT logs/caches. See [VALIDATION.md](VALIDATION.md) for exact stages, toolchain, fixture and limitations.

Implementation references: [VS Code C++ attach configuration](https://code.visualstudio.com/docs/cpp/launch-json-reference), [Epic build configurations](https://dev.epicgames.com/documentation/unreal-engine/build-configurations-reference-for-unreal-engine), [Epic Windows engine registry discovery](https://github.com/EpicGames/tk-unreal/blob/master/startup.py).

Native UI implementation references: [Tree View API](https://code.visualstudio.com/api/extension-guides/tree-view), [when-clause contexts](https://code.visualstudio.com/api/references/when-clause-contexts).

Live v0.6.5 VS Code validation opened the native Unreal view, executed Refresh and Open Project Descriptor, verified the six sidebar sections and scoped folder data, and checked the Windows shortcut. A real process query reported Editor Stopped. Running/duplicate/failure behavior was exercised with mocks and existing PowerShell tests; no Unreal Editor was launched or new Unreal compile performed for this UI patch. See [VALIDATION.md](VALIDATION.md).
