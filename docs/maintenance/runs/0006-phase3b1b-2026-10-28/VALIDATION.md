# Validation — 2026-10-28 UTC

Root: `C:\Dev\VSCodeTools\unreal-auto-setup`. Node source tests run in the extension subdirectory; other commands from repository root. PowerShell profiles disabled. Historical Phase 3B.1 counts are not current passes.

| Command/check | Current execution result |
| --- | --- |
| `node --test tests/generation.test.js tests/generation-conflict.test.js tests/generation-recovery.test.js` before edits | **50 total: 49 pass, one fail**, zero TODO/skips, exit 1 outside sandbox. [Baseline log](baseline-targeted.txt). |
| `node --test tests/generation-preservation.test.js` initial red run | Three new tests failed before implementation: metadata-only conflict, unresolved retry adoption, absent filesystem receipts. |
| Same new file after implementation/additional cases | 17 new cases pass in the final combined/full run. Initial three passed first; later 14-case and final 17-case versions retained the same original requirements. |
| Existing generation group after recovery gate, before test policy correction | Two old retry-policy expectations failed in addition to the original preservation failure. Expectations were strengthened to Blocked/no launch/immutable old bytes; repeat-success uniqueness and quota coverage remain in new tests. No tests removed. |
| `node --test tests/generation.test.js tests/generation-conflict.test.js tests/generation-recovery.test.js tests/generation-preservation.test.js` | **67 total: 66 pass, one fail**, zero TODO/skips; exit 1 outside sandbox. [Targeted log](targeted-final.txt). |
| `npm test` | **425 total: 424 pass, one fail, zero cancelled/skipped/TODO; exit 1**, outside sandbox. Same unchanged ordinary-preservation assertion fails. [Full log](node-suite.txt). |
| `python -B -m unittest discover -s tests -p 'test_*.py' -v` | **Four passed**, exit 0 outside sandbox. [Python log](python-suite.txt). |
| `node --check <file>` for every extension `.js` and tools `.cjs` | **87 files passed**. Atomic PowerShell probe also parsed/executed successfully. |
| `python -B bundle_sources.py` | Passed: **45 inputs, 39 runtime modules, three documentation mirrors**. Read-only; no release artifact packaging. |
| `node tools/format-js.cjs <existing-installed-prettier-path> unreal-auto-setup/generation.js unreal-auto-setup/generationRecovery.js unreal-auto-setup/tests/generation-preservation.test.js` | Parsed syntax trees unchanged by formatting; no download/install. |
| `& tools/phase3b1b/atomic-probe.ps1` | Exit 0; actual Windows replacement backs up a late user save but replaces its live contents; exclusive write handle rejects both writer types. **Candidate not adopted.** [Probe](atomic-probe.json). |
| `node tools/phase3b1b/run-owned.cjs <*-host-spec.json>` | Three real private hosts, exit 0 after ordinary close. Commands are retained in each specification/ledger. |
| `node tools/phase3b1b/capture.cjs ordinary-before`, `ordinary-after`, `saved-before`, `saved-after` | 59 protected files each; before byte copies retained. Six byte changes in each actual generation; provider preservation failed. |
| AST export/manifest checks | Original export names retained across **32 original modules**, prior recovery exports retained, same **0.8.0 / 35 commands / five settings**. Manifest byte comparison in integrity evidence. [Compatibility](compatibility.json). |
| `git check-ignore -v -- .local-test-projects/Phase3AIntegration/Phase3AIntegration.uproject` | Existing `.gitignore:40` narrow rule matches. No generated test assets become untracked project content. |
| `git diff --check`, report link/byte checks | Passed; exact final preservation evidence and intended file list are in [integrity-check.json](integrity-check.json). |

The original ordinary-preservation test is unchanged and remains a normal failure. No assertion was weakened or annotated TODO to obtain a passing suite. The failure is **unfinished product behavior**, not an environment issue. All 17 added source tests pass. Existing saved/unsaved/external/identity/link/failure/cancellation/workspace/creation regressions remain covered; [matrix](CONFLICT_MATRIX.md) labels simulation versus real evidence.

## Real versus simulated evidence

Actual public `unrealSetup.regenerate` in real VS Code: one ordinary and one saved-edit UBT execution returned exit 0, both preservation Conflict; prior-history and repeat requests Blocked/NotStarted. Ordinary seeded provider was lost from the live config; saved `.clang-format` bytes survived. Current Manual Build succeeded. Native warning/diagnostic reporting observed. [Integration](INTEGRATION_RESULTS.md), [raw events](host-events.jsonl), [summary](integration-summary.json).

The atomic probe uses actual Windows APIs on new owned data, not real UBT and not production integration. Source failure/quota/corruption/cancellation/race cases use controlled fixtures, promises, checkpoints and injected I/O/watch callbacks. There was no destructive shared-engine race, real UBT orphan/reload test, native unsaved-edit test, debugger lifecycle test, install or engine-source modification.

Filesystem receipts are bounded delivery hints. Neither a quiet watcher nor an equal hash establishes actor identity or exclusive access. No test upgrades them into permission to restore. Old recovery records remain immutable and newly block silent adoption on retry; independent fresh profiles do not resolve old conflicts or establish cross-profile process coordination.

Final source/history/recovery hash comparisons, exact prompt equality, unchanged HEAD/manifest, local links and cleanup are checked separately. No source commit, broad audit repetition, RPGX operation, release packaging/publication, software upgrade or Phase 3B.2/3B.3 work occurred.

Final integrity results: **241 starting files byte-identical**, five intended existing files changed (two runtime files, one retry-policy test file, developer guide and index); **448 previous recovery files preserved**; **33 recorded fixture source/configuration files still match** after excluding the expressly modified provider/compile-command/clang-format test outputs. The original ordinary-preservation test and manifest are byte-identical to this run's baseline. All **93** local links in the six reports, index and developer guide resolve; whitespace checks pass. The three inspected installed UBT C# source files retain their recorded hashes. Prompt SHA256: `1A214C4A867E4752951C021D53B788BC65C724F77933955E8EDBCF17769EB461` (exact attachment match). Final status is retained in `final-status.txt`.
