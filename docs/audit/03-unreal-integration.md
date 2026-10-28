# Unreal integration and compatibility

The source intentionally targets Windows/Win64 and UE 5.8+. It does not attempt universal Unreal support. Findings below distinguish a verified restriction, a confirmed implementation defect, historical validation and untested compatibility.

## Engine and project discovery

`project.js:21–35` requires exactly one local folder with a root `.uproject`, reads strict JSON (BOM tolerated), uses `unrealEngine.defaultProject`, and asks when multiple descriptors need selection. It does not recursively search for projects or support multi-root workspaces. These are documented scope limits, not accidental omissions.

`engine.js:24–41` reads ProgramData/Epic/UnrealEngineLauncher/LauncherInstalled.dat and queries the associated version's HKLM InstalledDirectory in both registry views. Windows and ProgramData fallbacks are environment-aware; there is no fixed production `C:/Program Files/Epic Games/UE_5.8` installation path. Explicit enginePath remains authoritative. GUID/custom associations use explicit configuration or a folder picker rather than automatic custom-engine registry enumeration.

Inspection reads Engine/Build/Build.version, checks major/minor compatibility with numeric associations, and checks Build.bat/UnrealEditor.exe (`engine.js:11–21`). Patch equality is not required. `core.supportedVersion` accepts every major above 5 and every 5.x minor >=8. Future acceptance should be labeled unvalidated rather than supported by evidence.

**F04 — discovered capability requirements differ from configured/picked engines. Confirmed by source code and disposable probe.** `engine.js:47–60` honors `requireBuild`/`requireEditor` for configured and picked paths, but line 54 requires both for every discovered candidate. The same version-only fixture is accepted as configured with both flags false and rejected when discovered. Build-only installations can be unnecessarily rejected; numeric automatic setup has no picker fallback (`extension.js:78–85`). Use a single capability predicate for all candidate sources.

## Build, generation and reflection

| Integration | Actual behavior | Assessment |
| --- | --- | --- |
| Targets | Only direct `Source/*.Target.cs`; regex assignment inference after comment stripping (`project.js:7–18`) | Nested/inherited/computed target definitions are unsupported/Unknown; F05 strings can create false positives |
| Build | Build.bat with target, Win64, configuration, absolute project argument, WaitMutex, NoHotReloadFromIDE (`build.js:12–15`) | Standard external workflow; no engine-source build orchestration or arbitrary platform support |
| Configurations | Debug, DebugGame, Development, Shipping, Test; Editor rejects Shipping/Test (`project.js:5,56–61`) | Sensible validation; compiler/toolchain support still belongs to UBT |
| Project generation | Two Windows UBT .exe layouts; `-projectfiles -project=… -game -progress -vscode` (`generation.js:5–16`) | No DLL-only/bootstrap fallback; source/custom installations may need UBT built first |
| UHT | Invoked indirectly by UBT; generated.h and reflection macros supplied by templates (`classTemplates.js:36–47`) | No independent UHT runner or reflection-layout analysis |
| Diagnostics | File/line MSVC/UHT and colon-style errors/warnings; streaming Problems (`problemParser.js:3–15`) | Not a complete parser for all UBT/linker logs; raw output retained |
| Logs | Most recent Saved/Logs regular .log opened (`diagnostics.js:103–125`) | No live tailing, structured log viewer or log retention policy |

**F05 — target type can be inferred from a string literal. Confirmed by source code and disposable probe.** `project.js:13–16` can label an otherwise unassigned target Editor from quoted text. UBT remains the final validator, but the extension may select the wrong target or offer incompatible workflows. Conventional declarations with strings/comments/conditional assignments need regression cases.

## Modules, plugins, C++ and Blueprint boundaries

Local module discovery recognizes a conventional class derived from ModuleRules with a ReadOnlyTargetRules constructor. External modules are excluded; discovery stops at a recognized module; depth and generated-directory limits apply (`modules.js:12–48`). Project plugin modules must be declared in a valid `.uplugin`; plugin discovery stops descending once a descriptor directory is found (`:50–68`). These choices favor safe editing over complete UBT-equivalent discovery.

