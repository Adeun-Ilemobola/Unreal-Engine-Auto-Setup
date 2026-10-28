# Phase 3B.2 result — partially complete

Date: 2026-10-28 UTC. Branch `main`; starting HEAD `251fd3905e6e9daf832a38cee1dd724358f4e283`, initially clean. No commit, reset, rebase, publication, engine-source edit or RPGX operation.

Implemented and tested durable quarantine across a real extension-host reload. This does **not** close P1.2 or satisfy all Phase 3B.2 acceptance criteria. The source changes are a conservative development milestone, not release-ready automatic process recovery.

**Material availability limitation:** after any managed spawn attempt the claim remains, even after exit 0 or cancellation. Subsequent managed builds/regeneration for that descriptor are blocked. Only positively unspawned work can be automatically released. Do not deploy this checkpoint expecting ordinary repeat Build/Run behavior. A verified full-tree completion boundary is still required.

Recovery retains random operation identity, canonical descriptor, launch intent, optional exact wrapper identity and root-exit observation. Recovered cancellation is refused. No missing PID, clock age, wrapper close or lost event proves tree exit or build success. Existing same-host taskkill cancellation is retained and tested; its PID-to-handle race and descendant-completion limitation remain unresolved. No new guarantee is asserted for that path.

Cross-window claim tests establish one winner for the same canonical descriptor and storage root. Other profiles/stores/users/machines, shared-engine generation across projects, external builds and Skybox are outside this coordination boundary. Unresolved records never expire. Admission scanning stops at 256 entries; concurrent distinct-project admission can exceed the threshold. This is a bounded inspection policy, not a strict globally atomic quota.

Final Node: **435 tests, 434 passed, one unchanged P1.1 failure**, no skips/TODO. Ten new ownership tests pass. Python four pass. Syntax, imports/exports, manifest, packaging and whitespace checks are in [VALIDATION.md](VALIDATION.md).

Real VS Code 1.143.1 / extension 0.8.0: host PID changed 76744 -> 61008, claim survived, Build was Blocked and UI reported Recovery blocked. Root was observed absent after reload; no guessed completion or recovered kill. Real UBT ordinary up-to-date build exited 0, 1.53 seconds. UBT reload was withheld because no verified compiler-tree recovery plan exists. Editor survival with a live Editor was not tested; no Editor was launched or terminated. The fixed reload host closed via its driver; initial-host UI cleanup was later confirmed by the final targeted process query, which found no test child or task-profile processes. See [integration evidence](INTEGRATION_RESULTS.md).

Stop condition: the installed synchronous PowerShell wrapper exposes no complete descendant lifetime boundary. A Windows Job Object supervisor is a plausible next experiment, not a proven solution or an impossibility result. Full-tree containment, normal completion release, identity-safe cancellation, strict storage bounds, safe user recovery UI and successful subsequent managed operation remain before full acceptance. Phase 3B.3 was not begun; establish a stable repeatable Build/Run fixture and complete the missing lifecycle boundary before debugger detach/reattachment validation.

[Exact prompt](../../prompts/0007-phase3b2-v1.md), [contract](PROCESS_OWNERSHIP_CONTRACT.md), [matrix](RELOAD_RECOVERY_MATRIX.md), [changes](CHANGES.md), [final status](final-status.txt).
