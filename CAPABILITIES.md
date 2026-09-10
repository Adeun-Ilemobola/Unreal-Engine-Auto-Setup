# Unreal Engine Auto Setup — v0.6.5 capability report

Version **0.6.5** extends v0.6 without replacing its initialization flow, preserved configuration, engine resolution, target discovery, or Skybox/C/C++ integration. The stable ID remains `local-tools.unreal-project-tools`.

## Architecture

| Module | Responsibility |
| --- | --- |
| `extension.js` | Initialization, companion installation, preserved settings/files/tasks, Skybox activation, shared service wiring |
| `core.js` | Existing merge, defaults, minimum-version and exclusive file-creation helpers |
| `project.js` | Project/target discovery, persistent selection, validation, settings protection |
| `engine.js` | Engine inspection, bounded Windows discovery, manual fallback, path persistence |
| `runner.js` | Status bar and commands, operation coordination, duplicate-launch prevention |
| `build.js` | Authoritative build specification, Skybox argument adapter, PowerShell command construction, controlled process execution, terminal streaming, Problems and result tracking |
| `problemParser.js` | Pure MSVC/UHT/clang-style source-diagnostic parsing and Live Coding conflict recognition |
| `processes.js` | Windows CIM query, exact project-path association, PID/executable/command-line records, bounded query cache |
| `debugger.js` | Explicit process selection/revalidation and dynamic Microsoft `cppvsdbg` attachment |
| `runtime.js` | Session-scoped build result, launch guard and metadata revision/stale state |
| `generation.js` | Engine-local UBT discovery, generation specification, existing-configuration preservation, stale-state completion handling |
| `modules.js` | Independent bounded module discovery, layout inspection, API macros and module selection memory |
| `classTemplates.js` | Nine-type registry, names, exposure modes, include mapping, rendering and destination planning |
| `classFiles.js` | Preflight, exclusive writes and identity-aware best-effort rollback |
| `classWizard.js` | VS Code wizard/preview, generated-file opening and source navigation |
| `descriptors.js` | Strict JSON validation, duplicate-key rejection and minimal text insertion preserving unrelated descriptor bytes |
| `moduleTemplates.js` | Shared project/plugin module templates, naming, descriptor enums and blank plugin metadata |
| `creation.js` | Shared planning, collision preflight, exclusive file writes, descriptor replacement and ownership-aware rollback |
| `structureWizard.js` | New Module/New Plugin UI, preview, optional loading phase, stale state and plugin descriptor navigation |
| `runtimeWatcher.js` | Configurable serial state reconciliation, scoped filesystem watches, timestamp fallback and lifecycle disposal |
| `sidebar.js` | Native TreeDataProvider and grouped Unreal control center |
| `explorerClass.js` | Safe Explorer folder discovery and shared class-wizard destination mapping |
| `diagnostics.js` | Read-only Project Doctor findings and latest-log opening |

No npm runtime dependency was introduced. Controlled build execution replaces the earlier fire-and-forget build terminal. It retains full terminal output and adds a DiagnosticCollection. Skybox tasks remain intact and consume the shared selection/specification adapter; they are not silently redirected to a new task provider.

## Commands

