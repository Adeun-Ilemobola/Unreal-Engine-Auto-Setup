# Unreal Engine Auto Setup — v0.8.0 capability report

Version **0.8.0** extends v0.7.0 without replacing its initialization flow, preserved configuration, engine resolution, target discovery, or Skybox/C/C++ integration. The stable ID remains `local-tools.unreal-project-tools`.


## v0.8 runtime automation

Automation is opt-in. Existing and new projects default to **Watch**.

| Mode (`unrealSetup.automationMode`) | Behavior |
| --- | --- |
| `off` | No automatic operations; manual controls and change state remain available. |
| `watch` | Track saved source and structure; never automatically compile or regenerate. Default. |
| `autoBuild` | Debounce saved source changes, then build. Stale structure blocks automatic compilation until regeneration. |
| `autoBuildAndRegenerate` | Debounce changes, regenerate stale structure, then build only after regeneration succeeds. |

`unrealSetup.autoBuildDelay` defaults to **30 seconds**, range **5–300**. Each relevant saved change restarts the delay. `unrealSetup.runtimeRefreshInterval` remains **30 seconds**, with **0** disabling periodic reconciliation and **10–3600** supported. A timer checks state; an unchanged project never compiles because an interval elapsed. Filesystem events still work at interval 0. Changes to these settings take effect immediately.

Only discovered local project/plugin module `.cpp`, `.h`, `.inl` and `.ipp` files count as source. Headers/inlines are conservative UHT-sensitive changes, not proof of a reflected-layout edit. Build.cs, Target.cs and project/plugin descriptors track structure separately. Generated output, logs, engine source, symlinks and unrelated workspace files are excluded. Reconciliation compares local file timestamps/sizes and directory entries, without hashing source or indexing the engine. Initial discovery establishes a clean baseline; offline changes before activation cannot be reconstructed.

The native **Runtime** group shows automation mode, dirty files under an expandable node, metadata state, blocked reason and an event-updated countdown. **Automation** provides mode, interval and delay controls, pending/active cancellation and the last ten operations. **Build** and **Run** remain the only permanent status-bar controls.

`runtimeCoordinator.js` owns the operation gate, debounce, revision snapshots, failure suppression and bounded session history. `dirtyTracker.js` classifies and reconciles files. The existing build service executes both manual and automatic work with the same Problems diagnostics. No wizard or dependency action starts a separate automation pipeline. Dependency edits remain unsaved native edits; save them before automation can proceed. Local dependency models and graphs continue refreshing independently.

Manual Build and Run consume pending debounce. Changes newer than an operation's snapshot remain pending for one follow-up. Concurrent operations reveal the active terminal rather than overlap. Run regenerates stale metadata before its Editor build and launches only after success. A clean matching Editor is reused; pending changes with an open Editor require closing it first. Manual regeneration satisfies the covered metadata revision, while retaining a build requirement for those structural changes. Workspace changes discard pending work; an already-running process stays associated with its original project until completion.

**Cancel Pending Automatic Build** keeps dirty files and suppresses scheduling until another relevant change, explicit mode/delay change or manual retry. It never kills active work. **Cancel Build** cancels only the extension-owned wrapper process tree and reports Cancelled. Failed builds preserve dirty state and wait for a new relevant change or manual retry. Failed regeneration waits for a structural change or deliberate retry; ordinary cpp saves do not create regeneration retry loops. Automatic work never saves unsaved buffers. A blocked unsaved-source build resumes after a relevant save/change or manual retry.

Completed terminals are replaced to limit clutter. Complete streamed output across operations remains in **Output → Unreal Build History**. Automatic success uses state/output rather than success popups. Failures and safety blocks explain the required action. **Diagnose Project** includes mode, delay, reconciliation interval, dirty counts, pending/blocked state, trigger reason, last automatic operation, build strategy and Live Coding capability. `unrealSetup.verboseRuntimeLogging` defaults to false; enable it for reconciliation details. Normal logs record meaningful changes and scheduling only.

### Live Coding limits and troubleshooting

UE 5.8.1's installed `ILiveCodingModule.h` exposes in-process Compile calls. `LiveCodingModule.cpp` registers in-Editor `LiveCoding.Compile`/`LiveCoding.CompileSync` commands. UBT's `HotReload.cs` checks an executable-derived `Global\LiveCoding_…` mutex and rejects conflicting external builds. These are not a validated project-addressable external compile endpoint.

