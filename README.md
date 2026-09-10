# Unreal Engine Auto Setup

Initialize Unreal projects, create C++ classes, modules and project plugins, build with compiler Problems, monitor project Editors, attach the C++ debugger, and regenerate project files from VS Code.

**Release:** 0.7.0 · **Platform:** Windows / Win64 · **Unreal Engine:** 5.8+ · **VS Code:** 1.100.0+ · **License:** MIT

Future Unreal Engine releases may require compatibility updates. This is a locally packaged extension with experimental build/editor controls. Its stable extension ID remains `local-tools.unreal-project-tools` so earlier installations can upgrade normally.

## Install and get started

1. In the VS Code profile you use for Unreal, select **Extensions > ... > Install from VSIX...** and install `unreal-project-tools-0.7.0.vsix`.
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
| Dependencies | Selected module dependencies, edit safety, relationship warnings and index tools |
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

**No automatic build** follows an edit, save, index refresh or timer. Save Build.cs and explicitly Build or regenerate when needed. Dependency edits mark structural metadata stale; unsaved editor changes must be saved before regeneration.

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
| Dependency edit refused | Inspect the reported unsupported pattern and edit Build.cs manually; arbitrary C# is deliberately read-only |
| Dependency candidate/header missing | Run Refresh Dependency Index with a valid engine path; ambiguous includes are never guessed |
| Dependency change not on disk | Save the undoable Build.cs editor change before regeneration; Build saves files first |
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

No module/plugin deletion or renaming, engine plugin creation, Blueprint asset creation, arbitrary C# Build.cs refactoring or automatic Target.cs editing, additional class-template families, cooking/packaging/deployment, custom debugger backend, custom IntelliSense engine, Live Coding control, Insights, multiplayer orchestration, automatic repair, or real-time log tailing is included. Compiler parsing covers common source diagnostics, not every Unreal message. Process matching cannot reliably identify Editors launched with relative-only project arguments or hidden command lines.

## Development and capability report

See [CAPABILITIES.md](CAPABILITIES.md) for the implementation inventory, command IDs, state/files, and validation scope.

Run `node --test tests/*.test.js` from the extension source directory. From the repository root, run `python build_bundle.py` to produce `unreal-project-tools-0.7.0.vsix` and `Unreal-Engine-Auto-Setup.zip`. No npm runtime dependencies are used.

The v0.7.0 suite has **239 passing tests**: all 185 prior regressions remain, with 54 new dependency cases. Intentionally expanded sidebar/menu expectations and the filesystem-watcher mock were updated. New coverage includes parser/refusal cases, minimal edits, file/editor safety, diff confirmation, graph/cycles, ownership/cache behavior, diagnostics, Quick Fixes and generator integration. Mocked VS Code APIs and disposable filesystem fixtures verify UI and failure paths. Existing real PowerShell build/diagnostic tests also pass.

**Prior v0.6 UE 5.8.1 compilation validation succeeded.** A fresh disposable project generated a Runtime module in Public/Private layout, regenerated VS Code project files, compiled all nine v0.5 class types through Unreal's reflection/build pipeline, and linked the Editor target. A blank Runtime plugin in Flat layout was then generated and discovered without `.uproject` plugin enablement changes; the Editor target compiled and linked again. Target rules were created only in the disposable test fixture. No production project source was changed.

The v0.6 build exposed and fixed a v0.5 JavaScript inherited-constructor bug affecting constructor-free templates. The initial disposable harness also needed its matching primary-module header included first. Both problems were corrected before the successful rerun. The first sandboxed attempt was blocked at UBT log access; the authorized rerun used normal UBT logs/caches. See [VALIDATION.md](VALIDATION.md) for exact stages, toolchain, fixture and limitations.

Implementation references: [VS Code C++ attach configuration](https://code.visualstudio.com/docs/cpp/launch-json-reference), [Epic build configurations](https://dev.epicgames.com/documentation/unreal-engine/build-configurations-reference-for-unreal-engine), [Epic Windows engine registry discovery](https://github.com/EpicGames/tk-unreal/blob/master/startup.py).

Native UI implementation references: [Tree View API](https://code.visualstudio.com/api/extension-guides/tree-view), [when-clause contexts](https://code.visualstudio.com/api/references/when-clause-contexts).


Current v0.7 validation includes real UE 5.8.1 ownership checks, a native VS Code WorkspaceEdit/Undo and Quick Fix check, and successful UBT Editor compilation after adding both Public and Private dependencies in a disposable project. See [VALIDATION.md](VALIDATION.md) for exact evidence and limits.
