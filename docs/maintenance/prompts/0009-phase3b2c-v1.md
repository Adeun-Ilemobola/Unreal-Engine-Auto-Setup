# Unreal Engine Auto Setup — Phase 3B.2c
## Release Qualification, Build-and-Run Integration, and Concurrency Hardening

### Mission

Continue work on my custom Visual Studio Code extension, **Unreal Engine Auto Setup**, with the stable identifier `local-tools.unreal-project-tools`.

Phase 3B.2b successfully implemented Windows Job Object process supervision, verified full-tree completion, durable operation claims, cross-reload recovery, and ordinary repeated Build functionality.

However, the broader Phase 3B.2 work remains partially qualified.

Your assignment is to **complete the remaining Phase 3B.2 release-readiness and concurrency checks without redesigning the working supervisor**.

This is an authorized implementation and integration-testing task, not another comprehensive audit.

You are expected to work autonomously through implementation, testing, debugging, and documentation.

Do not stop after producing a plan.

---

## 1. Standing authorization — Mandatory for this and future tasks

The user grants Codex explicit permission to perform all necessary in-scope development and testing, including narrowly scoped operations outside the normal sandbox, involving only the following three authorized areas:

1. **Visual Studio Code:** Development Hosts, isolated profiles, extension debugging, test installation, relevant settings and integrated terminals.
2. **The extension repository:** `C:\Dev\VSCodeTools\unreal-auto-setup`, its source, tests, scripts, documentation, temporary artifacts and development tooling.
3. **Unreal Engine:** The installed engine, UnrealBuildTool, Unreal Editor and the authorized disposable integration project.

Directly necessary command-line tools are permitted, including Git, Node.js, npm, Python, PowerShell, MSVC, Windows SDK tools, process APIs and existing CI scripts.

You may independently:

- Inspect and modify in-scope code.
- Compile and execute test helpers.
- Launch and reload isolated VS Code hosts.
- Create isolated VS Code profiles.
- Build temporary test VSIX packages.
- Install the extension into isolated test environments.
- Run the disposable Unreal project.
- Build, launch and close positively identified test-owned processes.
- Execute regression and integration tests.
- Diagnose and correct failures.
- Update maintenance documentation.
- Clean up task-owned temporary files.

**Do not repeatedly request approval for routine in-scope work.**

Use narrow sandbox exceptions where required. Do not request unrestricted machine access.

This authorization does not override platform-enforced approval mechanisms.

### Strict boundaries

Without separate approval, do not:

- Interact with unrelated graphical applications.
- Modify unrelated projects or personal files.
- Modify Bitdefender or disable antivirus protection.
- Change system-wide TEMP/TMP or environment configuration.
- Modify Windows registry settings.
- Install or upgrade Unreal Engine or system toolchains.
- Modify installed Unreal Engine source.
- Terminate unrelated processes.
- Modify RPGX.
- Publish the extension.
- Replace the extension in my personal VS Code profile.
- Create Git commits.
- Begin Phase 3B.3 or unrelated feature development.

Request approval only when an operation genuinely exceeds these boundaries.

---

## 2. Mandatory development scratch-directory convention

**This convention applies to every present and future test harness and Codex task concerning this extension.**

Use:

`C:\Dev\Scratch\UnrealAutoSetupTests`

This directory is inside the existing Bitdefender-excluded `C:\Dev` development area.

All temporary executables, compiled test fixtures, process-supervision artifacts, isolated development-host profiles, test journals and related generated files must use this location.

### Requirements

1. Preserve unique per-run subdirectories.
2. Keep concurrent runs isolated.
3. Use process-scoped TEMP/TMP/TMPDIR overrides where necessary.
4. Never modify system-wide TEMP or TMP.
5. Keep permanent source files and distribution binaries in their existing repository locations.
6. Clean up completed test directories only after verifying ownership and process completion.
7. Retain uncertain or failed-run evidence when cleanup cannot be proved safe.
8. Verify the actual output paths of generated executables.
9. Preserve the existing test-artifact configuration and documentation.
10. Never change Bitdefender settings.

