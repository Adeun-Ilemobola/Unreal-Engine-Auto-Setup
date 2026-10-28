# Reference workspace facts

## Direct observations, 2026-10-28 UTC

User supplied `C:\Dev\Unreal\hex`. Its archive is literally named `C:\Dev\Unreal\hex\.zip`, not a guessed downloaded filename. SHA-256: `aa2ce9882e9ab2d071b7c187de0cf3294f9824d13dc60c29c6aef164bc8f1d57`. It contains 29 entries including directories. Every archived file with a corresponding extracted file matches byte-for-byte. Neither archive nor extracted project was modified. `hex-facts.json` and `hex-manifest.json` in the evidence directory retain exact inventory, task/debug definitions, response contents and hashes.

`hex.code-workspace` has exactly `folders`, `settings`, `extensions`, `tasks`, `launch`. Its roots are `hex` with path `.` and `UE5` with path `C:\Program Files\Epic Games\UE_5.8`. These display names and paths are sample facts, not names to hardcode. Engine Build.version reads 5.8.4, changelist 58902052.

Workspace settings disable JS/TS task and npm auto-detection and provide PATH, DOTNET_ROOT, DOTNET_HOST_PATH, DOTNET_MULTILEVEL_LOOKUP=0 and DOTNET_ROLL_FORWARD=LatestMajor for Unreal-bundled .NET 10.0/win-x64. Recommendations are Microsoft C/C++ and C#, not SkyBox.

Project `.vscode` contains seven files: c_cpp_properties.json, settings.json, tasks.json, two compileCommands JSONs and one hex.0.rsp in each matching compileCommands directory. There is no project `.vscode/launch.json`; launch entries live in the workspace. Engine `.vscode` independently contains 37 files at observation time; navigation does not authorize their modification.

Project settings include our engine/defaultProject keys, associations, exclusions and formatting defaults. This is a mixed-owner capture: “generated workspace” does not mean every project setting came from UBT. The additional project task is `Unreal: hexEditor Win64 Development`, type `UnrealBuildTool`, args mode Build/target hexEditor/platform Win64/configuration Development, default build group.

## Task/provider ownership

The workspace has 24 **shell** tasks: Game target hex across Debug, DebugGame, Development, Test and Shipping; Editor target hexEditor across Debug, DebugGame and Development; each has Build/Rebuild/Clean. Commands use engine batch files with an engine working directory and a project argument. Rebuild depends on the matching Clean. `$msCompile` parses compiler output. These tasks are separate from the project-level custom task.

Installed `skyboxlabs.unrealengine-tools-0.1.2/package.json` contributes `UnrealBuildTool`; its `dist/unrealengine-tools.mjs` registers that task provider. It also registers a C/C++ custom configuration provider and a dynamic cppvsdbg configuration provider. Thus the custom task is not a built-in VS Code task type. Our extension creates a task of that type but has no TaskProvider registration of its own. The installed SkyBox bundle uses UBT Query for AvailableTargets/TargetDetails with metadata under Intermediate/ProjectFiles/.vscode; a successful query does not establish a successful compile. Runtime provider choice and coexistence remain unverified because no isolated host started.

## Debug configurations

Eight cppvsdbg launch entries correspond to the eight target/configuration combinations above, with matching build preLaunchTask. The ninth, Generate Project Files, uses coreclr. Its preLaunchTask is `UnrealBuildTool Win64 Development Build`, absent from this captured workspace's 24 tasks and the project's custom task. Whether another root/provider supplies it is unverified; this capture alone does not prove that launch works.

## Compile metadata and source

Both compileCommands_Default.json and compileCommands_hex.json contain exactly two entries: Source/hex/hex.cpp and Source/hex/MyClass.cpp. Each uses MSVC 14.50.35717 cl.exe and a response file, with directory set to the engine's Engine/Source. c_cpp_properties.json selects one database per configuration: `hexEditor Editor Win64 Development (hex)` or `Win32`, c17/c++20, msvc-x64. It has no explicit configurationProvider field. An active provider could still be chosen elsewhere; no running-host inference is made.

