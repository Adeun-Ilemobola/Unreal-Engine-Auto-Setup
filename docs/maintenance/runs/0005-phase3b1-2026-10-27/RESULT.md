# Phase 3B.1 result

**P1.1: Partially complete. Full automatic-preservation acceptance is blocked.** Safe independent implementation and authorized validation are finished; this is not a claim that all requested invariants pass or that the change is release-ready.

Starting/final branch `main`, HEAD `dc91401b7e9eed159de80cc96713e58dfdd0a3e1`; no commits, resets or removal of inherited changes. Extension remains **local-tools.unreal-project-tools 0.8.0**, 35 public commands and five settings. [Starting status](initial-status.txt), [exact prompt](../../prompts/0005-phase3b1-regeneration-v1.md).

The starting implementation's finally restoration reproduced the saved-descriptor overwrite. Exact starting bytes were reconstructed from HEAD plus the inherited cancellation-hook additions, **verified against the pre-edit SHA256**, and executed in an isolated VM without reverting production. [Starting source](starting-generation.js.txt), [expected failing probe](baseline-probe.txt). The original saved-edit regression now passes with its assertion unchanged.

Implemented a conservative no-protected-write transaction: bounded, file-synced original/observed recovery copies; labeled VS Code document versions; absence/identity/error records; explicit Conflict/RecoveryFailed outcomes; separate UBT execution result; in-host exclusion for cooperating project/configuration writers; warnings, history and Doctor recovery paths. No writer is inferred from a hash, timestamp or event. See [changes](CHANGES.md), [safety contract](SAFETY_CONTRACT.md), [recovery instructions](RECOVERY_BEHAVIOR.md).

**Remaining essential failure:** no supported general UBT output isolation or validated atomic preservation protocol was established. Automatically restoring an ambiguous changed target is unsafe. UBT's ordinary rewrites therefore remain current and are reported as conflicts, with prior configuration recoverable. This fails invariant C, including preserving the existing C++ provider automatically. Its original assertion remains a **normal failing acceptance test**, not a weakened assertion or TODO. This partial safer fallback follows the prompt's explicit stop condition; P1.1 is not Complete.

## Current evidence

- **45 new deterministic regressions**; full Node suite: **408 total, 407 passed, one failed, zero skipped/TODO**, exit 1. The sole failure is automatic configuration restoration. All new recovery tests and the original saved-edit assertion pass. [Final log](node-suite-final.txt).
- Python **four passed**; syntax **83 JS/CommonJS files passed**; packaging preflight **45 inputs / 39 modules / three document mirrors** passed. Public manifest bytes/export names retained. [Validation](VALIDATION.md).
- Real VS Code 1.143.1 / UE **5.8.4**: **four UBT generations exited 0**, all accurately reported preservation Conflict. A real saved WorkspaceEdit survived byte-for-byte on a corrected CRLF comparison rerun. A subsequent **Win64 Development Editor build passed**, UBT 41.92 s, MSVC 14.50.35739 / SDK 10.0.22621.0. [Integration](INTEGRATION_RESULTS.md).
- Observed transaction work outside the managed UBT interval: approximately **0.676–0.879 s**, with **2.27–3.27 MB** of recovery writes before final result flush per sample. These are small-fixture wall-time samples, not event-loop profiling or statistical benchmarking.

Fixture/recovery copies remain retained and ignored. Four transactions have **412 verified baseline/observed blobs**. Eight initial protected files differ after authorized UBT execution/test edits; exact paths and originals are recorded. All three owned hosts closed normally and the final relevant-process query was empty. No uncertain termination, Editor/debugger session, RPGX access/change, migration, engine-source edit, installation, release packaging or publication occurred.

## Remaining work

Resolve the P1.1 ordinary-preservation gate through proven supported isolation/publishing or a validated synchronization/atomic recovery protocol; keep the failing test until its actual assertion passes. Do not deploy this partial fallback as fully compatibility-preserving regeneration.

P1.2 remains partial: existing completion is wrapper-based, ownership is volatile across hosts, and in-host exclusion is not cross-window/tree-lifetime proof. Phase 3B.2 needs durable quarantine/identity and validated complete-tree boundaries before automatic recovery. Phase 3B.3 detach/reattach remains unverified. **Neither phase was started.** No additional system-wide approval was used. Stop here.