Phase 3B.2b already implemented this relocation.

Do not redo it unnecessarily.

Verify that the current harness still follows the convention, and ensure every new Phase 3B.2c test uses it.

Do not silently revert to `%LOCALAPPDATA%\Temp` or `os.tmpdir()` for compiled test artifacts.

---

## 3. Baseline and previous results

The Phase 3B.2b report established:

- Windows Job Object supervision.
- An independent native worker surviving VS Code extension-host reload.
- Root exit and job active-process count tracked separately.
- Durable, identity-bound completion receipts.
- Automatic release of completed project claims.
- Two consecutive successful real UnrealBuildTool builds.
- Recovery of an active descendant across reload.
- Recovery of completed UBT work after reload.
- A successful build following a controlled compile failure.
- Same-store cross-window exclusion.
- Independent Editor survival during owned-job cancellation.

The final reported tests were:

- Node: 442 total, 441 passed, one existing P1.1 failure.
- Python: four passed.
- Packaging preflight: 50 inputs, 41 runtime modules and three documentation mirrors.

These are historical results. Verify the current repository state.

### Known limitations to resolve or qualify

1. A freshly installed VSIX has not been fully validated.
2. Fresh real Build-and-Run launch has not been fully qualified.
3. The 256-entry admission inspection limit has a concurrency weakness under simultaneous distinct-project claims.
4. Comparative resource and handle benchmarks are incomplete.
5. Some crash-boundary stress scenarios remain untested.

### Known limitation outside scope

P1.1 automatic regeneration preservation remains unresolved.

The existing P1.1 acceptance test intentionally fails.

Do not fix, remove, skip, weaken or reclassify that test during this phase.

Do not claim that the complete Node suite passes while it remains failing.

---

## 4. Preparation

Read the relevant documentation:

- `docs/DEVELOPMENT.md`
- Phase 3B.2 `RESULT.md` and ownership contract.
- Phase 3B.2b `RESULT.md`.
- Phase 3B.2b `PROCESS_SUPERVISION_DESIGN.md`.
- Phase 3B.2b `PROCESS_TREE_TEST_MATRIX.md`.
- Phase 3B.2b `RELOAD_INTEGRATION_RESULTS.md`.
- Phase 3B.2b `SAFETY_CONTRACT.md`.
- Phase 3B.2b `SCRATCH_CONFIGURATION.md`.
- Phase 3B.2b `VALIDATION.md`.

Inspect relevant current source and tests.

Do not conduct another full repository audit.

Before modifications:

1. Run Git status.
2. Record branch and HEAD.
3. Identify and preserve uncommitted changes.
4. Verify the disposable Unreal project is ignored.
5. Verify the scratch directory configuration.
6. Confirm existing supervisor binaries and source integrity.
7. Establish the current targeted test baseline.

Do not reset, revert or amend existing work.

---

## 5. Task A — Fresh VSIX qualification

Validate the extension from a freshly produced test VSIX, not only from a source-based Extension Development Host.

### Packaging

1. Inspect the current packaging scripts.
2. Generate a temporary validation VSIX using the current source.
3. Do not overwrite existing released VSIX files.
4. Keep temporary packaging work under the approved scratch location.
5. Verify packaged runtime JavaScript.
6. Verify the native supervisor executable and corresponding source/build identity.
7. Validate extension manifest metadata.
8. Validate extension identity and public settings.
9. Confirm excluded disposable files are absent.
10. Confirm unexpected local development files are absent.

### Isolated installation

Create an isolated VS Code profile and extension directory.

Install the test VSIX only into that environment.

Where required, reuse verified locally available companion extensions without modifying personal profiles.

Do not upgrade the user's normal VS Code extension installation.

### Runtime validation

Through the freshly installed package, verify:

