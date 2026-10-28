# Conflict and acceptance matrix

**Full P1.1 completion is blocked by rows 1–3.** Source mocks, actual Windows primitives and real VS Code/UBT observations are separate evidence classes. [Strategy](PRESERVATION_STRATEGY.md), [source log](node-suite.txt), [integration](INTEGRATION_RESULTS.md).

| Requested case | Current outcome/evidence | Remaining boundary |
| --- | --- | --- |
| 1. Ordinary successful regeneration | UBT Succeeded/0, preservation Conflict in a real fresh host | **Acceptance failed:** execution success is not preservation success. |
| 2. Automatic restoration | Original unchanged test fails normally | **Not implemented safely; no unconditional restore reintroduced.** |
| 3. Existing C++ provider | Real Skybox provider seed was replaced by UBT; original is recoverable | **Not automatically preserved.** Untouched/equal-byte files need no restore. |
| 4. Repeated ordinary operations | Repeated unchanged unit operations succeed with distinct journals; real retry after Conflict is Blocked/NotStarted | A prior conflict cannot silently become a resolved baseline. No claim of two conflict-free real generations. |
| 5. Saved VS Code edit | Real WorkspaceEdit/save during observed UBT survived byte-for-byte; Conflict and versions retained | Demonstrated on disposable `.clang-format`; not proof that UBT cannot overwrite any other user edit. |
| 6. Unsaved editor modification | Existing document-version/text regressions pass; no target save/restore | Simulated API events; no new native unsaved-edit test. |
| 7. External file modification | Real disposable filesystem writes in unit fixtures stay current and conflict | Unobserved intermediate external edits already overwritten by UBT remain unprevented/unrecoverable. |
| 8. Save immediately before restoration | Before-finalization saved-edit regression passes because no restore is attempted | Actual Windows atomic-backup probe shows why replacement alone still moves the live user version. Automatic commit remains blocked. |
| 9. Extension-owned descriptor/module/plugin change | Existing commit exclusion tests pass | Cooperative in-host only; no OS-wide/cross-profile ownership claim. |
| 10. Replacement/deletion | Identity/type/absence conflicts; no target recreation/overwrite | Existing deterministic real-temp-filesystem regressions pass. |
| 11. Symlink/hard link | Unsafe read/write-through refused; baseline retained | Windows fixture tests run outside sandbox; not a hostile same-user filesystem defense proof. |
| 12. Failed UBT | Execution failure retained separately; no unsafe restore | Simulated tool failure in current suite; no destructive real UBT failure injection here. |
| 13. Cancelled UBT | No restore; data retained; unchanged failed/cancelled completed journals permit retry | Source/lifecycle tests only. No real UBT reload/orphan experiment. |
| 14. Recovery artifact failure | Pre-launch refusal/post-run RecoveryFailed; filesystem-receipt write failure cannot report success | Injected I/O, partial writes and unavailable metadata cases. |
| 15. Workspace/selection switch | Exact operation association, stale state and no target writes | Deterministic source tests; no new real workspace switch during UBT. |
| 16. Existing unresolved conflict | Real previous four journals and current retry block before UBT; corrupt/mismatched/incomplete records tested | Per recovery store; independent profiles do not resolve each other's records. |
| 17. Retention/cleanup | Original journals remain; slot bounds, no expiry/delete, immutable bytes and scoped artifact copies verified | Manual review/export/resolution required to reclaim slots. No new automatic merge/replay. |
| 18. Accurate statuses/diagnostics | Native Conflict warning, Blocked/NotStarted reason, filesystem hint counts and existing Doctor output | `writerIdentityKnown=false`; watcher completeness is not a provenance/safety proof. |

Additional new coverage: timestamp-only changes are metadata observations when current bytes/identity match; equal-length changed bytes remain a conflict even after timestamp reset. Shared-engine conflicts block projects using the affected engine; valid unrelated project-only records do not create a general global project lock. Unknown/corrupt records fail closed within the recovery store because their affected resources cannot be excluded safely.