| Command Palette title | ID |
| --- | --- |
| Unreal: Run | `unrealSetup.run` |
| Unreal: Refresh | `unrealSetup.refresh` |
| Unreal: Create Class Here | `unrealSetup.createClassHere` |
| Unreal: New Module | `unrealSetup.newModule` |
| Unreal: New Plugin | `unrealSetup.newPlugin` |
| Unreal: Open Plugin Descriptor | `unrealSetup.openPluginDescriptor` |
| Unreal: New C++ Class | `unrealSetup.newClass` |
| Unreal: Open Module Build.cs | `unrealSetup.openModuleRules` |
| Unreal: Open Project Descriptor | `unrealSetup.openProjectDescriptor` |
| Unreal: Open Target Rules | `unrealSetup.openTargetRules` |
| Unreal: Set Up This Project | `unrealSetup.setup` |
| Unreal: Install Required Extensions | `unrealSetup.installExtensions` |
| Unreal: Build Project | `unrealSetup.build` |
| Unreal: Open Editor | `unrealSetup.openEditor` |
| Unreal: Build and Open Editor | `unrealSetup.buildAndRun` |
| Unreal: Attach Debugger to Editor | `unrealSetup.attachDebugger` |
| Unreal: Select Target | `unrealSetup.selectTarget` |
| Unreal: Select Platform | `unrealSetup.selectPlatform` |
| Unreal: Select Configuration | `unrealSetup.selectConfiguration` |
| Unreal: Select Build Settings | `unrealSetup.selectBuild` |
| Unreal: Regenerate Project Files | `unrealSetup.regenerate` |
| Unreal: Diagnose Project | `unrealSetup.diagnose` |
| Unreal: Open Latest Project Log | `unrealSetup.openLatestLog` |

The status bar now contains only Build and Run. The Unreal sidebar hosts configuration, runtime state and tools. Existing internal command IDs are preserved.

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

## Runtime and debugging

Process association uses a full absolute `.uproject` argument, with Windows path normalization and case-insensitive comparison. It supports positional project arguments and `-project=...`, and never assumes all UnrealEditor.exe processes belong to the active project. Missing command lines, malformed responses, relative-only project arguments or CIM errors can produce Unknown.

Open Editor reports existing matching PIDs rather than starting another Editor. Build and Open checks again after a successful build. A short startup guard suppresses rapid repeated launches. Unknown process detection blocks automatic launch. Detection refreshes on relevant events and at the configured interval (30 seconds by default); close-together informational queries share a short cache.

Attach Debugger activates the available Microsoft C/C++ extension, selects one matching PID or presents a multiple-instance picker, rechecks the process, and calls VS Code's debugging API with a dynamic `cppvsdbg` attach configuration. No launch.json is written, and attachment is never automatic. Disappearing processes, missing C/C++, query failure and rejected debug sessions produce clear messages.

## Builds and Problems

The shared specification includes engine, project, target, platform, configuration, executable, arguments and working directory. Build selection remains project-specific in workspace state, defaulting to Editor / Win64 / Development. All five v0.3 configurations remain available subject to target/engine constraints.

Each extension-managed build streams stdout/stderr into a dedicated terminal. Supported diagnostics produce navigable file/line/column Problems with severity, message and compiler code when present. The collection clears the previous diagnostics for that project when another build begins. Arbitrary informational lines do not become Problems.

A session result records target, platform, configuration, start/completion time, status, success and exit code. The status bar summarizes it; Project Doctor includes the record. Failed Live Coding/open-Editor conflicts get a specific explanatory warning. Closing the terminal cancels the extension-owned process tree. Full Live Coding control is absent.

Preserved Skybox tasks and builds started elsewhere do not populate this extension's build-result record or DiagnosticCollection. The parser intentionally covers common source-location formats rather than all possible compiler/linker/Unreal output.

## Project generation and preservation

Generation invokes the active engine's UnrealBuildTool.exe with project-generation and VS Code format arguments. It validates the engine-local tool and shows output through the existing controlled execution service; no global UnrealVersionSelector is needed.

Before generation, existing project `.vscode` files, `.code-workspace` files, `.ignore`, `.clang-format`, project descriptor and existing engine `.vscode` configuration are captured. Changed protected contents are restored after the process on success or failure. Protected symlinks and unsaved project/configuration documents block the operation. Newly generated files can remain. No source editing or cleanup/deletion of Binaries, Intermediate or Saved is implemented. Restoration is not a transaction across host/machine crashes.

Changes to Build.cs, Target.cs, the active descriptor or plugin descriptors mark metadata stale. Unrelated C++ edits do not. The marker is session-scoped and non-intrusive. Successful regeneration clears it unless newer metadata edits occurred during generation. A failed regeneration leaves the marker unchanged.