- Extension activation.
- Project discovery.
- Engine association.
- Supervisor availability.
- Native helper invocation from the installed package.
- Managed Build.
- Process identity recording.
- Full-tree completion.
- Claim release.
- Second managed Build.
- Correct diagnostic state.

Confirm that the helper does not accidentally depend on relative paths from the source checkout.

If packaged execution fails, distinguish packaging defects from process-supervision defects.

Fix in-scope problems and repeat validation.

---

## 6. Task B — Real Build-and-Run qualification

Use the existing disposable project:

`C:\Dev\VSCodeTools\unreal-auto-setup\.local-test-projects\Phase3AIntegration`

Verify its identity, engine association and Git exclusion.

The project may be modified for basic testing.

Do not modify RPGX.

### Required workflow

1. Ensure the project is in a known safe state.
2. Confirm no unrelated Editor is associated with the project.
3. Execute managed Build.
4. Verify full-tree completion and claim release.
5. Execute the public Build-and-Run workflow.
6. Confirm the appropriate Editor target was used.
7. Verify the managed build completes.
8. Verify the process-ownership claim releases.
9. Confirm Unreal Editor launches successfully.
10. Confirm the Editor is associated with the correct project.
11. Verify clean Run reuses the existing Editor.
12. Verify the extension does not accidentally terminate the Editor.
13. Verify active-Editor build safeguards remain intact.
14. Close only the Editor process explicitly launched by the test.
15. Confirm no test-owned compiler or supervisor processes remain.
16. Confirm the project can perform another managed Build afterward.

Record actual process IDs, command associations and relevant results.

Do not confuse completion of the supervised build with completion of the Editor's independent lifetime.

### Regeneration safety

Avoid unnecessary regeneration during this test.

Do not interpret a successful Build-and-Run operation as resolving P1.1.

If regeneration is triggered unexpectedly, capture the evidence and preserve the existing conflict behavior.

Do not override it merely to make the integration test pass.

### Debugging

Basic process observation is permitted.

Do not perform debugger detach-and-reattach qualification. That belongs to Phase 3B.3.

---

## 7. Task C — Admission-limit concurrency hardening

The current claim-store admission scan stops at 256 entries.

The Phase 3B.2b report identified a limitation: simultaneous distinct-project admission may exceed the threshold because the quota is not globally atomic.

Investigate the actual implementation and demonstrate the race deterministically if possible.

### Required safety contract

- Concurrent admissions must not bypass an intended bound.
- Existing unresolved claims must not be deleted or expired merely to free capacity.
- Exhausted or uncertain capacity must fail closed.
- Same-project exclusion must remain atomic.
- Different projects should not be unnecessarily serialized beyond the required shared transaction.
- Corrupt or ambiguous metadata must not grant admission.
- Crash interruption must not allow unsafe claim reuse.
- Successful completed claims must remain safely releasable.
- Ordinary workloads must not experience unnecessary blocking.

### Implementation

If the limit is an actual admission quota, introduce the smallest correct atomic reservation or admission mechanism.

If it is only an inspection bound, define safe behavior when the bound is exceeded and avoid presenting it as a guaranteed global quota.

Prefer the existing storage and locking model where suitable.

Do not create a complex distributed lock service.

Do not assume filesystem timestamps are sufficient for ownership.

Do not introduce automatic force-unlock behavior.

### Required tests

Include:

- Empty store.
- Single admission.
- Concurrent same-project admission.
- Concurrent distinct-project admission.
- Boundary immediately below the limit.
- At the limit.
- Above the limit.
- Concurrent acquisition at the boundary.
- Completed-claim release.
- Unresolved claim retention.
- Corrupt claim.
- Partial metadata write.
- Interrupted reservation.
- New admission after verified cleanup.
- Multiple VS Code hosts sharing the same store.

Use lightweight synthetic metadata fixtures.

Do not launch hundreds of UnrealBuildTool processes to test the quota.

Preserve exact same-store coordination guarantees.