The response files contain CoreUObject/Public and project Intermediate/Build/Win64/UnrealEditor/Inc/hex/UHT include locations. Their presence does not prove those paths are current or that cpptools selected that database for a later translation unit.

Source contains hex.Target.cs (Game), hexEditor.Target.cs (Editor), hex.Build.cs, hex.cpp/.h, MyClass.cpp/.h. Both targets use BuildSettingsVersion.V7. Module public dependencies are Core, CoreUObject, Engine, InputCore. MyClass is a plain exported C++ class, without UCLASS or generated-header inclusion. The descriptor associates UE 5.8, declares runtime module hex, and enables ModelingToolsEditorMode and GameplayStateTree. The snapshot does **not** include ModObject.cpp; absence of its compile entry therefore does not itself prove a stale entry for a currently existing file. The reported UObject/Object.h symptom remains unverified on this snapshot.

## Documented contracts versus sample facts

VS Code documents named/relative roots, workspace settings, task/debug sections and folder-scoped settings; it does not promise a fixed task count. Epic documents the VS Code generator and build independence from IDE files; it does not make this 24/9 sample universal. Microsoft documents fallback to base configuration when a translation unit has no compile-database entry. See [official documentation review](VALIDATION.md#official-documentation-reviewed).

## Three separate baseline modes

| Mode | Required fixture provenance | Starting metadata | Phase 1A evidence / next measurement |
|---|---|---|---|
| A — Blueprint converted once through Unreal Editor; no IDE generation | New owned scratch fixture; create Blueprint project, add exactly one temporary C++ type through Editor; record any automatic Editor generation | Verify absence/presence immediately; do not silently delete unexpected metadata | Workflow specified, not created/run. Current extension cannot bootstrap two roots. Observe Editor side effects before claiming a no-generation baseline. |
| B — Native generated workspace | Separate disposable clone/fixture generated with a recorded engine/version/tool command | UBT workspace + database/response output; compare before/after | hex archive provides direct existing output evidence, not a fresh clean controlled generation. No generator run in this phase. |
| C — Conventional fresh C++ template | Separate new Editor C++ project, distinct from A and B | Record template-generated source/targets and any automatic metadata | Workflow specified, not created/run. Do not equate it with Blueprint conversion. |

All future owned fixtures/profiles/output must remain below `C:\Dev\Scratch\UnrealAutoSetupTests`; preserve hex as reference. A two-root workspace alone provides navigation, not validated build/IntelliSense readiness. Do not run the installed generator until its possible engine-root writes have an approved avoidance strategy. No Phase 1B proof-of-concept was built.

## Exact task labels

- `hex Win64 Debug Build`
- `hex Win64 Debug Rebuild`
- `hex Win64 Debug Clean`
- `hex Win64 DebugGame Build`
- `hex Win64 DebugGame Rebuild`
- `hex Win64 DebugGame Clean`
- `hex Win64 Development Build`
- `hex Win64 Development Rebuild`
- `hex Win64 Development Clean`
- `hex Win64 Test Build`
- `hex Win64 Test Rebuild`
- `hex Win64 Test Clean`
- `hex Win64 Shipping Build`
- `hex Win64 Shipping Rebuild`
- `hex Win64 Shipping Clean`
- `hexEditor Win64 Debug Build`
- `hexEditor Win64 Debug Rebuild`
- `hexEditor Win64 Debug Clean`
- `hexEditor Win64 DebugGame Build`
- `hexEditor Win64 DebugGame Rebuild`
- `hexEditor Win64 DebugGame Clean`
- `hexEditor Win64 Development Build`
- `hexEditor Win64 Development Rebuild`
- `hexEditor Win64 Development Clean`