v0.8 implements **awareness only**, with no `preferLiveCoding` setting and no external trigger. A read-only mutex probe can report Available, Unavailable or Unknown; the mutex is engine-executable scoped, not proof of a project's current settings. No mutex does not establish loaded-module rebuild safety. The shared strategy uses external UBT only when the matching project Editor is stopped. Running/Unknown states block Build, dirty Run and Auto Build with an explanation. Close Editor and retry, or use Live Coding inside Editor yourself. No synthetic keys, mouse input, UI automation or undocumented trigger protocol is used.

Header and structural changes are handled conservatively; the extension does not parse C++ reflection layouts. It does not build engine source as an automation workflow. Unsupported multi-root projects remain unsupported. A timestamp change can conservatively schedule work even when content is unchanged. Dirty state and history are session-local, and compilation coverage is the selected project target, not every possible configuration.


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
| `buildCsParser.js` | Focused C# tokenizer, dependency locations and whole-file edit-safety classification |
| `dependencyEditor.js` | Minimal text mutation, file preflight and undoable WorkspaceEdit |
| `dependencyModel.js` | Visibility recommendations, requirements, relationships and local graph/cycles |
| `dependencyIndex.js` | Async module/header indexing and engine identity cache |
| `dependencyDiagnostics.js` | Open-document direct-dependency advisories and shared-engine Quick Fixes |
| `dependencyActions.js` | Context selection, native diff confirmation, commands and cached project integration |
| `diagnostics.js` | Read-only Project Doctor findings and latest-log opening |

No npm runtime dependency was introduced. Controlled build execution replaces the earlier fire-and-forget build terminal. It retains full terminal output and adds a DiagnosticCollection. Skybox tasks remain intact and consume the shared selection/specification adapter; they are not silently redirected to a new task provider.

## Commands

| Command Palette title | ID |
| --- | --- |
| Unreal: Inspect Module Dependencies | `unrealSetup.inspectDependencies` |
| Unreal: Add Module Dependency | `unrealSetup.addDependency` |
| Unreal: Remove Module Dependency | `unrealSetup.removeDependency` |
| Unreal: Change Dependency Visibility | `unrealSetup.changeDependencyVisibility` |
| Unreal: Find Module for Include | `unrealSetup.findModuleForInclude` |
| Unreal: Refresh Dependency Index | `unrealSetup.refreshDependencyIndex` |
| Unreal: Manage Module Dependencies | `unrealSetup.manageDependencies` |
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

Class creation does not edit Build.cs or Target.cs. Its preview uses the shared dependency parser to report required modules as Present, Missing or Unknown. Manage Dependencies is an explicit follow-up using the same preview-and-confirm editing workflow.

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

Names must be safe C++/C# identifiers and API macros; keywords, reserved filenames, invalid paths and case-insensitive collisions are rejected. Existing discovered modules, plugin names, descriptor declarations and destination directories are checked. Trust, workspace identity, descriptor changes, unsaved documents, symlinks and descriptor hard links are checked before creation. All new files use exclusive writes. Module/plugin creation does not edit other existing Build.cs or Target.cs files. Dependency management is a separate explicitly confirmed operation.

Creation tracks its own files and directories. A failure rolls them back only while their identities and contents still match; pre-existing files and concurrent user edits are preserved. Project descriptor changes use a flushed temporary sibling file and rename, with an original-content comparison before replacement. If a later failure occurs, restoration uses the same comparison strategy. Incomplete rollback identifies remaining files for inspection. This is best-effort transactional creation, not a crash-proof multi-file transaction or protection against every external filesystem race.

Successful structural creation marks metadata stale, remembers the module and opens its Build.cs. Regenerate Project Files is offered once and runs only when selected. Source-only class creation retains its different behavior: no false structural-stale marker. Module/plugin creation does not alter other modules’ dependencies. No module/plugin delete/rename/move, engine-wide plugin installation, specialized plugin templates or Marketplace tooling is included. A Blueprint-only project may still need target rules/toolchain setup to build; this wizard does not create or edit targets.

## Unreal controls in VS Code

The status bar contains exactly two permanent actions from this extension: **Build** and **Run**. Build compiles the persistent Target/Platform/Configuration selection using the existing managed pipeline, saves files first, retains terminal output, updates Problems and records its result. Its icon indicates activity or the last result; configuration details remain in the tooltip.