Project module creation appends a Modules entry while preserving unrelated descriptor text. Plugin creation emits a new code-only descriptor and initial module without adding a project Plugins entry (`creation.js:19–27`). Enablement/platform/target constraints still apply. Neither workflow edits Target.cs. It is not safe to generalize success with Runtime modules to every host/target combination.

Nine C++ class templates generate reflected types and selected Blueprint metadata. This supports C++ classes usable by Blueprints, not Blueprint graph/asset authoring. Interface generation uses `CannotImplementInterfaceInBlueprint` (`classTemplates.js:40`). New class creation requires an existing discoverable module; a module wizard can create project structure separately.

Dependency assistance indexes exact header-relative paths, rejects ambiguous ownership and refuses generic transformation of computed C# lists. Engine indexes are advisory: plugin enablement, target-conditioned dependencies, nonstandard include paths and generated headers are not fully modeled. Missing-dependency diagnostics do not diagnose every insufficient Public/Private exposure (`dependencyDiagnostics.js:23–29` treats an existing dependency of either visibility as present); the explicit include action can offer promotion (`dependencyActions.js:128–135`).

## Editor, Live Coding and language services

PowerShell CIM queries match `UnrealEditor.exe` by absolute `.uproject` command-line arguments. Missing/relative/inaccessible command lines yield Unknown, which blocks launches/builds conservatively (`processes.js:30–58`). Alias paths/junctions, unusual executable names, alternative launch conventions and races between checking and spawning require actual Windows/Editor tests. The system is not an OS-wide launch lock.

The extension starts UnrealEditor.exe with the project and `-log`, rechecks before cppvsdbg attachment, and never sends PIE/Play commands. It does not trigger Live Coding externally. The optional mutex observation is executable-scoped and does not prove project-specific build safety; both Running and Unknown prevent external UBT builds (`liveCoding.js:3–24`). Epic documents Live Coding as runtime recompilation/patching, but that documentation does not validate an external endpoint for this extension. Retain the conservative policy until a supported interface is established. [Epic Live Coding documentation](https://dev.epicgames.com/documentation/unreal-engine/using-live-coding-to-recompile-unreal-engine-applications-at-runtime).

IntelliSense is delegated to Skybox's configuration provider and Microsoft C/C++; formatting to cpptools/clang-format. Setup locates Skybox's configuration command by its English contributed title (`extension.js:137–144`), a fragile integration seam if titles/localization change. ExtensionPack entries do not pin versions. The generated Skybox task and this extension's saved build selection are not one shared execution lifecycle. Epic's VS Code guide also requires an appropriate external compiler setup; installing extensions alone is insufficient. [Epic VS Code setup](https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-visual-studio-code-for-unreal-engine).

## UE 5.8 evidence and limits

| Claim | Evidence classification |
| --- | --- |
| Source accepts 5.8, rejects older numeric associations | Confirmed by source and existing tests |
| Prior UE 5.8.1 Runtime module/plugin generation, nine-class UHT/compile, dependency compile and automation smoke runs | Recorded in `VALIDATION.md:9–36,52–80,137–160` and `RELEASE-0.8.0.md`; historical repository claims, not freshly reproduced here |
| Current 301 Node tests pass | Reproduced 2026-10-27; mostly fixtures/mocked VS Code, not a new Unreal compile |
| Current UE 5.8 production project works end to end | Requires further investigation; no project/engine build was run in this audit |
| All later UE versions, all host types/configurations, source engines | Requires further investigation; numerical acceptance does not establish compatibility |

Current official [UE 5.8 release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-release-notes) were consulted as release context; their existence is not an extension certification. No confirmed UE 5.8 API-level incompatibility was established. Confirmed workflow limitations are Windows/Win64, conventional targets/modules, executable UBT requirement and no external Live Coding trigger. F04/F05 are implementation defects independent of an engine upgrade.

Before changing compatibility claims, validate a disposable project against the user's exact engine patch, MSVC/SDK, VS Code version and companion extension versions. Include generation preserving settings, all supported template families, target configurations, Editor stopped/running/unknown, cancellation, source-engine bootstrap and Public/Private dependency changes. Preserve old fixtures/results by version rather than overwriting historical evidence.
