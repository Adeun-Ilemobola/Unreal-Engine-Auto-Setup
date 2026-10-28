# Phase 3B.1b result

**Automatic-preservation acceptance: Blocked, not Complete. P1.1 remains partially implemented.** The original ordinary-preservation test still fails with its assertions unchanged. No unsafe automatic restore was introduced to make it pass.

Branch and starting/final HEAD: `main`, `dc91401b7e9eed159de80cc96713e58dfdd0a3e1`. Existing uncommitted work remains; no commit/reset/clean. Extension remains `local-tools.unreal-project-tools` **0.8.0**, 35 public commands and five settings. [Initial status](initial-status.txt), [exact prompt](../../prompts/0006-phase3b1b-preservation-v1.md).

Ordinary conflicts have two causes: the previous classifier treated timestamp-only changes as content conflicts, and UBT actually overwrites live provider/compile-command/ignore/workspace configuration. The first is safely corrected without writing any target. The second still lacks a verified write-isolation/producer-ownership boundary. Hashes, output shape, timestamps and quiet watchers cannot identify the writer.

New executed evidence: Windows `File.Replace` restores a baseline atomically and backs up the displaced bytes, **but also replaces a late external user's live saved content**. An exclusive write lock blocks both user and generator writes. Neither primitive alone provides the missing distinction. Installed UE 5.8.4 source inspection established no supported general VS Code output-root redirect. See [strategy and missing guarantee](PRESERVATION_STRATEGY.md), [atomic probe](atomic-probe.json), [source inspection](isolation-inspection.json).

Implemented independent safe corrections:

- Equal current bytes with unchanged file identity no longer need a restore or a timestamp-only content conflict; metadata differences remain recorded.
- Unresolved/incomplete/corrupt recovery records block a new generation in the same recovery scope; unchanged retries cannot silently adopt unresolved generated configuration as the new resolved baseline.
- Bounded project/engine `.vscode` filesystem observations are persisted as hints, with delivery phase, limits/errors and `writerIdentityKnown=false`. They never authorize restoration.

## Current execution results

- **17 new tests. Full Node: 425 total, 424 pass, one fail, zero skips/TODO; exit 1.** The failure is the unchanged automatic-restoration acceptance test. Targeted: 67 total, 66 pass, same one failure. [Validation](VALIDATION.md).
- Python **four passed**; syntax **87 JS/CommonJS files passed**; preflight **45 inputs / 39 modules / three mirrors** passed. Public interfaces/export names retained.
- Real ordinary UBT execution exited **0**, but preservation remained **Conflict**; the seeded Skybox provider was **not preserved automatically**. This is a failed acceptance result, not a successful preservation claim.
- Real saved WorkspaceEdit bytes survived exactly; UBT exited 0 with Conflict. Existing-history and repeat requests were Blocked/NotStarted. **236 recovery blobs** verified. [Integration](INTEGRATION_RESULTS.md), [conflict matrix](CONFLICT_MATRIX.md).
- Manual **Phase3AIntegrationEditor Win64 Development** build passed, exit 0; UBT **22.11 s**, MSVC **14.50.35739**, SDK **10.0.22621.0**. Fresh VS Code **1.143.1** hosts ran maintained source and existing companions.

The retained disposable fixture remains ignored. Original project source/build-rule records and prior recovery evidence are checked separately in [integrity evidence](integrity-check.json). New provider-test setup, ordinary UBT outputs and one saved comment are retained with before/after copies. Three owned hosts closed normally; relevant-process and recorded-parent checks were empty. No uncertain termination, RPGX operation, engine-source change, migration, install, release packaging or publication.

## Stop condition and next requirement

No tested mechanism establishes both automatic restoration of ambiguous changed files and safe handling of unseen external writes. A verified generator-isolated destination or a producer-authenticated/honored write protocol with a safe publication boundary is still required. Atomic backup alone is recoverability, not writer attribution or live-edit preservation. No universal claim that isolation is impossible is made; none was established for the installed supported VS Code generator inspected here.

This run stops under the prompt's explicit safety stop condition. Phase 3B.1b is **not marked complete**. Keep the ordinary assertion failing until its actual behavior is implemented. Prior recovery remains accessible; inspect/export versions and explicitly resolve configuration before reclaiming a resolved slot. See [strategy/recovery](PRESERVATION_STRATEGY.md). Phase 3B.2 and 3B.3 were not started.