**Run** checks the active project's Editor first. If it is already running and no changes are pending, Run reuses it. Pending changes require a safe build strategy before reuse. If no matching Editor exists, Run builds an Editor target and launches only after success. If the current selection is a Game/Program target, Run selects the sole Editor target or asks among available Editor targets; Shipping/Test requires an explicit compatible configuration choice. Those choices are saved through the existing selection system. Without an Editor target, use Open Editor for a Blueprint-only project. Unknown process detection blocks launching to avoid duplicates. No automatic PIE/Play is triggered.

Build, Run, Build and Open Editor, and regeneration share one operation lock. A second request reveals the active build terminal where available and reports that work is already active. Build, dirty Run and Build and Open Editor require the matching Editor to be stopped before external compilation.

Open **Unreal** in the Activity Bar for the native control center:

| Section | Contents |
| --- | --- |
| Project | Project name/path, detected engine version or unresolved association, recent module |
| Build Configuration | Clickable Target, Platform and Configuration selectors |
| Runtime | Editor state/PIDs, last build result, metadata freshness |
| Actions | Build, Run, Open Editor, Build and Open Editor, Attach Debugger, regeneration, Doctor and logs |
| Creation | Full New C++ Class, New Module and New Plugin wizards |
| Navigation | Project descriptor, module rules, target rules and plugin descriptor |

The view's Refresh icon reconciles state; any newly discovered saved changes follow the configured automation mode and debounce. Advanced commands remain in the Command Palette, including Select Build Settings. The sidebar updates after operations, creation, configuration, structural metadata events, debug/focus events and periodic reconciliation. This native TreeView uses VS Code's existing UI, with no webview.

### Runtime refresh setting

`unrealSetup.runtimeRefreshInterval` defaults to **30 seconds**. Set **0** to disable periodic polling, or choose **10–3600 seconds** (for example 10, 30 or 60). Invalid values, including positive values below 10, fall back to 30. Fractional valid values are rounded down. Disabling polling retains manual and event-driven refresh.

The watcher reads lightweight process, descriptor, target/module/plugin and engine state. File timestamps reconcile missed structural events. It never invokes UBT, regenerates or compiles on a timer. Refreshes are serialized and event requests coalesced. Workspace/configuration changes reset timers and filesystem watches; disposal prevents late results from updating the view. A transient failure after a valid project retains fallback reconciliation. Polling also runs while the window is unfocused; focus events provide an immediate refresh.

**Automatic build-on-change is not implemented.** No autoBuild setting is advertised and no source save or timer starts a build. Project Doctor reports watcher configuration and this disabled-by-design behavior independently of the watcher.

### Explorer creation and keyboard access

Right-click a discovered module folder and choose **Unreal: Create Class Here**. The compact type list is UObject, Actor, Actor Component, Scene Component and Unreal Interface. It uses the full wizard's naming, exposure, preview, templates and safe file writer; the destination comes from the selected folder instead of a separate folder prompt.

A Public/Inventory or Private/Inventory selection maps to Public/Inventory for the header and Private/Inventory for the source. The module root maps to its default layout; flat modules retain colocated files. Only known safe module directories appear in the Explorer menu. Binaries, Intermediate, Saved, DerivedDataCache, symlinks and unrelated folders are rejected again at invocation. New folders may need the next event/poll or explicit sidebar Refresh before the menu appears. Module/plugin Explorer entries are deferred; use the sidebar for those operations.

The full **Unreal: New C++ Class** wizard remains available with all nine types. Its default Windows shortcut is **Ctrl+K, then Ctrl+Alt+N**, active in a trusted Unreal project. It was checked against the installed Windows default keybindings in a real VS Code host; users and other extensions can override it. Ctrl+Shift+T remains untouched.

## Module dependency tools

v0.7 adds **safely editable recognized Build.cs dependency patterns**. The status bar remains Build / Run. The Unreal sidebar adds a collapsed **Dependencies** section for the selected/default module, with Public/Private lists, edit support, index status, relationship warnings and management actions.