Initialization retains create-only formatter/provider files, existing workspace values and explicit false settings, existing tasks and default task choices, repeatability, trust checks, and unsaved-document/symlink protections. Debug attachment does not create persistent configuration.

## Project Doctor

The read-only report includes:

- Project descriptors, selected project, Source directory and target.
- Engine path, version compatibility, Build.bat and UnrealEditor.exe.
- Companion extension availability, workspace trust and generated files.
- Editor Running/Stopped/Unknown, matching PIDs and executable paths.
- C/C++ availability, attach-target availability and the active VS Code debug session when present.
- Selected build values, latest extension build and metadata state.
- Engine-local UnrealBuildTool and regeneration availability.
- Discovered modules, project/plugin origin, Build.cs paths, Public/Private/flat layout and API macro.
- Project plugin descriptors, module counts and descriptor-based default enablement, plus structural creation availability.
- Module host types from project/plugin declarations.
- Selected/default module, class-generation availability and last class created in this session. Module discovery does not write selection state during diagnosis.

It does not install, write settings, regenerate, build or repair. Latest Project Log remains a separate read-only command selecting the newest regular .log in Saved/Logs.

## Validation

The v0.6.5 suite has **185 passing tests**: all 155 previous tests remain (the intentionally replaced third-status-item assertion was updated), with 30 new UX/runtime cases covering the sidebar, Build/Run behavior, operation locking, refresh scheduling/disposal, Explorer mapping, metadata reconciliation and contribution metadata. Mocked VS Code APIs and disposable filesystem fixtures verify UI and failure paths. Existing real PowerShell build/diagnostic tests also pass.

**Prior v0.6 UE 5.8.1 compilation validation succeeded.** A fresh disposable project generated a Runtime module in Public/Private layout, regenerated VS Code project files, compiled all nine v0.5 class types through Unreal's reflection/build pipeline, and linked the Editor target. A blank Runtime plugin in Flat layout was then generated and discovered without `.uproject` plugin enablement changes; the Editor target compiled and linked again. Target rules were created only in the disposable test fixture. No production project source was changed.

The v0.6 build exposed and fixed a v0.5 JavaScript inherited-constructor bug affecting constructor-free templates. The initial disposable harness also needed its matching primary-module header included first. Both problems were corrected before the successful rerun. The first sandboxed attempt was blocked at UBT log access; the authorized rerun used normal UBT logs/caches. See [VALIDATION.md](VALIDATION.md) for exact stages, toolchain, fixture and limitations.

## Release artifacts and limits

`unreal-project-tools-0.6.5.vsix` and `Unreal-Engine-Auto-Setup.zip` are produced by `build_bundle.py`. The VSIX contains every runtime module and both documentation files. Previous versioned VSIX artifacts are retained.

Windows/Win64, a trusted single local project folder, UE 5.8+, a supported toolchain and available C/C++ remain requirements. Future engine releases may require compatibility changes. Process matching cannot identify every inaccessible or relative-command-line launch. Native process races can still cause an attach failure, which VS Code reports. No native window-focus dependency, custom debugger, DLL-only UBT bootstrap, debugger launch presets, full log parser, repair system module/plugin deletion or renaming, engine plugin creation, automatic existing Build.cs/Target.cs edits, Blueprint asset creation, cooking/packaging/deployment, or v0.7 dependency features are included. Class naming does not scan all project/engine reflected names for collisions. Discovery conservatively recognizes conventional ModuleRules instead of evaluating C#; Blueprint-only projects need an existing module before class creation.

Live v0.6.5 VS Code validation opened the native Unreal view, executed Refresh and Open Project Descriptor, verified the six sidebar sections and scoped folder data, and checked the Windows shortcut. A real process query reported Editor Stopped. Running/duplicate/failure behavior was exercised with mocks and existing PowerShell tests; no Unreal Editor was launched or new Unreal compile performed for this UI patch. See [VALIDATION.md](VALIDATION.md).
