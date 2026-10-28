# Validation

Baseline 2026-10-27: npm test (extension directory, approved outside sandbox): 301 passed, 0 failed/skipped; exit 0. JavaScript syntax: Get-ChildItem unreal-auto-setup -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { throw $_.FullName } } passed. No live VS Code/Unreal test run.

## Final resumed verification — 2026-10-27

Test commands below ran from `C:\Dev\VSCodeTools\unreal-auto-setup\unreal-auto-setup` with PowerShell profiles disabled. Repository inspection/syntax/hash commands ran from its parent repository root. Counts are actual Node results, not the historical baseline.

| Exact command | Environment | Result |
| --- | --- | --- |
| `node --test --test-name-pattern="public class" tests/detection-regressions.test.js` | sandbox, before resumed correction | 2 tests, 1 passed, 1 failed: helper method inferred Editor instead of Unknown; exit 1 |
| `node --test tests/detection-regressions.test.js tests/build-lifecycle.test.js tests/workflow.test.js tests/workspace-safety.test.js` | sandbox, after correction | 60 tests, 59 passed, 1 failed; real owned Windows child termination returned Failed rather than Exited; exit 1. Disposable child subsequently exited; test process completed. |
| `node --test tests/detection-regressions.test.js tests/build-lifecycle.test.js tests/workflow.test.js tests/workspace-safety.test.js` | approved outside sandbox | **60 passed, 0 failed/cancelled/skipped/TODO**, exit 0 |
| `npm test` (runs `node --test tests/*.test.js`) | approved outside sandbox | **358 tests, 357 passed, 0 failed, 0 cancelled, 0 skipped, 1 TODO**, exit 0 |

The TODO is `P1.1: regeneration must preserve a newer saved descriptor edit`, with reason `Blocked: preserve automatic generator restoration without guessing writer ownership`. Its assertion actually fails: old EngineAssociation-only descriptor replaces the concurrent Description edit. Node excludes this declared TODO failure from the ordinary failure count and returns exit 0. It is retained visible evidence of unresolved data loss, not a passing acceptance test. Fifty-seven tests were added over the 301-test baseline: 56 pass plus this one TODO.

Final JavaScript check (exit 0, **63 files**):

```powershell
$phaseFiles = @(Get-ChildItem unreal-auto-setup -Recurse -Filter *.js); foreach ($phaseFile in $phaseFiles) { node --check $phaseFile.FullName; if ($LASTEXITCODE -ne 0) { throw $phaseFile.FullName } }; Write-Output ('Syntax passed: ' + $phaseFiles.Count + ' JavaScript files')
```

Preservation check (exit 0):

```powershell
$phaseHashes = Get-Content docs/maintenance/runs/0001-phase1-2026-10-27/initial-hashes.json -Raw | ConvertFrom-Json; foreach ($phaseEntry in $phaseHashes.PSObject.Properties) { if ((Get-FileHash -LiteralPath $phaseEntry.Name -Algorithm SHA256).Hash.ToLowerInvariant() -ne $phaseEntry.Value) { throw ('Changed historical file: ' + $phaseEntry.Name) } }; if ((Get-FileHash -LiteralPath 'docs/maintenance/prompts/0001-phase1-critical-fixes-v1.md').Hash -ne (Get-FileHash -LiteralPath 'C:\Users\Owner\.codex\attachments\179e5c30-d71a-4b34-9aea-1e3e35590fc0\Pasted text.txt').Hash) { throw 'Prompt differs' }; Write-Output 'All 9 audit files, package.json, and archived prompt match their original hashes'
```

`git branch --show-current` returned `main`; `git rev-parse HEAD` returned `dc91401b7e9eed159de80cc96713e58dfdd0a3e1`. `git status --short`, `git diff --stat`, `git diff --numstat`, `git diff --check` and the per-file diff were reviewed. Whitespace check passed. Initial and final HEAD match; no commits. Final status is reproduced below.

## Preserved evidence from before interruption

These are the earlier execution's observed results, retained in this continuous run rather than re-running the entire audit or baseline:

- Baseline `npm test`: 301 passed, no failures/skips.
- `node --test tests/generation-conflict.test.js`: 1 TODO with failing desired assertion, no ordinary failures.
- Initial lifecycle regressions: all six failed before fixes; full suite after lifecycle changes: 310 tests, 309 passed, 1 TODO, no ordinary failures. Later terminal creation regression failed before its correction and passed afterward.
- Initial detection regressions: 33 tests, 21 passed, 12 failed. After fixes, detection plus existing engine/project/runner targeted tests: 42 passed. Full suite then: 343 tests, 342 passed, 1 TODO, no ordinary failures. Two constructor cases were subsequently added; the helper-method case was finished during resumption as recorded above.
- Initial workflow/workspace safety target: 15 tests, 4 passed, 11 failed. After fixes, workflow/workspace/UX/dependency UI target: 56 tests passed outside sandbox; its sandboxed run had two filesystem EPERM failures. Same-folder watcher case passed after being added.