Do not claim cross-profile or cross-machine coordination unless actually established.

---

## 8. Task D — Focused resource and lifecycle checks

Measure the native supervisor's overhead under ordinary test workloads.

Focus on:

- Startup overhead.
- Claim acquisition.
- Claim release.
- Reload reconciliation.
- Supervisor process lifetime.
- Handle retention.
- Memory usage.
- Journal growth.
- Listener cleanup.
- Repeated-operation stability.

Use bounded, controlled tests.

Compare with existing Phase 3B.2b evidence where measurements are comparable.

Do not run an uncontrolled stress test against Unreal Engine.

Do not repeatedly rebuild large engine targets merely to measure supervisor overhead.

Synthetic process-tree fixtures are preferred for repetitive lifecycle tests.

### Crash boundaries

Exercise a few high-value fault cases:

- Host exits after claim acquisition but before spawn.
- Host reloads with a running worker.
- Worker completes while the host is absent.
- Worker exits unexpectedly.
- Completion receipt is missing or corrupted.
- Claim release is interrupted.

Preserve conservative behavior when completion cannot be verified.

Do not weaken the durable proof requirement.

Avoid speculative recovery states presented as successful results.

---

## 9. Existing process-supervision safeguards

Preserve the Phase 3B.2b design unless a focused correction is required.

In particular:

- The managed process starts suspended.
- It is assigned to its private Job Object before resuming.
- The independent worker retains the relevant handles.
- Root exit is not equivalent to full-tree completion.
- Release requires matching durable completion evidence.
- Unknown or lost supervisors remain blocked.
- Cancellation targets verified private-job ownership.
- No recovered process is terminated based on PID alone.
- Existing Unreal Editors remain separate from managed build jobs.
- Distributed or brokered compilation is not silently treated as contained.
- Completion records and command identity are validated before claim release.

Do not replace the working implementation with simpler root-PID tracking.

Do not introduce an unsafe timeout-based force-release mechanism.

---

## 10. Regression and integration validation

After each meaningful code change:

1. Run the relevant targeted tests.
2. Inspect the diff.
3. Check error handling.
4. Confirm existing safety invariants.
5. Rerun affected scenarios.

At completion:

1. Run the complete Node test suite.
2. Run the Python tests.
3. Run JavaScript/CommonJS syntax checks.
4. Run the existing packaging preflight.
5. Verify native helper integrity.
6. Verify manifest, commands, settings and version.
7. Verify module imports and exports.
8. Run Git whitespace checks.
9. Verify documentation links.
10. Validate packaged VSIX installation in an isolated profile.
11. Validate real Build-and-Run against UE 5.8.4.
12. Run concurrency-limit regression tests.
13. Verify test artifacts use the approved scratch directory.
14. Confirm no task-owned processes remain when cleanup is reported complete.

Report exact totals and commands.

### Known P1.1 failure

The earlier suite reported one existing P1.1 failing test.

That remains an independently tracked failure.

Do not alter its assertion simply to obtain a green suite.

Phase 3B.2c may be complete if the only remaining failing test is this unchanged, documented P1.1 acceptance test and all Phase 3B.2c criteria pass.

Any new failure must be fixed or explicitly reported as a Phase 3B.2c blocker.

---

## 11. Recovery and cleanup

Use the dedicated scratch root:

`C:\Dev\Scratch\UnrealAutoSetupTests`

Use isolated run directories.

Do not remove historical recovery artifacts or uncertain operation claims without evidence that cleanup is safe.

Only terminate test-owned processes with verified identity.

Keep normal personal VS Code profiles unchanged.

Preserve the disposable Unreal project unless there is a clear reason to remove task-generated temporary content.

Do not delete the original RPGX project.

Verify that any temporary VSIX installation is limited to its isolated test profile.

Clean up successfully completed test artifacts.

Preserve failed or uncertain evidence for analysis.

---

## 12. Maintenance documentation

