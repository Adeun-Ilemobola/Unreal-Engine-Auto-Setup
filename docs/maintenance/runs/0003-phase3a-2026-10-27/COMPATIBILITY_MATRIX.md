# Compatibility matrix — Phase 3A, 2026-10-27

Status applies only to the listed installation/workflow. Detected files and version-policy acceptance are not full compatibility certification. [Execution result](RESULT.md), [validation](VALIDATION.md), [environment](environment-inventory.json), [binary metadata](engine-binary-versions.json).

| Component | Installed/tested version | Detection | Basic validation | Integration validation | Limits/evidence |
| --- | --- | --- | --- | --- | --- |
| Unreal Engine installed build | 5.8.4, CL 58902052; Epic promoted installed build | Passed | Passed | Passed | Actual disposable Development Editor/Win64 builds and Entry-map Editor sessions. No other target/platform/patch certification. Launcher metadata says 5.8.1; historical evidence kept separate. |
| UnrealBuildTool | 5.8.0.0 executable/DLL file metadata in the installed UE 5.8.4 engine | Passed | Passed | Passed | Help verified ProjectFiles/VSCode modes. Real generation, builds, controlled compiler failure and repair. Assembly file version is distinct from engine patch; no engine rebuild. |
| UnrealEditor | Same UE 5.8.4 installation | Passed | Passed | Passed | Owned PIDs/association, real Entry UI, Run reuse/guards, second ordinary shutdown. No PIE, gameplay or Live Coding invocation. Memory-pressure warning observed. |
| Windows | Windows 11 Home 10.0.26300, x64 | Passed | Passed | Passed | Process association, MSVC/UBT and native VS Code/Editor exercised on this host only. |
| VS Code | 1.143.1 x64, e646868227c3e3a9e3f24277c8c7220be42c0be7 | Passed | Passed | Passed | Real isolated interactive Development Host. Automated --extensionTestsPath refuses native modals; interactive host used instead. PATH code command is Cursor and was not used for host validation. |
| Maintained extension source | local-tools.unreal-project-tools 0.8.0, repository development path | Passed | Passed | Passed | Actual setup, six creation workflows, dependency preview/WorkspaceEdit, build/regeneration/runtime/attach commands. Unresolved P1.1/P1.2 safety limits persist. |
| Existing globally installed custom extension | 0.8.0 folder present; pre-maintenance bytes may differ | Passed | Not tested | Not tested | No global reinstall/update or claim that same version means same maintained source. |
| Microsoft C/C++ | 1.35.4 win32-x64, existing files | Passed | Passed | Partially validated | Provider config sampled include diagnostics cleared; actual cppvsdbg attach/session verified. Full IntelliSense, breakpoints/stepping and clean debugger detach not established. Activation logged a navigator deprecation warning. |
| Skybox Unreal Engine Integrations | 0.1.2, existing files | Passed | Passed | Partially validated | Native project/Win64 Development Editor selection and target query/provider path exercised. Full companion features and other target/platform combinations not tested. C# companion recommendation was not installed. |
| Visual Studio | Community 2026 18.11.1, installation 18.11.12315.225 | Passed | Passed | Passed | Used its selected MSVC/SDK through UBT; Visual Studio IDE gameplay tooling not tested. |
| MSVC selected by UBT | 14.50.35739; directory 14.50.35717 | Passed | Passed | Passed | Compiled all generated reflected classes and project/plugin modules, produced expected C1189 and repaired build. |
| Other installed MSVC | 14.44.35207 and 14.51.36231 directories | Passed | Not tested | Not tested | Presence/compiler metadata only; did not switch or install toolchains. |
| Windows SDK selected | 10.0.22621.0 | Passed | Passed | Passed | Selected in real UBT logs and linked disposable DLLs. |
| Other Windows SDKs | 10.0.26100.0, 10.0.28000.0 | Passed | Not tested | Not tested | Inventoried only. |
| CLI Node | 24.19.0 | Passed | Passed | Passed | 363-test source suite and integration launcher/report tools. Not the extension-host Node version. |
| Extension-host Node | 24.21.0 (VS Code embedded) | Passed | Passed | Passed | Real extension/companions ran in this runtime. |
| Python | 3.14.7 | Passed | Passed | Not tested | Four packaging fixture tests and read-only preflight; no Python-driven Unreal integration. |
| Existing RPGX reference | EngineAssociation 5.8; conventional targets/config | Passed | Passed | Not tested | Read-only current-module inspection/hash checks, no real RPG host/build/migration. See [RPG review](RPG_COMPATIBILITY.md). |
| Regeneration conflict safety P1.1 | Current preserved implementation | Passed | Failed | Not tested | Existing TODO still reproduces saved-edit overwrite in a mock. Real ordinary no-concurrent-edit generation passed 22 hashes; conflict safety remains Blocked. |
| Cross-host process ownership P1.2 | Current in-memory gate | Passed | Partially validated | Not tested | Unit/owned PowerShell cancellation and ordinary exits pass; real UBT reload/orphan test intentionally not performed. |

All Passing integration rows are bounded to this fixture and listed operations. A successful ordinary build does not certify future engine versions, source-engine layouts, other compilers/SDKs, Shipping/Test, macOS, multi-root workspaces, gameplay, packaging or deployment.
