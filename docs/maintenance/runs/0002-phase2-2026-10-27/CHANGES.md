# Phase 2 changes

All paths below are repository-relative. This record describes changes relative to the inherited Phase 1 state, not the larger working-tree diff against HEAD. No prior test/report was rewritten. See [existing-file delta list](phase2-changed-files.txt).

## Readability and service contracts

Previous: dense multi-action statements obscured state transitions and ownership in `runtimeCoordinator.js`, `runtimeWatcher.js`, `runner.js`, `sidebar.js`, `dependencyActions.js`, `extension.js`, `runtime.js` and `core.js`.

New: consistent two-space/single-quote formatting, expanded asynchronous/control-flow blocks, explicit braces around nested revision/fingerprint loops, and a named status-icon projection. Coordinator comments explain revision coverage and why changing project does not release an active gate. Watcher documentation explains the pre-mutation epoch predicate. `.prettierrc.json` and `tools/format-js.cjs` support incremental formatting with an already installed Prettier and syntax-tree comparison, without installing dependencies. The initial formatter refused a property-key representation change before writing that file; `quoteProps: preserve` was added and all final formatting passes preserve syntax trees.

`contracts.js` adds ProjectContext, BuildSelection, DirtyChange, CancellationOutcome, OperationResult, OperationHooks, ProjectSession, RuntimeSnapshot and Services JSDoc definitions. Focused annotations/comments in activation, runner, watcher, coordinator, state, build service, project reading and dependency service document initialization and lifecycle. No runtime type system, DI framework or event bus. Compatibility: no order/default/cancellation policy change; types are documentation-only. Validation: AST checks, 119 focused tests after formatting and after each meaningful runtime extraction/readability change; final full suite and syntax checks.

## Runner responsibility separation

Previous: runner built native controls, projected snapshots, registered command/configuration dialogs and action picker, composed services and executed workflows in one closure.

New: `runtimeView.js` owns the extracted native UI creation/projection callback; `runtimeCommands.js` owns the extracted command/dialog adapters. `runner.js` calls them at the same initialization points and retains shared workflow, mayLaunch/openEditor, debugger registration, refresh registration and compatibility exports. Existing callbacks close over the same services/coordinator; no new singleton/gate. No existing file moved/renamed. Registration and view operation order, text, settings writes, trust behavior and asynchronous return behavior are preserved. `docs/DEVELOPMENT.md` describes the boundaries. Validation: existing automation/UX/workflow/race tests plus the new full-activation command-inventory fixture. The test fixture was corrected to supply createOutputChannel and include the pre-existing internal Quick Fix action; those initial failures were test assumptions, not product regressions.

## Shared validation without merged transactions

Previous: numeric association regex repeated across engine/setup/class wizard/Doctor; minimum version lived in setup core. Containment differed between classFiles, dirtyTracker and session metadata marking.

New: `enginePolicy.js` owns the identical numeric-association parser and existing minimum-version predicate. Consumers: `engine.js`, `extension.js`, `classWizard.js`, `diagnostics.js`; `core.js` re-exports supportedVersion unchanged. `paths.js` owns strict lexical containment, reused through classFiles/dirtyTracker compatibility exports and runtime marking. It rejects root, immediate parent, sibling traversal and different drives, retaining host case semantics. It is not realpath/link/transaction validation.

`tests/policy.test.js` first reproduced dirtyTracker accepting the immediate parent (1 failed/1 passed). After correction it covers containment boundary/case/cross-drive behavior, numeric patch/GUID/whitespace/missing-value equivalence and unchanged minimum-version acceptance. No new platform or engine policy. Existing link/dirty/exclusive creation guards and transaction rollback tests pass; no filesystem protections were removed.

Reviewed but intentionally retained separately: runtime setting normalization versus integer-dialog validation, setup epoch checks versus creation/dependency preview revalidation, project descriptor shape validation versus duplicate-key/byte-preserving descriptor edits, and transaction-specific persistence/Undo semantics. No speculative parser/schema consolidation.

## Small corrections

- `diagnostics.js`: corrected `â€”` to a readable em dash. The desired header regression failed before correction; passes afterward.
- `dependencyIndex.js`: removed unused declarations and its redundant descriptor read. Plugin path propagation and later per-module descriptor/type read remain; directory walk order and parser safety policy unchanged. This intentionally removes one unused I/O operation, not a functional lookup.
- `dependencyDiagnostics.js` and its caller in `dependencyActions.js`: removed unused applyAction parameter/argument after call-site inspection; the exported register function remains and actual Quick Fix handling uses the existing registered command.
- `moduleTemplates.js`: renamed ignored positional pluginName to `_pluginName` with compatibility comment. Existing four-argument callers/output remain unchanged. Left the exported class template registry's `cpp` metadata untouched rather than silently changing an exposed object shape with no practical benefit.
- Background event work was reviewed: P1.4's parse rejection boundary stays intact; existing index/diagnostic fallback boundaries remain. No new unproven async-policy rewrite.

Validation: 143 policy/core/engine-detection/Doctor/class/dependency/structure tests passed, including existing transaction safeguards. No exported function removed.

## Packaging and documentation maintenance

Previous: build_bundle.py manually enumerated 32 JavaScript sources and root/extension product docs relied on manual equality maintenance. Archive creation began without a source-import/doc preflight.

New: `bundle_sources.py` supplies sorted flat-root `.js` runtime files plus the small explicit asset list. `build_bundle.py` calls read-only validation before opening any archive, packages the generated list and includes its new helper in the source bundle so rebuilding still works. Validation checks inputs, literal local require targets, manifest entry point and byte-equal README/CAPABILITIES/VALIDATION mirrors. It deliberately fails for unlisted nested modules; a future directory migration must update policy/tests. No glob recursion into test/tool directories.

`tests/test_bundle_sources.py` adds four disposable cases: automatic new-runtime inclusion/test exclusion, missing import, doc drift and unlisted entry. Sandbox temp-directory permissions caused fixture setup/cleanup errors; the exact outside-sandbox rerun passed all four. Production code was not changed to accommodate permissions. `python -B bundle_sources.py` passes 43 inputs/37 modules/3 mirrors. No build_bundle execution or archive overwrite.

`docs/DEVELOPMENT.md` is the canonical developer architecture/flow/safety guide. Extension product documents remain canonical for the existing root mirrors, with an explicit edit/copy/check workflow. No product doc content was duplicated into this guide or edited during Phase 2. Archived prompt/run, [decision 0003](../../decisions/0003-phase2-service-boundaries.md), index and README links added; historical audit/Phase 1 records preserved.

## Compatibility and risk review

Public package bytes unchanged; all 35 public commands, one internal Quick Fix command and five settings preserved. Original export names checked across 32 modules. No production folder move, feature, runtime npm dependency, version update, new UI technology, Unreal migration, altered build/cancellation safety contract or Phase 3 work. Remaining P1.1/P1.2 limits and unverified real integration are carried forward explicitly in [RESULT.md](RESULT.md).
