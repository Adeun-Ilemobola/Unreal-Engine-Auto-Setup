# Changes

Changes relative to this run's [initial hashes](initial-hashes.json), preserving inherited dirty work:

- `unreal-auto-setup/generationRecovery.js`: separate timestamp-only observations from content/identity conflicts; bounded filesystem activity receipts; bounded read-only validation of existing recovery intent/results, including schema, operation identity, partial/linked/oversized/contradictory records and shared-engine conflict matching.
- `unreal-auto-setup/generation.js`: refuse unresolved recovery before launching UBT; persist filesystem receipt/compact summary and metadata observations; retain exact project/stale state and dispose watchers on completion/error. No protected target writes or process-recovery feature.
- New `tests/generation-preservation.test.js`: **17** deterministic regressions covering metadata-only touches, repeats, unresolved/corrupt records, read failures, scope, quotas, watcher limitations and persistence failure.
- Existing `tests/generation-recovery.test.js`: strengthen interrupted/conflicting retry expectations to Blocked/no launch. Original journal-byte survival assertions remain. New repeat-success uniqueness/quota tests retain the previous independent-journal coverage. No prior test removed.

The original ordinary-preservation test and saved-edit regression are unchanged. The former still fails normally; no skip/TODO or weakened assertion.

New bounded tools under `tools/phase3b1b/`: actual Windows atomic/lock probe, private-host launcher/driver, and protected-file capture helper. They operate only on the retained fixture and related installed executables. The atomic candidate was **not adopted** as production restoration. Previous tools/reports were not edited.

Created six required reports, prompt archive, starting/final status/hashes, test logs, launch specifications, real UBT/output/events, copied current recovery metadata, atomic/source inspection evidence and cleanup/integrity records. Updated developer guide and maintenance index. Existing ignore rule unchanged; test profiles/probes/blobs remain under the ignored fixture and outside packaged runtime.

Compatibility: same CommonJS architecture, 39 runtime modules, ID/version/commands/settings/default automation, creation/dependency/Live Coding behavior. Additive internal preservation fields only. Timestamp-only activity can now return observed Unchanged when current bytes/identity require no restoration. Prior content conflicts instead block generation until reviewed; Manual Build remains available and passed natively.

No dependency installation, release build/package, global extension replacement, source-engine modification, RPGX operation or migration. Keep unresolved journals when reviewing/rolling back this phase; never reset inherited changes wholesale to HEAD. No automatic restoration/replay/expiration or process termination was added.
