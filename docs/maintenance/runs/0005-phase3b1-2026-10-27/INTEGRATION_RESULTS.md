# Real VS Code / Unreal integration

**Real-host validation performed; P1.1 remains partial.** Source mocks are reported separately in [validation](VALIDATION.md).

## Environment and execution

Reused the owned, ignored `C:\Dev\VSCodeTools\unreal-auto-setup\.local-test-projects\Phase3AIntegration` fixture; verified `PHASE3A-OWNERSHIP.json` and captured 39 protected disk files before testing. Original copies remain in `phase3b1-baseline/transaction-0`; [before](protected-before.json) and [after](protected-after.json) record identities/hashes. No project recreation/migration or extra large Unreal project.

Installed Epic UE **5.8.4**, CL **58902052**, `C:\Program Files\Epic Games\UE_5.8`. Real host: VS Code **1.143.1**, Node **24.21.0**; maintained extension **0.8.0** loaded from repository source; installed cpptools **1.35.4** and Skybox **0.1.2** loaded through explicit development paths. Private Phase 3A `host-data`/empty `host-extensions` were reused; trust was already true. No personal profile, extension installation or global security setting was changed.

The three exact host launch specifications are [host-spec.json](host-spec.json), [host2-spec.json](host2-spec.json), [host3-spec.json](host3-spec.json), executed with `node tools/phase3b1/run-owned.cjs <spec>`. They specify Microsoft's Code.exe, `--new-window --wait`, the private directories and explicit extension development paths. The interactive driver invokes real contributed commands; it is not an `extensionTestsPath` mock or direct internal-helper substitute.

Exact generation executable/arguments, invoked by `unrealSetup.regenerate` through the normal managed PowerShell wrapper:

```text
C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.exe
-projectfiles -project=c:\Dev\VSCodeTools\unreal-auto-setup\.local-test-projects\Phase3AIntegration\Phase3AIntegration.uproject -game -progress -vscode
```

## Observed workflows

| Request ID | UBT execution | Overall preservation | Command wall time |
| --- | --- | --- | --- |
| `3b1-ordinary-1` | Succeeded, exit 0 | Conflict; 22 observations; original automatic-preservation criterion failed | 6.345 s |
| `3b1-real-saved-conflict` | Succeeded, exit 0 | Conflict; first harness comparison falsely failed on CRLF, retained below | 5.136 s |
| `3b1-saved-conflict-rerun` | Succeeded, exit 0 | Conflict; saved edit survived byte-for-byte; saved text matched disk | 5.898 s |
| `3b1-subsequent-ordinary` | Succeeded, exit 0 | Conflict; subsequent regeneration remains executable, not conflict-free | 4.407 s |
| `3b1-build-after-regeneration` | Succeeded, exit 0 | Manual Development Editor build succeeded | 43.025 s |

During each saved-edit test, the driver first observed the exact project-associated `UnrealBuildTool.exe -projectfiles` process through CIM. PIDs **75472** and **52964**, command lines and creation times are in [host events](host-events.jsonl). It then applied a real `WorkspaceEdit` to disposable `.clang-format` and saved through VS Code while UBT remained active. No shared engine configuration fault injection occurred.

First comparison error: expected raw baseline plus an LF suffix, while VS Code correctly normalized inserted lines to CRLF. Baseline, observed bytes and event text independently showed the edit survived. The harness was corrected to compare post-save bytes against post-UBT bytes, then rerun in a fresh idle host. The successful rerun has `savedEditSurvives=true` and `savedTextMatchesDisk=true`; the earlier false result remains in raw events. Two comment insertions are intentionally retained in the disposable file.

Visible native VS Code UI showed **Unreal regeneration: Conflict. Automatic restoration refused…** and its recovery location. An initial test-driver alias `unrealSetup.doctor` was invalid; the harness was corrected, and the actual **Unreal: Diagnose Project** / `unrealSetup.diagnose` command was run through the native command palette. Its output contains the recovery root and `[CHECK] Last preservation: Conflict`; see [extension output](extension-output.log). This was a harness error, not a removed/renamed product command.

The build used the unchanged normal `Build.bat Phase3AIntegrationEditor Win64 Development -Project=<descriptor> -WaitMutex -NoHotReloadFromIDE` workflow. [UBT log](ubt-build.log) reports **MSVC 14.50.35739** (toolset folder 14.50.35717), **SDK 10.0.22621.0**, UE **5.8.4**, `Result: Succeeded`, and **41.92 s** UBT execution time. [Last real generation log](ubt-generation.log) preserves generator output. No Editor/debugger launch was needed or performed; Phase 3B.3 was not started.

## Integrity, recovery and performance

[Integration summary](integration-summary.json) verifies **412 stored baseline/observed blobs** against recorded SHA256 values across four transactions. JSON metadata/document copies are archived under `recovery-metadata/`; original blob files remain in the ignored host storage. Metadata copies are not a substitute for those blobs.

Of 39 initial protected files, **eight have different final bytes**: project compile-command JSON files, project C++ provider configuration, `.clang-format`, `.ignore`, and three engine VS Code provider/compile-command JSON files. Current inventory contains 59 files, including new generated response files. Descriptor/source/config assets were not intentionally changed; `.clang-format` has the controlled comments. **The old C++ provider configuration is recoverable but was not automatically restored.** This is a real invariant-C compatibility limitation, not unexpected extension rollback or a passing preservation result. See the exact changed-path list in the summary.

Measured transaction pipeline time outside the managed UBT interval: approximately **0.676–0.879 s** across these four small-fixture runs. This includes pre/post inventory, copied/flushed recovery data and observation handling; it is not a pure CPU estimate and excludes the final result-manifest flush. Artifact budgets before that final manifest were **2.27–3.27 MB** per transaction (decimal). The prior Phase 3A 6.56 s ordinary generation is historical and used unsafe automatic restoration; these few samples do not establish statistical speed improvement/regression. No full-engine benchmark, cache optimization or event-loop delay profile was performed.

## Cleanup

All three test hosts closed through the bounded driver/VS Code close-window command, with root PIDs **50144**, **15732**, **61032** returning exit 0. A final read-only CIM check found no Code, UnrealEditor, UnrealBuildTool, dotnet or cl processes. No uncertain process or force kill was used. Root/descendant lifetime guarantees across host reload remain P1.2 limitations, not certified by this idle cleanup observation.

Fixture, private profile, recovery copies and test tools are retained under the existing narrow ignore rule. One duplicate metadata copy created by an initial summary filter error was removed only after confirming equal operation IDs; all four actual recovery transactions remain. [Cleanup evidence](cleanup.json), [owned host ledger](owned-processes.jsonl). No original RPGX content was accessed or modified in this phase. No engine source modification, migration, install, packaging or publication occurred.
