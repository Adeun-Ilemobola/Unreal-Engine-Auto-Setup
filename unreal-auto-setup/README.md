# Unreal Engine Auto Setup

Initialize Unreal C++ projects, manage build selections, and open Unreal Editor from VS Code.

**Release:** 0.3.0 · **Platform:** Windows / Win64 · **Unreal Engine:** 5.8+ · **VS Code:** 1.100.0+ · **License:** MIT

Future Unreal Engine releases may require compatibility updates. This is a locally packaged extension with experimental build/editor controls. Its stable extension ID remains `local-tools.unreal-project-tools` so v0.2.x installations can upgrade normally.

## Install and get started

1. In the VS Code profile you use for Unreal, select **Extensions > ... > Install from VSIX...** and install `unreal-project-tools-0.3.0.vsix`.
2. Reload VS Code if prompted. Open the single folder directly containing your `.uproject` and trust the workspace.
3. Automatic initialization adds missing configuration. If prompted, choose an engine installation and complete Skybox's IntelliSense selection.
4. Use **Build** to compile the active selection or **Editor** to open Unreal Editor without compiling. To do both, run **Unreal: Build and Open Editor**.
5. Click **Play** inside Unreal Editor to test the project.

The extension runs in profiles where it is installed/enabled. It does not switch profiles automatically. Unreal Engine, Visual Studio C++ build tools, the Windows SDK, and engine prerequisites must be installed separately. Source engines need a working build environment and an editor executable before using Editor controls.

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

The status bar shows a compact selection such as `MyProjectEditor | Win64 | Development`. Click it to choose which field to change, or use:

- **Unreal: Select Target**
- **Unreal: Select Platform**
- **Unreal: Select Configuration**

Selections are stored in VS Code workspace state separately for each project and survive reloads. New and upgraded projects without saved selections default to their identifiable Editor target / Win64 / Development. Switching selections does not rewrite project settings or existing tasks.

Targets are discovered from immediate `Source/*.Target.cs` files. Game, Editor, Client, Server, Program, and unknown/ambiguous target types can be listed. Discovery reads text and does not execute or fully interpret C# rules. Unknown types are labeled; an ambiguous default requires an explicit choice. Removed targets remain visible as the saved selection until you select a replacement, and builds report the missing target.

Win64 is the only platform in v0.3. Configurations are Debug, DebugGame, Development, Shipping, and Test. Editor targets reject Shipping/Test with an actionable message. Other target/configuration availability is ultimately validated by UnrealBuildTool and the installed engine.

Skybox's IntelliSense configuration is separate from these build selections. Setup opens its selector; changes in this helper do not silently update Skybox's internal state.

## Build controls

**Build** / **Unreal: Build Project** saves open file-backed documents, validates the selected project and engine, and starts a dedicated Windows PowerShell terminal. It calls the engine's `Build.bat` with the selected target, platform, configuration, project path, `-WaitMutex`, and `-NoHotReloadFromIDE`.

Compiler output and build exit status appear in that terminal. The helper prevents another operation while its tracked terminal is active. Close the terminal before retrying when an operation is still tracked. It does not coordinate with builds started outside the helper.

Initialization also adds a Skybox `UnrealBuildTool` task reflecting the current selection. Existing tasks are snapshots and stay unchanged when the status-bar selection changes. Rerun setup to add a task for a new valid selection. The status-bar build command always uses the current selection directly.

## Editor controls

| Command | Behavior |
| --- | --- |
| **Unreal: Open Editor** / **Editor** button | Validates the project and engine, then opens Unreal Editor without a build or save-all operation |
| **Unreal: Build Project** / **Build** button | Compiles the current selection without opening the Editor |
| **Unreal: Build and Open Editor** | Requires a known Editor target, builds the current selection, and opens the Editor only after success |

Editor launch is `UnrealEditor.exe <project.uproject> -log`. Play is manual inside Unreal Editor. Open Editor works without a C++ target or Build.bat when an explicit valid engine with the editor executable is configured. It does not reuse an existing Editor instance or choose configuration-specific editor executables. Debug/DebugGame build outputs may require additional Unreal launch configuration; v0.3 keeps the requested standard editor launch command.

## Engine detection

An existing `unrealEngine.enginePath` is authoritative. If invalid, the helper reports the issue rather than replacing the user's value.

When no engine path is configured and the project has a numeric association, the helper checks matching entries in Epic's `LauncherInstalled.dat` under ProgramData and the version-specific `InstalledDirectory` Windows registry entry, in both registry views. It never crawls the disk. Automatic candidates must have a matching major/minor `Build.version`, Build.bat, and UnrealEditor.exe.

A successfully resolved path is normalized and remembered at workspace scope. Numeric setup may finish without an engine being found; a later build/open offers the folder picker. Custom/source/GUID associations use explicit configuration or manual folder selection, without guessing a matching build. For manual selection, required files depend on the operation. The installation root or its Engine subfolder is accepted.

The version check requires 5.8+ and matches numeric associations by major/minor. It does not prove that a manually chosen custom engine corresponds to a particular GUID or that every future engine version is compatible.

## Diagnostics and project logs

**Unreal: Diagnose Project** writes a read-only report to **Output > Unreal Engine Auto Setup**. It reports project discovery/selection, Source directory, selected target, engine path/version/compatibility, Build.bat and UnrealEditor.exe, companion extensions, trust, generated files, and the build selection. It may inspect automatic engine candidates but does not save a path, modify files/state, install extensions, build, or repair anything.

**Unreal: Open Latest Project Log** opens the newest regular `.log` file by modification time directly under `Saved/Logs`, including backup logs. It handles missing logs with a notification. This gives access even though Saved is hidden. It does not parse, tail, or recursively search logs.

## Troubleshooting

| Symptom | Action |
| --- | --- |
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

## Current limitations

One local Windows project root only; no multi-root or virtual workspace support. The extension does not activate in Restricted Mode. Discovery does not execute C# or recursively inspect nested targets. Build controls need a C++ target; Blueprint-only projects can use Open Editor. Some configurations require source engines or additional engine components. Paths containing quotes, percent signs, exclamation marks, or certain control characters are rejected by terminal generation.

No debugger integration, compiler Problems parser, Live Coding control, class generation, cooking/packaging, Unreal Insights, multiplayer orchestration, automatic repair, or real-time log tailing is included.

## Development and capability report

See [CAPABILITIES.md](CAPABILITIES.md) for the implementation inventory, command IDs, state/files, and validation scope.

Run `node --test tests/*.test.js` from the extension source directory. From the repository root, run `python build_bundle.py` to produce `unreal-project-tools-0.3.0.vsix` and `Unreal-Engine-Auto-Setup.zip`. No npm runtime dependencies are used.

Tests use mock VS Code APIs and stub engine files, with real PowerShell execution for build-success/failure checks. A complete real Unreal compile and Editor launch have not been validated as part of this release.

Implementation references: [Epic build configurations](https://dev.epicgames.com/documentation/unreal-engine/build-configurations-reference-for-unreal-engine), [Epic Windows engine registry discovery](https://github.com/EpicGames/tk-unreal/blob/master/startup.py).
