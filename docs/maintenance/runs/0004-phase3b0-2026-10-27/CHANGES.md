# Changes

Documentation and evidence only, under maintenance ID `0004-phase3b0-2026-10-27`.

Created:

- [RESULT.md](RESULT.md): readiness, unresolved issues and next-session starting task.
- [REGENERATION_DESIGN.md](REGENERATION_DESIGN.md): current workflow, evaluated alternatives, recovery contract, isolation decision gate, algorithms and regression matrix.
- [PROCESS_RECOVERY_DESIGN.md](PROCESS_RECOVERY_DESIGN.md): durable intent/claims, identity, crash windows, quarantine, cross-window coordination and conditional containment experiment.
- [DEBUGGER_TEST_PLAN.md](DEBUGGER_TEST_PLAN.md): exact two-cycle workflow, necessary future harness changes, observations and stop conditions.
- [PHASE_3B_HANDOFF.md](PHASE_3B_HANDOFF.md): concise implementation entry point and future commands.
- [VALIDATION.md](VALIDATION.md): bounded inspection and integrity checks; no live execution claims.
- `initial-status.txt`, `baseline-hashes.json`, `fixture-hashes.json` and `integrity-check.json`: starting state and final comparison evidence; hash manifests preserve existing bytes by reference, not backup copies.
- [Exact effective prompt](../../prompts/0004-phase3b0-preparation-v1.md), copied from the supplied attachment without rewriting.

Updated [maintenance index](../../INDEX.md) with this run. Existing audit, decisions and Phase 1/2/3A reports were not rewritten. The pre-existing narrow fixture `.gitignore` rule was verified, not changed.

No production, manifest/version, packaging, test/harness, Unreal fixture or RPGX changes. No commits, resets, migrations, releases or software installation. Existing uncommitted changes remain in place.