No raw pre-interruption test log files were saved; these counts are the observed execution evidence retained in the interrupted session. Exact final commands above are independently re-executed final-state validation.

## Mocked and real integration boundaries

Most tests use injected subprocesses, filesystem fixtures, mock VS Code APIs and controlled promise barriers. Failure, timeout, repeated cancellation, service disposal and coordinator retention are deterministic mocks; they do not demonstrate survival across an actual extension-host reload.

Three passing Windows integration tests in the full suite invoke real PowerShell: the new disposable owned-tree cancellation case, the managed build output/error exit-code case, and the existing script quoting/launch gating case. These use disposable fixtures/children, not Unreal builds or an existing Editor. The new cancellation test passed outside sandbox both targeted and full-suite. Its sandboxed failure was preserved and corrected by changing execution permissions, with no production workaround for test permissions.

No live VS Code extension-host UI/reload test, real UBT generation/build, Editor launch, engine migration, or real-project concurrency experiment was performed. Installed UE 5.8 source was inspected read-only for P1.1 isolation. Historical Unreal 5.8.1 validation remains historical and was not reproduced or promoted to new certification.

## Compatibility, packaging and documentation checks

package.json is byte-identical to the initial hash; extension identity, v0.8.0, commands, settings, activation declarations and dependencies therefore remain unchanged. Existing tests cover setup preservation, wizards, dependency editor, history/diagnostics, automation and Editor safeguards.

Inspected `build_bundle.py` read-only: its explicit runtime list includes every existing top-level JavaScript source; no production files were added or moved. Four new test files are covered by `tests/*.test.js`; the source bundle's recursive inclusion would include tests. Maintenance docs are repository records outside that source directory. The packaging script was not executed and no VSIX/source bundle was overwritten.

Maintenance Markdown links were checked for existing local targets; records and decisions were reviewed for accurate statuses and no remaining in-progress placeholders. Original prompt and historical audit hashes pass. Final Git status:

Exact read-only runtime/link check (exit 0: **32 runtime sources covered, 16 local links verified**):

```powershell
$phaseBundle = Get-Content build_bundle.py -Raw; $phaseRuntime = @(Get-ChildItem unreal-auto-setup -File -Filter *.js); foreach ($phaseSource in $phaseRuntime) { if (-not $phaseBundle.Contains("'" + $phaseSource.Name + "'")) { throw ('Missing runtime source: ' + $phaseSource.Name) } }; Write-Output ('Packaging allowlist covers all ' + $phaseRuntime.Count + ' runtime JavaScript files'); $phaseLinks = 0; foreach ($phaseDoc in Get-ChildItem docs/maintenance -Recurse -Filter *.md) { foreach ($phaseMatch in [regex]::Matches((Get-Content -LiteralPath $phaseDoc.FullName -Raw), '\]\(([^)]+)\)')) { $phaseTarget = $phaseMatch.Groups[1].Value; if ($phaseTarget -match '^(https?:|#)') { continue }; $phaseResolved = Join-Path $phaseDoc.DirectoryName $phaseTarget; if (-not (Test-Path -LiteralPath $phaseResolved)) { throw ('Broken link in ' + $phaseDoc.Name + ': ' + $phaseTarget) }; $phaseLinks++ } }; Write-Output ('Maintenance local links verified: ' + $phaseLinks); git diff --check; git status --short
```

```text
 M unreal-auto-setup/build.js
 M unreal-auto-setup/core.js
 M unreal-auto-setup/dependencyActions.js
 M unreal-auto-setup/engine.js
 M unreal-auto-setup/extension.js
 M unreal-auto-setup/generation.js
 M unreal-auto-setup/project.js
 M unreal-auto-setup/runner.js
 M unreal-auto-setup/runtimeWatcher.js
 M unreal-auto-setup/tests/workflow.test.js
?? docs/
?? unreal-auto-setup/tests/build-lifecycle.test.js
?? unreal-auto-setup/tests/detection-regressions.test.js
?? unreal-auto-setup/tests/generation-conflict.test.js
?? unreal-auto-setup/tests/workspace-safety.test.js
```

P1.1 is Blocked and P1.2 is Partially complete regardless of the normal test runner's exit code. Remaining prerequisites are in [RESULT.md](RESULT.md) and the linked decisions.