| Command | Purpose |
| --- | --- |
| Unreal: Inspect Module Dependencies | Show categories, source lines and edit support |
| Unreal: Add Module Dependency | Choose a discovered module, choose visibility, preview and confirm |
| Unreal: Remove Module Dependency | Remove an unambiguous literal declaration after a source-usage warning |
| Unreal: Change Dependency Visibility | Explicit Public/Private move, with downgrade warnings |
| Unreal: Find Module for Include | Resolve the active include and offer an appropriate dependency action |
| Unreal: Refresh Dependency Index | Explicitly rebuild project and engine header ownership data |
| Unreal: Manage Module Dependencies | Compact management picker, also available on discovered Build.cs files in Explorer |

A source file or recognized Build.cs reliably identifies its containing project/plugin module. Global operations otherwise use the existing module picker. Engine modules are search candidates, never write targets. Project/plugin candidates remain usable before optional engine indexing; choose **Index engine modules...** in the Add picker or Refresh Dependency Index to load engine candidates.

### Recognized syntax and refusal behavior

The tokenizer skips comments and strings, records token offsets, checks delimiter balance and recognizes the conventional `class Name : ModuleRules` and its `public Name(ReadOnlyTargetRules Target) : base(Target)` constructor. Supported literal declarations include:

```csharp
PublicDependencyModuleNames.AddRange(new string[] { "Core", "Engine" });
PrivateDependencyModuleNames.AddRange(new[] { "Slate", "SlateCore" });
PrivateDependencyModuleNames.AddRange(["Projects"]);
PrivateDependencyModuleNames.Add("UMG");
```

Multiline lists, trailing commas, `this.` receivers, tabs/spaces, LF/CRLF and empty arrays are supported. Collection-expression AddRange syntax was verified in the installed UE 5.8.1 Core.Build.cs. The generated module/plugin templates are recognized immediately. A missing dependency declaration is inserted only inside a recognized safe constructor. The known explicit/shared PCH assignment is allowed alongside dependency statements.

The parser deliberately refuses a constructor containing other statements it cannot establish as safe. Conditionals, loops, variables/helper-generated lists, computed strings, assignments to dependency lists, additional methods/fields, using aliases, unsupported class structure, and duplicate/contradictory Public/Private entries are **Complex / Read Only**. Broken tokenization or delimiters are **Malformed**. Readable literal entries can still be inspected, but the entire file remains read-only for automatic edits. This is not a general C# parser, evaluator or refactoring engine; even valid hand-written Build.cs code may require manual editing.

DynamicallyLoadedModuleNames, PublicIncludePathModuleNames and PrivateIncludePathModuleNames are shown separately and never rewritten. They do not count as link dependencies.

### Preview, visibility and edit safety

Every command and Quick Fix uses the same mutation engine, native virtual-document diff and explicit **Apply/Cancel** confirmation. No preview file is written under Source. Minimal token-range edits retain comments, unrelated statements, indentation and line endings; no formatter runs.

Build.cs must be clean before the operation. Trust, the current workspace, discovered module ownership, path containment, symlinks, hard links and content changes since preview are checked again before applying. The result is an **undoable, unsaved WorkspaceEdit** in VS Code. Save it when ready; Build's existing save step also saves it. A rejected WorkspaceEdit leaves the original unchanged. There is no direct disk overwrite or silent save behind a dirty editor buffer.

Duplicate insertion is refused. Existing Public visibility is not downgraded by Add. Private-to-Public promotion is explicit; Public-to-Private movement warns that consumers may break and scans known exposed/flat headers for direct include evidence. Removal never claims a dependency is unused or deletes source references. Failed safety checks require manual review rather than guessed C# edits.

Public headers recommend **Public**; cpp files and Private headers recommend **Private**. Flat headers or unknown API boundaries conservatively recommend Public and explain the uncertainty. Manual visibility override remains available. Self-dependencies and unconditional Runtime/unknown-host-to-Editor relationships are blocked. Ambiguous module names across roots are rejected. Cross-plugin/project relationships warn that plugin descriptor configuration may also be needed; neither `.uplugin` nor `.uproject` is modified by dependency tools.

### Header ownership, cache and diagnostics

The async index uses module Build.cs directory boundaries and exact include-relative paths across project modules, project plugins, Engine/Source and engine-distributed plugins. Public/Classes paths are mapped to normal Unreal include paths. Private header ownership is retained but does not produce cross-module add suggestions. Duplicate matches remain ambiguous; there is no basename-only fallback.

