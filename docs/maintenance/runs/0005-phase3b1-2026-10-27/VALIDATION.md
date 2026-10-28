# Validation — Phase 3B.1

2026-10-27 UTC; repository `C:\Dev\VSCodeTools\unreal-auto-setup`, PowerShell profiles disabled. Node commands use the extension subdirectory unless prefixed `tools/`; Python/preflight/inspection commands use root. No release packaging command ran.

## Commands and results

| Exact command/check | Actual result |
| --- | --- |
| `node --test tests/generation.test.js tests/generation-conflict.test.js tests/generation-recovery.test.js` (initial sandbox) | 43 total: 39 pass, three failures, one temporary TODO. Rename/hard-link/junction fixtures were affected by sandbox permissions. |
| Same command, approved outside sandbox | 43 total: 42 pass, zero ordinary failures, one temporary automatic-preservation TODO. Original saved-edit assertion passed. |
| `npm test` (first broader outside-sandbox run) | 401 total: 400 pass, zero ordinary failures, one temporary TODO. |
| `npm test` (after six more regressions, outside sandbox) | 407 total: 406 pass, zero ordinary failures, one temporary TODO. [Intermediate log](node-suite.txt); **not** the final acceptance result. |
| `node --test --test-name-pattern='configuration-read failure' tests/generation-recovery.test.js` before/after correction | One failed (lease acquired before throwing configuration getter), then one passed after moving it inside try/finally. |
| `npm test` (final, approved outside sandbox) | **408 total: 407 pass, one fail, zero cancelled/skipped/TODO; exit 1.** Original ordinary configuration restoration fails. Its temporary TODO was removed to avoid masking the regression. [Final full log](node-suite-final.txt). |
| `node --test tools/phase3b1/baseline-probe.cjs` (root) | **One expected failure**, exit 1: verified exact starting source overwrites a newer saved descriptor. Production not reverted. [Probe](baseline-probe.txt). |
| `python -B -m unittest discover -s tests -p 'test_*.py' -v` | **Four passed**, exit 0 outside sandbox, including final rerun. A sandboxed combined attempt had eight WinError 5 setup/cleanup errors across four tests; later shell exit 0 for preflight/syntax did not make Python pass. [Final log](python-suite.txt). |
| `python -B bundle_sources.py` | Passed: **45 inputs, 39 runtime modules, three document mirrors**; read-only. Fixture/recovery/tool content excluded. |
| `node --check <file>` for all extension `.js` and tools `.cjs` | **83 files passed**. Archived starting `.txt` is not production. |
| `node tools/format-js.cjs <installed-prettier-path> unreal-auto-setup/generation.js unreal-auto-setup/generationRecovery.js unreal-auto-setup/generationGuard.js` | Existing Prettier 12.4.0 used; syntax trees unchanged by formatting. No download. |
| Babel AST export-name comparison against HEAD's original modules | Passed for **32** original modules. Four prior additional modules are byte-identical; `contracts.js` retains its empty export with JSDoc additions. [Compatibility check](compatibility-check.json). |
| Manifest SHA256 against initial map | Unchanged: **0.8.0**, same ID, **35 commands / five settings**. |
| `git check-ignore -v -- .local-test-projects/Phase3AIntegration/Phase3AIntegration.uproject` | Existing `.gitignore:40` matches, exit 0. `git status --short --untracked-files=all -- .local-test-projects` emitted no project assets. |
| `git diff --check`, local report links, baseline hashes | Whitespace/local-target checks passed; [integrity evidence](integrity-check.json) distinguishes intended edits from preserved historical files. |

The final Node nonzero result is an unresolved **product acceptance failure**, not an environmental failure. No assertion was weakened/test deleted to obtain a passing count. The original saved-edit TODO passes; automatic restoration remains unsupported and fails visibly.

Final integrity comparison: **156 starting files unchanged**, including prior execution records/tools; **14 existing files** changed only within the declared runtime/test/developer-guide/index scope. Of 37 recorded fixture source/configuration files, only three VS Code generated JSON files and `.clang-format` changed. Source, descriptors, build rules and recorded project configuration remain intact. Prompt archive is byte-identical (SHA256 `9473A15929D20B9E98B07269FA2CCC4727093D50760AE146FD16DEBBBED7D4DF`). All **76** local links in the six reports, index and developer guide resolved. [Final status](final-status.txt).

## Deterministic coverage

New tests use owned temporary files, injected errors, promises/checkpoints and document events; no random sleep establishes correctness.

| Requested cases | Coverage/boundary |
| --- | --- |
| 1–6: normal/unchanged/generated/absent/new/multiple | Passing observed-unchanged flow and recoverable ambiguous changes. **Old automatic restoration remains failed.** |
| 7–9, 12–15: saved/unsaved/external edits before launch, during execution, before finalization and successive changes | Barrier-controlled disk changes and mock VS Code events. Labeled versions survive; arbitrary unobserved external intermediate versions are not claimed recoverable. |
| 10–11: descriptor/module/plugin writes | Actual commit APIs refuse while exclusion held; no destination created. Setup/engine settings, mutation-before-generation and unrelated resources tested. |
| 16–19, 22: deletion/replacement/symlink/hard-link/directory | Actual disposable filesystem fixtures, outside sandbox as needed; no target writes on unsafe states. |
| 20–24: permissions/partial I/O/restore/recovery failures | Injected handles/partial blob writes; pre-launch refusal/post-run RecoveryFailed. Unsafe automatic restore removed; compatibility helper leaves changed/missing files alone. No system ACL changes. |
| 25–30: success+conflict/failure/cancel/switch/repeat/interleave | Separate outcomes/stale state/exact project, same-folder selection and held exclusion tested. |
| 31–32: disposal/interruption/recovery | Simulated disposal-triggered cancellation with held child-completion promise; existing real service disposal/lifecycle tests pass. Interrupted journals survive retry without replay. **No actual host reload/orphan or automatic recovery claim.** |

Quota, exclusive-slot contention, missing/unsafe storage, observer/artifact failures and early exception release also pass. **45 new source tests** over 363 starting tests; the intentionally failing baseline probe is separate.

## Source versus real integration

[Integration report](INTEGRATION_RESULTS.md), [host events](host-events.jsonl), [summary](integration-summary.json), [build log](ubt-build.log), [generation log](ubt-generation.log). Four real UBT executions succeeded but preservation conflicted. Corrected real saved-WorkspaceEdit comparison passed. Native warning and Diagnose Project recovery findings were observed. Development Editor build passed with UE 5.8.4/MSVC 14.50.35739/SDK 10.0.22621.0.

First live comparison falsely failed due to LF/CRLF expectation; copied bytes/events showed survival, comparator corrected and real rerun passed. Driver's invalid Doctor alias failed; actual `unrealSetup.diagnose` succeeded through the native palette afterward. Both remain in evidence. A summary initially counted a final snapshot as another generation; filtering was corrected and a duplicate metadata copy removed after matching operation IDs. There were **four**, not five, generation executions.

Final early-exception lease fix followed host closure and has failing-then-passing unit/full-suite coverage; that exceptional path was not injected into a real host. Normal host observations remain separately evidenced. No helper invocation is promoted to native compatibility.

Final relevant-process query was empty; owned hosts exited normally. No force kill, Editor/debugger session, engine-source edit, RPGX operation, package, install or migration. [Cleanup](cleanup.json). Fixture/copies retained and ignored. P1.2/debugger limits unchanged.
