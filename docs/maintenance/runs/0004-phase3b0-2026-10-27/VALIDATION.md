# Phase 3B.0 validation

Documentation-only preparation on 2026-10-27, repository root `C:\Dev\VSCodeTools\unreal-auto-setup`, PowerShell profiles disabled. No tests or runtime execution were necessary because neither production nor test infrastructure changed.

## Inspection performed

Read the requested audit summary, reliability/security, proposed architecture and roadmap; developer guide; Phase 1/2 result/change/validation reports; Phase 3A result, validation, compatibility matrix and performance baseline. Reviewed the existing preservation/cancellation decisions and targeted generation, build, runner/coordinator, debugger, creation/configuration commit paths and related tests. Inspected the Phase 3A host harness for its actual generic Stop behavior.

Targeted read-only installed workbench/companion inspection found a disconnect command and a session method sending `terminateDebuggee: false`, but did not establish live routing/adapter behavior. No unsupported launch option or UBT output-isolation capability is asserted. This was preparation for the stated gaps, not a repeat comprehensive audit.

## Commands and actual observations

| Check | Actual result |
| --- | --- |
| `git status --short` before/after | Existing dirty implementation checkout preserved; [starting snapshot](initial-status.txt). Documentation additions are inside the already-untracked `docs/` tree. |
| `git branch --show-current`; `git rev-parse HEAD` | Both observations: `main`, `dc91401b7e9eed159de80cc96713e58dfdd0a3e1`; no commit/reset. |
| `git check-ignore -v -- .local-test-projects/Phase3AIntegration/Phase3AIntegration.uproject` | Matched existing `.gitignore:40:/.local-test-projects/Phase3AIntegration/`; exit 0. |
| `git check-ignore --no-index -- unreal-auto-setup/generation.js docs/maintenance/INDEX.md docs/maintenance/runs/0004-phase3b0-2026-10-27/RESULT.md` | No matches; exit 1 means these representative source/document paths remain trackable. |
| SHA256 comparison with `baseline-hashes.json`, excluding only planned `docs\maintenance\INDEX.md` update | **154 existing files unchanged**, zero missing/changed. Covers captured runtime/tests, tools and historical documents; no production or test/harness mutation. |
| SHA256 comparison with `fixture-hashes.json` | **37 fixture source/configuration/descriptor/ownership files unchanged**. Fixture exists and was neither recreated nor deleted. This is a bounded source/configuration check, not a full multi-gigabyte binary-tree inventory. |
| Read-only comparison to Phase 3A `rpg-readonly.json` | **Eight historical RPGX protected/configuration/build-rule hashes still match**; no RPGX writes. This is not a new RPG integration test. |
| `Get-FileHash -Algorithm SHA256` on supplied and archived prompt | Byte-identical: `12363ED590D0CD516B5442828DD84889254E1EFBBF822F523C997DF4AB0CB140`. |
| New-run/index Markdown local-target check | Passed; every relative Markdown link resolves to an existing file. |
| `git diff --check` | Passed, exit 0. New reports were separately checked for trailing whitespace because they are untracked. |

Machine-readable final comparisons: [integrity-check.json](integrity-check.json). Starting manifests: [existing files](baseline-hashes.json), [fixture files](fixture-hashes.json). These provide byte comparisons relative to this run's start, not a claim that inherited modifications match HEAD.

Hash comparison method (executed using these manifests; full comparison results retained above):

```powershell
$baseline = Get-Content docs/maintenance/runs/0004-phase3b0-2026-10-27/baseline-hashes.json -Raw | ConvertFrom-Json
foreach ($entry in $baseline.PSObject.Properties) {
  if ($entry.Name -eq 'docs\maintenance\INDEX.md') { continue }
  if ((Get-FileHash -LiteralPath $entry.Name -Algorithm SHA256).Hash -ne $entry.Value) { throw $entry.Name }
}
```

The fixture comparison uses the same algorithm with the absolute paths in its manifest. RPG comparisons use the existing Phase 3A protected-file and build-rule maps. No project code was loaded/executed for these checks.

## Execution boundaries and historical results

**Not run in 3B.0:** Node/Python suites, new mock regressions, packaging/preflight, UBT, generation, compilation, VS Code test host, Editor, debugger, process cancellation, containment experiments or performance benchmarks. No software/dependency installation, global changes, migration or cleanup/deletion. No process was terminated.

The historical 363-test Node result (362 passed, one executing TODO) and four Python passes belong to prior phases. Phase 3A's ordinary generation/build/host/basic-attach evidence remains historical. None proves P1.1 conflict safety, cross-reload tree ownership or detach/reattach; those acceptance gaps remain open. The P1.1 TODO is a failing desired assertion, not a passing test.

Reviewed the handoff and three specifications against all requested work-package fields. Each separates current evidence, future work and unresolved gates; implementation commands are explicitly future commands. Documentation completion is not implementation completion.
