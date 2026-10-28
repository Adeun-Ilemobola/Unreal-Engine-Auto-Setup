# Changes and review boundary

Preserved the incoming 17-template/snippet implementation, package contribution, creation tests and prior maintenance records. Reviewed the full tracked incoming diff plus each incoming untracked source/tool/workflow file and associated records. The original snapshot is `incoming.diff`; `initial-status.txt` includes the review archive directories created during capture.

Material corrections:

- tools/validate-release.cjs: strict zero-failure Node gate; real source/binary integrity and exact 0.8.0 manifest check. tests/release-gate.test.js adds five masking regressions.
- tests/supervisedStage.js: test-only adapter over existing native supervisor/claims. processSupervisor.launch accepts optional child env without changing default callers or ownership semantics.
- tests/real-unreal-validation.js: fixed scratch boundary, existing-project protection, supervised stages, disabled distributed build options, truthful partial/persistence outcomes.
- tools/run-tests.cjs and tests/testTemp.js: retain uncertain supervised-stage journals. engine-validation-failures.test.js adds descendant/cancel/log/overwrite regressions and retains uncertain fixture cleanup.
- tools/run-extension-tests.cjs and tests/host-runner-suite.js: safe exclusive scratch profiles, scoped environment, no automatic companion installs, conservative cleanup, stronger safety/result checks and accurate labels.
- debugger.js and debugger.test.js: guarded detach, concurrent attach exclusion, lifecycle session tracking and regressions.
- tools/phase4b/debugger-lifecycle.cjs: explicitly synthetic evidence and safe cleanup. tools/phase3b3z/compile.cjs: separate independent-evidence output path.
- tools/phase4e/: reproducible real debugger and installed-package probes plus static interface/CI/UHT checks. These are test tools and are excluded from the VSIX.
- .github/workflows/windows-ci.yml: reliable native build script, explicit prepared self-hosted opt-ins; strict fast gate remains red until P1.1 is resolved.
- docs/DEVELOPMENT.md, maintenance/PHASE4_PROGRESS.md and INDEX.md: current qualification and limitations corrected. Runs 0010–0012 remain unchanged.

No native helper source/binary edit, public command/settings change, production dependency addition, P1.1 change or project restructuring. Source remains in the repository; disposable profiles, executables, compiler scratch and validation packages remain under C:\Dev\Scratch\UnrealAutoSetupTests. Temporary environment variables are scoped to test processes, never machine/user-wide.

All working-tree changes remain unstaged and uncommitted. `final-status.txt` enumerates tracked modifications and every untracked file, including the pre-existing 0012 zip archive. Do not indiscriminately stage generated evidence without reviewing that inventory.