Engine indexing is **on demand**, separate from the runtime timer. The in-memory cache is keyed by normalized engine path and Build.version content. Engine identity changes invalidate it; explicit Refresh rebuilds it. It is session-only: restarting the extension rebuilds on the next request, and there is no disk cache to corrupt or migrate. Project/header events refresh the smaller project portion. Existing local dependency parses are cached by text; the 30-second watcher never scans engine source or runs dependency analysis across all project source files. Build and Run do not wait for indexing.

**Find Module for Include** works on the active include line. Once ownership is indexed and unambiguous, the same command appears in the C++ editor context menu. It reports the owning module and direct dependency status, offering add or promotion where safe. Macro includes, unresolved paths, duplicate matches and arbitrary C++ preprocessing semantics are not inferred.

Open C++ documents receive informational **Unreal Dependencies** diagnostics only when ownership is unique and the source Build.cs is safely understood. Existing direct dependencies, own-module headers, private target headers and unresolved/system includes are excluded. Known UnrealBuildTool diagnostics on the same line suppress duplicate advisory output. The advisory checks direct declarations; it is not a compiler verdict or proof about transitive visibility. Public/Private Quick Fixes are ordered by context and still require the same diff confirmation. Build.cs/editor/index changes refresh diagnostics; the extension does not continuously parse all C++ files.

The project/plugin graph records directed Public/Private edges. Doctor and the sidebar report duplicates, self-dependencies, names absent from the current index, suspicious Runtime/Editor relationships and detectable local cycles. Conditional/complex rules and unknown engine modules limit completeness. Cycles are reported, never automatically repaired. Engine-internal cycle analysis is out of scope.

Class templates now declare required modules and preferred visibility through the shared dependency model. The class preview reports Present, Missing or Unknown for complex rules, and offers **Manage Dependencies** after creation when review is needed. Class creation itself never silently edits Build.cs. Newly generated modules/plugins use this same parser and become manageable without restarting.

Dependency edits mark structural metadata stale. Saved changes follow the project automation mode; Watch performs no automatic compilation. Index refresh alone does not trigger a build. Unsaved editor changes must be saved before regeneration.

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

The v0.8.0 suite has **301 passing tests**, including 62 new automation cases. Existing regressions pass; sidebar expectations and the intentional refusal to build against an open Editor were updated. See VALIDATION.md for live VS Code and UE 5.8.1 results.

**Prior v0.6 UE 5.8.1 compilation validation succeeded.** A fresh disposable project generated a Runtime module in Public/Private layout, regenerated VS Code project files, compiled all nine v0.5 class types through Unreal's reflection/build pipeline, and linked the Editor target. A blank Runtime plugin in Flat layout was then generated and discovered without `.uproject` plugin enablement changes; the Editor target compiled and linked again. Target rules were created only in the disposable test fixture. No production project source was changed.

The v0.6 build exposed and fixed a v0.5 JavaScript inherited-constructor bug affecting constructor-free templates. The initial disposable harness also needed its matching primary-module header included first. Both problems were corrected before the successful rerun. The first sandboxed attempt was blocked at UBT log access; the authorized rerun used normal UBT logs/caches. See [VALIDATION.md](VALIDATION.md) for exact stages, toolchain, fixture and limitations.

## Release artifacts and limits

`unreal-project-tools-0.8.0.vsix` and `Unreal-Engine-Auto-Setup.zip` are produced by `build_bundle.py`. The VSIX contains every runtime module and both documentation files. Previous versioned VSIX artifacts are retained.

Windows/Win64, a trusted single local project folder, UE 5.8+, a supported toolchain and available C/C++ remain requirements. Future engine releases may require compatibility changes. Process matching cannot identify every inaccessible or relative-command-line launch. Native process races can still cause an attach failure, which VS Code reports. No native window-focus dependency, custom debugger, DLL-only UBT bootstrap, debugger launch presets, full log parser, repair system module/plugin deletion or renaming, engine plugin creation, arbitrary existing Build.cs refactoring or automatic Target.cs edits, Blueprint asset creation, cooking/packaging/deployment are included. Class naming does not scan all project/engine reflected names for collisions. Discovery conservatively recognizes conventional ModuleRules instead of evaluating C#; Blueprint-only projects need an existing module before class creation.


Prior v0.7 validation includes real UE 5.8.1 ownership checks, a native VS Code WorkspaceEdit/Undo and Quick Fix check, and successful UBT Editor compilation after adding both Public and Private dependencies in a disposable project. See [VALIDATION.md](VALIDATION.md) for exact evidence and limits.