Archive this exact effective prompt using the established maintenance convention.

Suggested task:

`0009-phase3b2c-v1.md`

Suggested run directory:

`docs/maintenance/runs/0009-phase3b2c/`

Adjust identifiers if needed to avoid collisions.

Create:

- `RESULT.md`
- `CHANGES.md`
- `VALIDATION.md`
- `VSIX_QUALIFICATION.md`
- `BUILD_AND_RUN_INTEGRATION.md`
- `ADMISSION_CONCURRENCY.md`
- `RESOURCE_BASELINE.md`

Update the maintenance index and developer guide where relevant.

Record:

- Initial Git revision.
- Actual changes.
- Tests added or modified.
- Packaging findings.
- Installed test-VSIX evidence.
- Real Editor launch results.
- Quota/concurrency behavior.
- Remaining limitations.
- Final Git status.
- Safe recovery or rollback guidance.

Do not overwrite previous phase reports.

Do not automatically commit changes.

Do not upgrade the extension version or publish a release.

---

## 13. Acceptance criteria

Phase 3B.2c can be classified **Complete** only when:

### Fresh installation

- A newly generated validation VSIX loads successfully in an isolated profile.
- Packaged JavaScript and native supervisor are present and usable.
- No hidden dependency on development checkout paths causes failure.
- Normal managed Build works from the installed extension.

### Build-and-Run

- Real UE 5.8.4 Build-and-Run succeeds using the disposable project.
- The supervised build releases its claim correctly.
- Unreal Editor starts for the expected project.
- Clean Run reuse works.
- Editor lifetime remains independent of supervised build cancellation and cleanup.
- A later managed build can run safely after Editor closure.

### Concurrency

- Same-project claims remain exclusive.
- Concurrent admissions cannot silently bypass the intended capacity policy.
- Store-limit errors fail safely.
- Unresolved claims remain protected.
- Release and reacquisition work correctly.

### Reliability

- Existing full-tree completion safeguards remain intact.
- Host reload recovery still works.
- Unknown ownership cannot trigger termination.
- Resource and journal use remain bounded.
- No new process-lifecycle regressions remain.

### Validation

- Targeted Phase 3B.2c tests pass.
- Real VS Code/Unreal tests pass.
- Packaging and interface checks pass.
- Test executables follow the dedicated scratch convention.
- The known P1.1 failure remains clearly identified.

If an acceptance condition cannot be met safely, document the precise blocker and classify the phase as partial.

Do not misrepresent incomplete qualification as a pass.

---

## 14. Final report

When finished, provide:

1. **Phase status:** Complete, Partially Complete or Blocked.
2. **Fresh VSIX:** Installation, activation and native helper results.
3. **Build-and-Run:** Exact real UE 5.8.4 results.
4. **Claim release:** Verification after repeated operations.
5. **Concurrency:** Admission-limit design and validation.
6. **Resource behavior:** Measurements and remaining risks.
7. **Testing:** Exact Node, Python, syntax, packaging and integration results.
8. **P1.1:** Confirm unchanged unresolved status.
9. **Test artifacts:** Confirm use of `C:\Dev\Scratch\UnrealAutoSetupTests`.
10. **Documentation:** Locations of all maintenance reports.
11. **Git:** Starting revision and final working-tree state.
12. **Next phase:** Whether Phase 3B.3 is ready to begin.

### Final directive

You have explicit standing authorization for necessary in-scope work involving Visual Studio Code, the extension repository and Unreal Engine, including narrowly scoped sandbox exceptions and directly necessary development toolchains.

Do not repeatedly request approval for routine authorized operations.

Do not interact with unrelated applications or modify system-wide configuration.

Do not change antivirus settings.

Do not undo the working process-supervision architecture.

Focus on the remaining release qualification, real Build-and-Run integration, concurrency hardening and regression protection.

**Complete Phase 3B.2c, record the results, and stop. Do not begin Phase 3B.3 automatically.**