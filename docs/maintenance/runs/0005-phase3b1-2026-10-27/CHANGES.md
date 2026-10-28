# Changes and compatibility

Earlier uncommitted work is preserved. These changes are relative to [initial hashes](initial-hashes.json), not a clean HEAD checkout.

| Runtime file | Responsibility/change |
| --- | --- |
| `generation.js` | Remove blind finally restoration; capture/journal/execute/observe; separate outcomes; keep stale on conflict; exact project/selection/trust checks. Preserve exports; `restore` now compares/reports without writing. |
| New `generationRecovery.js` | Bounded reads/inventory, identities/absence, document observation, exclusive/file-synced artifacts and fixed-slot retention bound. |
| New `generationGuard.js` | Cooperative in-host project/engine-resource exclusions; no process recovery or global lock. |
| `runner.js` | Supply context recovery storage and present conflict warnings/logs. Existing coordinator prevents dependent build continuation after unsuccessful generation. |
| `creation.js`, `classFiles.js` | Acquire exclusion at commit; retain previews, trust/conflict validation, exclusive writes and rollback. |
| `core.js`, `engine.js`, `extension.js` | Short exclusions for setup file/settings and remember-engine writes; no lease through target-selection dialogs. |
| `diagnostics.js` | Recovery root and last preservation result in existing Diagnose Project output. |
| `contracts.js` | Additive execution/preservation/lastGeneration field documentation. |

Tests: new `unreal-auto-setup/tests/generation-recovery.test.js` contributes **45** tests. Existing generation/conflict tests receive explicit storage. The original newer-saved-edit assertion loses its obsolete TODO and passes. The original ordinary-preservation assertion remains unchanged and **fails normally**. `tests/helpers.js` gives mocked contexts scoped global storage. No tests were removed.

New bounded tools: `tools/phase3b1/host.cjs`, `run-owned.cjs`, `summarize.cjs`, `baseline-probe.cjs`. They use the existing fixture/isolated Code host and relevant executables. The baseline probe intentionally fails against verified archived starting bytes, outside the normal suite. Earlier tools/reports were not rewritten.

Created six required reports, exact prompt, before/after hashes, current test/build/generation/output logs, launch specs/events/ledger, recovery metadata copies and integrity/cleanup evidence. Updated maintenance index and developer guide. Existing narrow fixture ignore rule is unchanged. Generated/profile/recovery bytes remain ignored and outside runtime packaging inputs. No release archive was rebuilt.

## Behavior and rollback

**Changed protected targets are no longer restored automatically.** This removes destructive snapshot overwrites, but fails the old automatic-preservation behavior when UBT legitimately changes configuration. Generation returns overall false/Conflict with recovery instructions; automatic Build/Run stages requiring it stop. Manual Build passed real validation. This compatibility limitation is explicit, not a hidden pass.

Public ID/version, command IDs, settings/defaults, automation modes/Watch policy, companion requirements and Live Coding restrictions are unchanged. Original export names/literal imports remain valid; the dangerous `restore` helper's write semantics intentionally change. Unit coverage for unrelated creation/dependency/Undo/discovery/Run/automation passes; these workflows were not all repeated natively here.

Recovery is manual compare/export, bounded allocation and no expiry/replay. Preserve unresolved records during rollback. Never reset inherited work to HEAD; review only this run's changes. This partial result should not be installed into a personal profile or advertised as complete P1.1 preservation.
