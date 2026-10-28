# Preservation strategy and established boundary

**Full automatic restoration is not established.** The production policy continues to leave ambiguous changed targets untouched, preserve available versions and report Conflict. This document records executed investigation and implemented safe corrections, not a proposal relabeled as completion.

## Why ordinary runs conflict

`generationRecovery.differences` previously combined byte/identity differences and timestamp-only rewrites. Real UBT writes into the live project and engine `.vscode` directories; it does not return a per-write authenticated ownership receipt. Ordinary and external writes can therefore produce indistinguishable before/after snapshots and coalesced/quiet watcher histories.

Installed source inspected read-only, with hashes in [isolation-inspection.json](isolation-inspection.json):

- `VSCodeProjectFileGenerator.WritePrimaryProjectFile` derives project `.vscode` from `PrimaryProjectPath`, calls `WriteWorkspaceIgnoreFile`, `WriteCppPropertiesFile`, `WriteWorkspaceFile`, and can write installed-engine `.vscode` for foreign projects with included engine source.
- `WriteCppPropertiesFile` writes `c_cpp_properties.json`; compile commands and response files also live under that output directory. `NoCompileCommands` changes compile-command work, not the overall live write destination. `UseVSCodeExtension` does not provide a verified isolation boundary.
- `ProjectFileGenerator.PrimaryProjectPath` derives from project identity. `bGeneratingTemporaryProjects` is enabled by the Xcode generator, not established as a supported VS Code CLI redirect. No speculative output flag or copied-project/engine workaround was adopted.

Real ordinary test: 59 protected files before/after; six byte differences, 14 metadata-only observations, 65 delivered filesystem events. The seeded project provider changed from Skybox to generated configuration. Settings/tasks/descriptor/clang-format were not byte-modified by that ordinary run. The exact byte-difference list is in [summary](integration-summary.json).

## Rejected Windows primitives: actual experiment

`tools/phase3b1b/atomic-probe.ps1` ran built-in .NET file APIs only on new disposable probe files. [Actual output](atomic-probe.json):

| Case | Live after File.Replace | Backup after File.Replace | Conclusion |
| --- | --- | --- | --- |
| Ordinary generated content | Original configuration | Generated content | Primitive can restore with a backup. |
| External save immediately before replacement | **Original configuration** | **Newer user content** | Backup survives, but newer live content is still replaced; automatic conflict-free success would be false. |
| Exclusive write handle | Competing write rejected | No attribution | The same exclusion also blocks the generator, so it cannot transparently permit ordinary UBT writes while excluding user writes. |

There was no destructive race against shared engine configuration. The probe is not a real UBT test and not proof that every possible platform solution is impossible. It falsifies adopting atomic backup or a blanket lock **alone** as the missing preservation contract.

For observed data `baseline=B, current=X`, a generator writing X and an external editor writing X can have the same hashes, metadata, shape and watcher deliveries. Those observations cannot justify taking different ownership-dependent actions. A generated-looking JSON shape is also not a writer identity. An unobserved intermediate edit already overwritten by UBT cannot be reconstructed from final bytes.

The missing guarantee is a verified isolated generator write destination or producer-authenticated/honored write protocol, followed by a validated identity/concurrency-safe publication operation. A plain check/recheck/write is not atomic compare-and-swap. No implementation here claims all external races are prevented.

## Implemented behavior

1. Persist bounded baseline bytes/absence/identity and editor observations before UBT, retain existing in-host mutation exclusion, and recheck workspace/selection/trust.
2. Before starting a new transaction, inspect bounded existing slots in the same extension recovery store. Incomplete/corrupt/current-project conflicts or relevant shared-engine conflicts block launch. Valid unrelated project-only conflicts do not block another project. Undecipherable records fail closed because affected resources cannot safely be excluded.
3. Watch only the project root nonrecursively, project `.vscode` recursively and engine `.vscode` recursively. Filter delivered filenames to protected paths. Default cap: 256 events, 16 error messages; persistence uses the existing 32 MiB transaction budget. No full-engine scan or general watcher architecture change.
4. Record delivered time/sequence/type/path and **delivery phase**, never inferred write time or actor. `complete=true` means no **known** watcher setup/error/drop; coalescing and unobserved events are still possible. Quiet watching never authorizes a target write.
5. After the existing managed completion signal, capture current bytes. Equal bytes with unchanged identity require **no restoration**; timestamps are retained as observations, not content conflicts. Changed bytes, identity, type, deletion, dirty/editor versions and I/O uncertainty remain conflicts/recovery failures. Same-length/timestamp-spoofed byte changes still conflict.
6. Persist `filesystem.json`, execution and preservation separately. Data/telemetry persistence failure cannot become full success. Dispose subscriptions/watchers and retain stale state on unsuccessful preservation.

Unchanged here is an observed content state, not proof that no transient external writer existed. No protected file is rewritten by these corrections. Failure/cancellation, links and workspace switch continue to refuse unsafe restoration. No process ownership/reload recovery/termination code was added; P1.2 remains unresolved.

## Recovery and compatibility limits

Storage/retention remains [the Phase 3B.1 bounded recovery format](../0005-phase3b1-2026-10-27/RECOVERY_BEHAVIOR.md): baseline/observed blobs, document versions, immutable intent/result and now filesystem receipts. Maximum 32 slots, 8 MiB/file, 16 MiB/snapshot, 32 MiB/transaction; unresolved records are never automatically deleted. The earlier records remain byte-preserved.

Open the reported files in VS Code, verify operation/project paths, compare/export all needed versions to new unused files, and explicitly resolve the live configuration. Only then reclaim the specifically identified resolved slot under the existing manual retention policy. Do not edit a Conflict into Unchanged to bypass review. An incomplete record is not proof that a process exited.

Stores are per test/profile context; independent fresh profiles were used for independent tests. That does **not** resolve previous profiles' conflicts or establish cross-profile/process ownership. Same-user metadata tampering is not treated as a security boundary.

The ordinary automatic-preservation assertion is still failed. Build/Run stages requiring successful generation continue to stop on a conflict; manual compilation passed. Keep this acceptance gate explicit rather than promoting recoverability, filesystem hints or successful UBT exit to full preservation.
