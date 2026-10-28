# Real integration — Phase 3B.1b

**Ordinary preservation acceptance failed. Saved-edit refusal/recovery and build checks passed within their stated scope.** All numbers below are current execution, not reused Phase 3B.1 results.

## Environment and isolation

Reused `C:\Dev\VSCodeTools\unreal-auto-setup\.local-test-projects\Phase3AIntegration`, verified its ownership marker and existing narrow Git ignore rule. No project recreation/deletion, RPGX operation or engine migration.

Actual installed Epic UE **5.8.4**, CL **58902052**; VS Code **1.143.1**, embedded Node **24.21.0**; maintained source **local-tools.unreal-project-tools 0.8.0**; existing cpptools **1.35.4** and Skybox **0.1.2** development paths. No extension/software installation or personal profile modification. Fresh private test user-data directories set only `unrealSetup.autoSetup=false` and the window title; trust was already true on activation, with no security control changed.

Exact launch specifications: [prior-host](prior-host-spec.json), [ordinary-host](ordinary-host-spec.json), [saved-host](saved-host-spec.json). Executed using `node tools/phase3b1b/run-owned.cjs <spec>`. Their Code.exe `--new-window --wait`, private user-data/extensions paths and explicit source/companion/driver development paths are retained verbatim. Independent private stores isolate tests; no old unresolved journal was cleared or marked resolved to run a later test.

The driver invokes real contributed commands in a real interactive Development Host. Before/after hashes are collected separately by the read-only capture helper; helper inspection is not substituted for command execution.

## Actual requests and outcomes

| Request | Execution | Preservation/observation | Command time |
| --- | --- | --- | --- |
| `3b1b-prior-unresolved` | NotStarted | Blocked on four retained Phase 3B.1 conflicts; no new transaction/UBT | 61 ms |
| `3b1b-ordinary-generate` | Succeeded, exit 0 | **Conflict; seeded provider not restored** | 5.402 s |
| `3b1b-ordinary-repeat` | NotStarted | Blocked on the unresolved current transaction | 28 ms |
| `3b1b-saved-edit` | Succeeded, exit 0 | Conflict; saved bytes survive exactly and match saved document text | 5.766 s |
| `3b1b-build` | Succeeded, exit 0 | Phase3AIntegrationEditor / Win64 / Development | 23.374 s |

The initial ordinary fixture configuration was deliberately set through a real WorkspaceEdit/save to valid version-4 C++ properties using `configurationProvider=skyboxlabs.unrealengine-tools`. Its previous content is separately retained in [provider-before-seed.json](provider-before-seed.json); the test baseline contains the seed. UBT replaced it with generated configuration. The generated JSON parses, but `seededProviderStillConfigured=false`: valid generated JSON does **not** count as preserving the original provider.

Generation used the unchanged installed command:

```text
C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.exe
-projectfiles -project=c:\Dev\VSCodeTools\unreal-auto-setup\.local-test-projects\Phase3AIntegration\Phase3AIntegration.uproject -game -progress -vscode
```

The saved-edit driver first observed a real project-associated UBT PID/command/creation date, then inserted one `# Phase3B1b controlled saved edit` comment into disposable `.clang-format` using WorkspaceEdit and saved while execution was active. Post-save bytes were compared with post-UBT bytes, preserving CRLF correctly. Both `savedEditSurvives` and `savedTextMatchesDisk` are true. No shared engine conflict injection occurred. [Host events](host-events.jsonl) retain the full execution boundaries.

Native VS Code UI showed Conflict/recovery-path warnings, then Blocked/unresolved-recovery warnings. Existing Diagnose Project was executed through the real command service; [ordinary output](ordinary-extension-output.log), [saved output](saved-extension-output.log) retain messages. No test-driver request errors were recorded.

## File and filesystem evidence

[Ordinary before](ordinary-before.json), [ordinary after](ordinary-after.json), [saved before](saved-before.json), [saved after](saved-after.json): **59 protected files per snapshot**. Original byte copies are in the ignored `phase3b1b-baseline-*-before/transaction-0` directories.

Ordinary run: **six original files differ in bytes**—project compile-command JSONs, project `c_cpp_properties.json`, project `.ignore`, and engine compile-command JSONs. Fourteen timestamp-only differences no longer create content conflicts. **The original provider is recoverable, not automatically restored.**

Saved-edit run: **six original files differ**—project/engine compile-command JSONs, project `.ignore` and the intended `.clang-format` comment. Descriptor/settings/tasks/source were not rewritten by this preservation implementation.

Bounded receipts recorded **65** ordinary and **69** saved-run filesystem deliveries, with no known watcher error/drop. The records distinguish delivered time and delivery phase, not the true write timestamp/actor. `complete=true` is only no known delivery gap; `writerIdentityKnown=false` explicitly prevents provenance inference. Snapshot manifests retain identities and UTC-related stat metadata; document JSON retains observed versions/text.

**236** baseline/observed recovery blobs were rehashed against their manifests. Metadata/receipts are copied under `recovery-metadata/`; actual blob files remain in the corresponding ignored private profiles. Earlier Phase 3B.1 recovery files are independently hashed and preserved. [Summary](integration-summary.json), [integrity](integrity-check.json).

Measured pipeline work outside the managed UBT interval was **0.748 s** and **0.751 s**, including bounded storage checks/snapshots/watch receipts. These are two warm small-project samples, excluding final result flush, not a benchmark distribution or proof of speed improvement over historical results. No full-engine scans or optimization work.

## Compilation and cleanup

Manual build used normal `Build.bat Phase3AIntegrationEditor Win64 Development -Project=<descriptor> -WaitMutex -NoHotReloadFromIDE`. [Current build log](build-ubt.log): UE **5.8.4**, MSVC **14.50.35739** (directory 14.50.35717), SDK **10.0.22621.0**, `Result: Succeeded`, UBT **22.11 s**. [Ordinary generator log](ordinary-ubt.log), [saved generator log](saved-ubt.log).

Owned host PIDs **46512**, **13288**, **77692** exited normally with code 0; no force termination. Final relevant Code/Editor/UBT/dotnet/cl query and recorded-parent descendant query were empty. [Ledger](owned-processes.jsonl), [cleanup](cleanup.json). This does not certify cross-reload tree ownership; P1.2 remains unchanged. No Editor/debugger launch or Phase 3B.2/3B.3 experiment.

Fixture, probes, profiles, generated outputs, recovery and the controlled comment remain retained and ignored. No old reports or recovery evidence were deleted. The main automatic-preservation acceptance target is still failed; two UBT exit-zero results are not promoted to successful preservation.
