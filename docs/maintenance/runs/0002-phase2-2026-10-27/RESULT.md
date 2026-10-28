# Phase 2 — Architecture and maintainability

Status: **Complete within the approved incremental scope**, 2026-10-27. No Phase 3 work begun. [Archived prompt](../../prompts/0002-phase2-maintainability-v1.md), [changes](CHANGES.md), [validation](VALIDATION.md), [developer guide](../../../DEVELOPMENT.md), [decision](../../decisions/0003-phase2-service-boundaries.md).

## Prerequisites and preserved baseline

Phase 1 validation/documentation was complete before Phase 2 started. Read its result/validation and the requested audit summary, code-quality, architecture and roadmap guidance; did not repeat the comprehensive audit. Re-ran baseline: 358 Node tests, 357 passed, 0 ordinary failures/skips, 1 executing TODO. P1.1 remains **Blocked** (regeneration can overwrite concurrent saved protected-file edits); P1.2 remains **Partially complete** (in-host cancellation/resource work implemented, reload ownership unresolved). P1.3/P1.4 retain their recorded statuses. These defects were not reclassified or speculatively repaired.

Initial/final branch: `main`. Initial/final HEAD: `dc91401b7e9eed159de80cc96713e58dfdd0a3e1`. No commits. Inherited uncommitted Phase 1 code/tests and untracked audit/maintenance docs were preserved. [Initial status](initial-status.txt), [initial hashes](initial-hashes.json), [final status](final-status.txt) and [Phase 2 changes to existing files](phase2-changed-files.txt) distinguish this phase from the inherited diff. SHA-256 checks confirm 47 protected baseline report/test/manifest files unchanged; the Phase 2 prompt is byte-identical to its attachment.

## Outcome

- Expanded dense runtime coordinator/watcher, runner, sidebar, dependency UI, activation and session code using a consistent local formatting configuration. Formatting writes checked syntax-tree equivalence; subsequent extractions/policy edits were reviewed and tested separately.
- Extracted runner's native view/status projection and command/dialog adapters to `runtimeView.js` and `runtimeCommands.js`. Runner retains workflow sequencing, launch checks and composition. No existing files moved or renamed; flat CommonJS layout retained.
- Added JSDoc contracts for project identity, service composition, metadata/source revisions, snapshots, operation hooks/results and cancellation acknowledgement versus completion. Added a focused ownership/flow/safety/development guide.
- Consolidated numeric association/minimum-version policy and lexical path containment, preserving existing compatibility exports. Corrected the reproduced immediate-parent containment divergence and Doctor mojibake, with focused regressions. Transaction-specific guards and conservative Build.cs parsing remain intact.
- Removed a redundant unused descriptor read and an unused internal callback argument; retained positional exported template compatibility. Replaced manual runtime packaging enumeration with a checked flat-source discovery rule and read-only preflight. Product documentation now has a checked mirror workflow rather than two editing authorities.

Final source structure: 37 top-level production CommonJS modules (32 existing plus `contracts.js`, `enginePolicy.js`, `paths.js`, `runtimeCommands.js`, `runtimeView.js`), existing `tests/` and media. Root additions are an optional formatter tool/config, `bundle_sources.py`, packaging fixture tests, and developer/maintenance documentation. No folders were migrated. See [developer guide](../../../DEVELOPMENT.md) for the grouped source map and flow diagrams.

## Validation and compatibility

Final `npm test`: **363 tests, 362 passed, 0 ordinary failures, 0 cancelled, 0 skipped, 1 TODO**; [full output](node-suite.txt). Five new Node tests pass. The TODO still fails the P1.1 desired preservation assertion; exit 0 is not regeneration acceptance. Four new Python packaging tests pass. Syntax checks pass for 71 JS/CommonJS and three Python files. Preflight confirms 43 package inputs, 37 runtime modules, literal local imports/entry point and three product-document mirrors. No archive-writing script was executed.

The activation integration fixture verifies all 35 contributed commands plus the existing internal `unrealSetup.applyDependency` action. The five settings, defaults, activation manifest, `local-tools.unreal-project-tools`, v0.8.0 and dependencies are byte-identical. All original exports remain in 32 original modules. Runner compatibility helpers and core/classFiles/dirtyTracker exports remain available. Existing wizard, parser/editor, runtime, coordination, diagnostics/history and setup regressions pass.

Three Windows tests in the full suite use real PowerShell/disposable children; VS Code activation and race tests use mocked APIs. No live VS Code UI/reload, UBT build/regeneration, Editor launch/debugger attach, companion integration or Unreal version compatibility was newly certified. No Unreal project was modified/migrated; no publish/reinstall, dependency/version upgrade, installer/source-bundle overwrite or automation default change.

## Remaining weaknesses and incomplete work

No selected Phase 2 implementation item remains unfinished. Optional wholesale folder moves, a full setup extraction, broad renaming and parser/schema unification were intentionally declined because they would obscure transaction/lifecycle constraints. JSDoc is documentation, not enforced checkJs; services still compose a shared mutable object; runner still contains the build workflow and setup stays in activation. Broad dependency scans/index cancellation and a real extension-host smoke suite remain future work requiring measurement/validation.

P1.1 preservation and P1.2 reload ownership remain unresolved safety work. The refactor preserves the existing cancellation contract: Failed/Unconfirmed acknowledgement reports a blocked state while completion and the in-host gate remain held until child close. Reload loses that ownership. Regeneration restoration remains unsafe under concurrent protected-file editing; do not treat Phase 2 completion as permission to rely on it unattended.

Recommended Phase 3 priorities, without beginning them: first resolve or explicitly accept the remaining Phase 1 safety limits; establish an explicit tested engine/VS Code/companion matrix and disposable extension-host/Unreal smoke workflow; then measure reconciliation/index latency before cache/cancellation or broader layout/tooling modernization. Preserve current Windows/Win64 and version policy until separate evidence authorizes change.
