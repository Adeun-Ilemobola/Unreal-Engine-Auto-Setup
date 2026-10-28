# Phase 3B implementation handoff

**Preparation complete; implementation has not begun.** Start a new, explicitly scoped implementation session. Preserve the existing dirty checkout; do not reset or replay prior phases.

## Baseline and unresolved issues

Branch `main`, HEAD `dc91401b7e9eed159de80cc96713e58dfdd0a3e1`. Extension `local-tools.unreal-project-tools` remains **0.8.0**, with 37 flat CommonJS runtime modules, 35 commands and five settings. Existing Phase 1/2/3A changes are uncommitted. See [initial status](initial-status.txt).

Historical Phase 3A environment: Launcher UE **5.8.4**, VS Code **1.143.1**, MSVC **14.50.35739**, Windows SDK **10.0.22621.0**, cpptools **1.35.4**, Skybox **0.1.2**. Real generation, builds and basic attach were exercised there. Historical Node result: 363 tests, 362 passed, one TODO; Python: four passed. None were rerun for this documentation-only task.

- **P1.1 blocked:** restoration may overwrite a concurrent edit. Hashes cannot identify its writer; UBT may itself overwrite an edit before the extension observes it.
- **P1.2 partial:** cancellation/gates work within a host, but ownership metadata is volatile. Root-wrapper exit does not prove descendant exit; no durable cross-reload recovery exists.
- **Debugger lifecycle unverified:** basic attach passed; generic Stop was followed by one Editor disappearance of unknown cause. Clean nonterminating detach and same-process reattachment are not proven.

Retained fixture: `C:\Dev\VSCodeTools\unreal-auto-setup\.local-test-projects\Phase3AIntegration`. Narrow ignore rule remains effective; fixture source/configuration hashes are unchanged. Do not recreate/delete it. RPGX remains unchanged and is not an implementation test fixture.

## Packages and recommended sequence

1. **Start with 3B.2A: durable quarantine and recovery classification**, using injected stores/process observations and harmless mocks only. [Process design](PROCESS_RECOVERY_DESIGN.md) specifies prior intent, operation identity, project/engine claims, crash windows and acceptance. This minimum is ready: unresolved records block overlapping operations after reload; no automatic kill, TTL release or PID-only recovery. Full P1.2 closure still requires proven tree containment/exit and an independently validated Windows adapter. A harmless descendant/supervisor experiment is the next gate, never deliberately orphan real UBT.
2. **3B.1: regeneration preservation**, following [regeneration design](REGENERATION_DESIGN.md). Pure recovery journal/conflict-classifier work is separable. Full implementation is conditional: first establish a supported output-isolation/publishing boundary, or obtain explicit approval for the described conservative recovery behavior change. A plain hash/check/write sequence is not atomic compare-and-swap. No ambiguous target overwrite; preserve every captured version/tombstone and report conflict separately from tool exit. Live generation later consumes shared claims and confirmed tree completion from 3B.2. The existing P1.1 TODO must not be weakened to declare success.
3. **3B.3: debugger lifecycle**, independently executable using [exact test plan](DEBUGGER_TEST_PLAN.md). Future harness work must verify explicit disconnect routing and outgoing `terminateDebuggee: false`; then perform two cycles against the same owned Editor identity and ordinary close. It does not depend on solving regeneration or build recovery. No live test was performed in 3B.0.

Each detailed specification contains evidence, assumptions, changes, allowed/prohibited operations, dependencies, stop conditions and acceptance. Keep these as independent milestones; quarantine or recoverable snapshots alone do not close the broader safety issues.

## Source boundaries and verification

Relevant runtime files under `unreal-auto-setup/`: `generation.js`, `build.js`, `runtimeCoordinator.js`, `runner.js`, `extension.js`, `debugger.js`; creation/setup/settings paths are cooperating descriptor/config writers. Use focused adapters and injected seams; preserve command IDs, settings, exported compatibility and v0.8.0. Future module additions must follow `docs/DEVELOPMENT.md` packaging/source-list rules. Avoid a broad rewrite.

Future verification commands, from the repository root (not executed in 3B.0):

```powershell
node --test unreal-auto-setup/tests/generation.test.js unreal-auto-setup/tests/generation-conflict.test.js
node --test unreal-auto-setup/tests/build-lifecycle.test.js unreal-auto-setup/tests/debugger.test.js
npm --prefix unreal-auto-setup test
python -B bundle_sources.py
python -B -m unittest discover -s tests -p 'test_*.py' -v
git diff --check
git check-ignore -v -- .local-test-projects/Phase3AIntegration/Phase3AIntegration.uproject
```

Add the new crash/identity/concurrency regressions specified by each design, then run their focused tests before the full suite at implementation completion. Retain source-level versus real-host results separately. Full acceptance requires the package-specific real observations where stated; mocks cannot certify Windows tree ownership, UBT write boundaries or debugger detach.

## Scope and approvals

The present prompt permits preparation only. A later named implementation request must authorize leaving this boundary. Existing Phase 3A permissions cover ordinary disposable creation/build/launch/integration testing, not destructive or uncertain process experiments. Stop before installs/updates, global registry/environment changes, privileged/native dependencies, engine-source changes/rebuild, RPG migration/content changes, unrelated project changes or publication. Do not silently expand to these operations. Preserve unresolved journals during rollback; do not restore availability by deleting ownership evidence.

Next-session starting instruction: **Implement only the 3B.2A durable quarantine/classification milestone with deterministic tests; keep automatic termination/recovery and real UBT/Editor execution out of scope until their stated gates are resolved.**
