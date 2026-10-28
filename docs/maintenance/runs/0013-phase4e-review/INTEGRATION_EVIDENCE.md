# Independent integration evidence

## Unreal generation and compilation

The existing disposable project ownership marker matched this repository and the project was stopped before the run. Generated unique Probe...creationMKKjk6 types cover all 17 registry entries. The writer produced native class pairs, paired U/I interface declarations, and header-only F/E reflected types. `generated.json` preserves exact source text and paths.

`ubt.txt` records the actual Phase3AIntegrationEditor Win64 Development invocation, 19 compile/link/metadata actions and Result: Succeeded. The combined generated module translation unit covers the header-only reflected types. All 17 uniquely named .generated.h files were independently found under Intermediate after the build, establishing UHT processing beyond merely trusting exit 0. `compile-result.json` contains matching native helper/command/operation proof, rootExited=true and activeProcesses=0. Build.cs bytes remained unchanged. Only newly created owned source files/directories were removed after verification.

UE 5.8 always creates a UBA-named local executor even with -NoUBA; installed source shows detouring disabled and every action is tagged [NoUba]. No additional speculative flag was needed. UE-controlled log/trace/cache locations outside scratch are an accepted engine behavior, not temporary fixture executables. Existing ignored project intermediates remain in the authorized disposable integration project.

## Real debugger

`real-debugger.json` is the passing record: Microsoft C/C++ 1.35.5, real cppvsdbg adapter loaded from the isolated profile, Editor PID **82660**, two different session IDs, two successful DAP attach responses and two successful disconnect responses. Both session-end events arrived. Process discovery confirmed the same project/PID alive after each detach; activeDebugSession was empty afterward.

The initial action uses the actual public `unrealSetup.attachDebugger` command. Detach uses the production debugger.detach implementation, not a mocked VS Code object. The Editor was launched by this test with a retained Node process handle; only that owned handle was closed after validation. The host/profile then passed exact-run process absence cleanup. `editorExit: null` is Node's signal-termination exit-code representation, not proof of a running process; the awaited close event and cleanup check are the completion evidence.

The first driver attempt failed on C:/c: comparison; the second queried threads before the adapter was ready. Their JSON errors remain archived and are not successes. The corrected barrier requires the actual successful attach response. Historical run 0011's “real debugger” assertion was based on synthetic APIs and is superseded, without rewriting its files.

## Real host and installed package

Final host run `host-PHrXfH`: real activation, discovery, command registration, generated file creation, WorkspaceEdit, Undo/Redo, terminal lifecycle and runtime refresh passed. Registry/export checks remain useful but narrow. Diagnostics observed zero and code-action query returned zero; no expected diagnostic or applied fix was established. No actual host reload, workspace switch or running build cancellation was performed by that suite.

Fresh package run `package-EyG2zt` installed local-tools.unreal-project-tools 0.8.0 using the installed VS Code CLI with --do-not-include-pack-dependencies. It loaded the installed package directory, not a development copy of the extension. All 35 manifest commands registered; four packaged snippet bodies inserted through TextEditor.insertSnippet; native helper integrity passed. The package contains 51 extension assets and two VSIX metadata entries, including 41 runtime modules, native helper/source/manifest, snippets and required documents. build_bundle.py validates every archive entry against explicit preflight inputs byte-for-byte; no tests, recovery journals, ignored projects or scratch files are included.

Successful profiles were removed only after completion marker and exact-run process absence checks. The validation VSIX is retained under `C:\Dev\Scratch\UnrealAutoSetupTests\package-EyG2zt-artifact\unreal-project-tools-0.8.0.vsix`; package.json records its SHA-256 and package-location.txt records the retained location. No personal profile, marketplace publication, system TEMP/TMP or antivirus setting was modified.
