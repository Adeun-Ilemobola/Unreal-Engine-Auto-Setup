# Regeneration safety contract

Status: **partial P1.1 implementation; invariant C remains blocked**. This is a conservative refusal/recovery implementation, not full conflict-safe automatic restoration and not release-ready acceptance of all requested guarantees.

## Implemented guarantees

| Invariant | Implemented contract |
| --- | --- |
| A: no silent destructive restoration | The generation transaction and compatibility `restore` helper never write/delete/rename a protected target. A changed, deleted, replaced, linked or unreadable path is left alone. This eliminates the extension's old snapshot-over-newer-edit overwrite. |
| B: recoverable ambiguity | Baseline disk bytes are copied and file-synced before UBT. Observed post-run bytes and VS Code document text/version/dirty observations are stored separately. All observed modifications are ambiguous; hashes, times, identity and events never establish writer provenance. Missing/unreadable content is labeled, not invented. |
| C: ordinary configuration preservation | **Not met when UBT changes configuration.** Unchanged ordinary generation succeeds, but changed ordinary generation reports Conflict and leaves UBT output in place with recoverable baseline copies. The existing automatic-restoration assertion remains a normal failing acceptance test. |
| D: failure/cancellation safety | No finally-block restore on failure, rejection or cancellation. Execution status/exit code remains separately recorded. In-host generation exclusion stays held until the existing managed completion promise settles. |
| E: operation identity | Immutable records contain a random operation ID, exact descriptor and engine paths. Workspace/selection/trust changes cannot redirect a restore because no restore occurs. Stale metadata is not cleared on a conflict. |
| F: no fabricated guarantee | No supported general UBT output isolation was established. This implementation does not prevent UBT/external tools from overwriting an unobserved intermediate edit. It does not certify complete process-tree exit or cross-window/reload ownership. |
| G: correct result | `execution` describes UBT separately; `preservation` is Unchanged, Conflict or RecoveryFailed. UBT exit 0 with a conflict has overall `success=false`. Automatic dependent builds are skipped by the existing runner/coordinator. |

Protected scope: recursively bounded project `.vscode/**`, selected `.uproject`, `.clang-format`, `.ignore`, root `*.code-workspace`, and the resolved engine `.vscode/**`. Known absent paths and directory identities are recorded. New protected paths are observed conflicts, not deletion/rollback candidates.

Before launch, initially dirty project documents are refused; protected snapshots reject symlinks/hard links/unsupported files, unstable reads and exceeded limits. A second read comparison, observed document changes and workspace/trust/selection checks can abort before launching UBT. These checks reduce uncertainty; they are not exclusive filesystem locks or atomic compare-and-swap.

Cooperating module/plugin/class commits, setup file/settings writes and engine-setting writes use short in-host resource exclusions. Generation claims the project root and shared engine `.vscode` resource. Unrelated project mutations can proceed when resources do not overlap. No lock is held through a creation preview/confirmation dialog. These exclusions do not coordinate other VS Code windows, aliases not represented by the same canonical path, Skybox or external processes.

## Limits and manual intervention

- Unchanged means **observed unchanged**, not proof that no transient writer existed. No filesystem watcher is presented as a writer-identification mechanism.
- Disk snapshots are bounded reads checked against file-handle and path metadata. Path/identity checks are not a defense against a hostile same-user process racing all checks; no protected path is written through them.
- Document events capture observed editor text, not original disk encoding/bytes. Closed/external/transient edits and events after host death may be missed. Disk bytes and document text are labeled separately.
- Before-launch journal failure aborts. After-launch persistence/read failure reports RecoveryFailed/Conflict and retains available files; it cannot recover bytes it never captured. Files are synced individually; power-loss atomicity across multiple files/directories is not certified.
- Interrupted journals are retained for manual inspection. There is no automatic restoration/replay, durable process claim, stale-PID kill or cross-reload unblock mechanism. P1.2 is unchanged.
- Ordinary UBT can replace C++ provider configuration. This fallback leaves that generated configuration current and exposes the original copy for review; it does not silently claim the provider was preserved. Real integration reproduced this compatibility limitation.

The full completion gate is a validated generator isolation/publishing contract or a separately established synchronization/atomic preservation protocol that meets ordinary preservation without erasing concurrent content. A plain read/hash/recheck/write sequence is insufficient. The prior Phase 3B.0 no-ambiguous-overwrite contract is the implemented safe subset under the latest prompt's explicit partial-improvement stop condition; the broader acceptance claim remains open.
