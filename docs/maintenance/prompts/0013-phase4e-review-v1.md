# Unreal Engine Auto Setup — Phase 4E
## Independent Code Review, Defect Remediation, and Pre-Commit Qualification

### Mission

You are taking over my Unreal Engine Auto Setup VS Code extension repository after an implementation session performed by another AI coding agent using Google Antigravity.

That agent reports completing:

- Phase 3B.3z — C++ Creation and Snippets.
- Phase 3B.3 — Debugger Lifecycle.
- Phase 4 P4.1 — Native Extension-Host Testing.
- Phase 4 P4.2 — Unreal Engine Validation Reliability.
- Phase 4 P4.3 — Quality and Release Engineering.
- Unified Phase 4 integration testing.

**Your assignment is to independently verify its implementation, identify genuine bugs, correct verified defects, and establish whether the changes are ready for a Git commit.**

Do not assume the other agent's reports are accurate.

Do not assume the implementation is defective merely because another model wrote it.

Judge the actual code and test evidence.

This is a full engineering verification and remediation task, not a documentation review or an invitation to redesign working systems.

Proceed autonomously through all authorized work.

---

## 1. Standing authorization

The user explicitly authorizes necessary development and testing operations, including narrowly scoped operations outside the normal sandbox, within three areas:

1. **Visual Studio Code:** Its development hosts, isolated profiles, extension tests, debugging and related tooling.
2. **Extension repository:** `C:\Dev\VSCodeTools\unreal-auto-setup`, including source, tests, maintenance records, packaging and build tooling.
3. **Unreal Engine:** UnrealBuildTool, Unreal Editor and the existing disposable integration project.

Directly necessary Git, Node.js, npm, Python, PowerShell, Windows SDK, MSVC and Windows process-testing tools are authorized.

Do not repeatedly request approval for ordinary in-scope operations.

Respect execution-environment approval requirements when they apply.

Do not modify unrelated applications, files, projects or system-wide settings.

Do not install or upgrade toolchains, change Bitdefender settings, publish an extension, or modify the user's personal VS Code profile.

Only terminate positively identified test-owned processes.

Do not automatically commit, reset, rebase, clean or push Git changes.

### Mandatory scratch-directory convention

All temporary executables, compiled fixtures, isolated VS Code profiles, supervisor test files, validation packages and related generated test artifacts must use:

`C:\Dev\Scratch\UnrealAutoSetupTests`

Maintain isolated per-run directories, concurrency-safe cleanup, and process-scoped TEMP/TMP overrides.

Never modify system-wide TEMP/TMP or revert compiled test fixtures to the default Windows Temp directory.

Preserve permanent source files in their existing repository locations.

---

## 2. Preserve the current implementation

Another AI agent recently modified the working tree.

Its report identified:

- 13 modified tracked files.
- Several new test and tooling files.
- A new Windows CI workflow.
- New maintenance records.
- Additional native test harnesses.
- No automatic Git commit.

The previously reported baseline revision was `1d13b3a`, on branch `main`.

Confirm the actual current state.

Before editing:

1. Record Git branch and HEAD.
2. Run Git status.
3. Inspect staged and unstaged changes.
4. Enumerate untracked files.
5. Review the full diff against the starting revision.
6. Check whether another AI agent is still modifying the repository.
7. Confirm the disposable Unreal project is Git-ignored.
8. Identify previously generated scratch and recovery artifacts.
9. Preserve all unrelated existing work.
10. Establish the current test baseline.

If another agent or test harness is actively writing to the same repository, do not run competing mutations. Report the conflict and proceed with independent read-only inspection until ownership is clear.

Do not discard or blindly replace the existing implementation.

Do not rewrite code merely to match your preferred style.

---

## 3. Read engineering evidence efficiently

Review these records:

- `docs/maintenance/PHASE4_PROGRESS.md`
- `docs/maintenance/runs/0010-phase3b3z/`
- `docs/maintenance/runs/0011-phase3b3-debugger/`
- `docs/maintenance/runs/0012-phase4/`
- `docs/DEVELOPMENT.md`

The previous agent reported:

- 17 C++ creation templates.
- 67 creation-expansion tests.
- 20 native VS Code host scenarios.
- Eight Unreal validation fault-injection tests.
- 12 release checks.
- 483 Node tests, 482 passing with one known P1.1 failure.
- Four passing Python tests.
- Successful Unreal compilation of all 17 generated types.
- Real debugger attach, detach, reattach and Editor survival.
- A validation VSIX containing 51 assets.

Treat these as **claims requiring independent verification**, not established facts.

Avoid a new repository-wide historical audit.

Concentrate on changed code, changed behavior, boundary conditions and test credibility.

---

## 4. Work package A — Full Git diff and correctness review

Examine every changed and newly created source file.

Prioritize:

- `classTemplates.js`
- `classWizard.js`
- Class generation planner and writer.
- `debugger.js`
- `real-unreal-validation.js`
- `run-extension-tests.cjs`
- `host-runner-suite.js`
- `engine-validation-failures.test.js`
- `validate-release.cjs`
- `bundle_sources.py`
- `package.json`
- `snippets/unreal.json`
- `.github/workflows/windows-ci.yml`

Review their corresponding tests.

### Look for

- Broken imports or exports.
- Incorrect class-template metadata.
- Unsafe path construction.
- Filename and declaration mismatches.
- Invalid Unreal reflection macros.
- Faulty generated-header include ordering.
- Unsafe file overwrites.
- Race conditions.
- Incorrect process termination.
- Resource leaks.
- Incorrect VS Code API usage.
- Overly broad exception handling.
- Suppressed failures.
- Fake success conditions.
- Tests that validate their own mocks rather than production behavior.
- Unnecessary dependencies.
- Hardcoded developer-specific paths.
- Packaging omissions.
- CI assumptions that do not hold on clean Windows environments.

Distinguish:

- Confirmed defects.
- Potential risks requiring tests.
- Cosmetic improvement suggestions.

Fix confirmed defects.

Avoid optional refactoring unless necessary for correctness or maintainability.

---

## 5. Work package B — C++ creation verification

Review all 17 templates.

### Existing types

- UObject.
- Actor.
- Actor Component.
- Scene Component.
- Unreal Interface.
- Game Instance Subsystem.
- World Subsystem.
- Engine Subsystem.
- Local Player Subsystem.

### New types

- Character.
- Pawn.
- Player Controller.
- Game Mode Base.
- Blueprint Function Library.
- Data Asset.
- Reflected Struct.
- Reflected Enum.

Verify:

1. Correct Unreal inheritance.
2. Correct `U`, `A`, `F`, `E` naming.
3. Correct interface U/I declarations.
4. No double prefixes.
5. Valid filenames.
6. Correct module API macros.
7. Correct engine includes.
8. Correct `.generated.h` behavior.
9. Correct minimal constructors.
10. Valid reflection metadata.
11. Proper header-only Struct and Enum generation.
12. Dedicated per-class folders.
13. Correct Public/Private module structure.
14. Nested folder generation.
15. Correct source-to-header include paths.
16. Collision protection.
17. Invalid identifier rejection.
18. Symlink and path traversal protection.
19. Safe rollback on failed creation.
20. Existing creation workflow compatibility.

### VS Code integration

Verify the Explorer command actually exposes the template registry and the relevant QuickPick and InputBox behavior.

Do not assume that checking the command contribution proves the complete user interaction works.

Confirm native snippets work and are packaged.

### Unreal compilation

Independently inspect the previous integration harness.

Determine whether it really compiled all 17 generated types using UnrealHeaderTool and the relevant UnrealBuildTool target.

Repeat the smallest appropriate real compile test against the disposable project.

Do not trust a reported exit code without inspecting whether compilation and the required validation stages genuinely ran.

Fix any incorrect generated output.

---

## 6. Work package C — Debugger lifecycle verification

The previous agent added a duplicate-attach guard and a `detach()` function using:

`vscode.debug.stopDebugging(session)`

It reported successful real attachment, detachment, Editor survival, reattachment, and second detachment.

Verify that the implemented behavior matches those claims.

Inspect:

- Debug session identity.
- `cppvsdbg` configuration.
- Target PID association.
- Debug adapter ownership.
- Session-start and session-end events.
- Duplicate attach handling.
- Detach semantics.
- Editor lifetime.
- Extension activation/deactivation behavior.
- Relevant state cleanup.

### Required real workflow

Using the disposable Unreal project:

1. Start a positively identified test-owned Editor.
2. Attach using the extension's actual command path.
3. Confirm a real debug session is active.
4. Detach.
5. Verify the Editor remains alive.
6. Reattach to the same PID.
7. Detach again.
8. Verify no stale debug state remains.
9. Clean up only task-owned resources.

Distinguish a real debugger attach from a mocked or synthetic VS Code session.

If the full interactive test cannot be repeated safely, identify exactly which parts remain supported only by earlier evidence.

Do not label synthetic testing as real debugger validation.

Fix confirmed debugger lifecycle defects.

---

## 7. Work package D — Test-harness safety review

This is a critical part of the assignment.

Earlier phases invested heavily in safe Windows process supervision and verified process-tree ownership.

The new Phase 4 test harness must not undermine that work.

Inspect:

- `real-unreal-validation.js`
- `run-extension-tests.cjs`
- `host-runner-suite.js`
- New debugger and engine validation scripts.
- Process timeout and cleanup helpers.
- Native supervisor interactions.

### Process termination

Verify whether timeout handling uses verified process ownership and a safe process-tree boundary.

Do not assume that killing a root PID terminates every descendant.

Do not introduce broad `taskkill /IM`, process-name-wide termination, or unverified PID-based cleanup.

If a harness launches a managed process tree, termination must either use verified ownership or conservatively preserve uncertainty.

If an unsafe termination method exists, correct it and add a regression test.

### Host testing

The new host runner reportedly passes 20 scenarios.

Determine how many are genuinely exercised inside a real VS Code Extension Development Host.

In particular:

- Is extension activation real?
- Is the Explorer interaction actually exercised?
- Are WorkspaceEdit and Undo/Redo real?
- Are diagnostics observed through actual VS Code APIs?
- Does a reload test restart the actual extension host, or merely call an extension refresh function?
- Does cancellation exercise the real build process or only a mock?

Do not discard useful narrower tests.

Instead, label them accurately and add genuine integration coverage where practical.

### Unreal validation

Verify that required failed stages produce nonzero overall process exits.

Test:

- Successful validation.
- Failed command.
- Missing executable.
- Hung process.
- Cancelled process.
- Failed generation.
- Failed module build.
- Failed plugin build.
- Cleanup error.
- Partial-stage completion.

Ensure reports distinguish Passed, Failed, Skipped and Unknown correctly.

Do not let a partial result become a success.

---

## 8. Work package E — Release gate and CI audit

The previous report claims:

- 483 Node tests.
- 482 passing.
- One known P1.1 failure.
- 12/12 release checks passing.

This requires careful investigation.

### Critical issue: failure masking

Determine precisely why the consolidated release validator reports success despite a failing test suite.

The intended known failure is:

`tests/generation.test.js`

associated with P1.1 automatic regeneration-preservation behavior.

A release check must never treat an arbitrary test failure as acceptable.

The validator must distinguish the exact known issue from new failures.

Implement an explicit, narrow known-issue policy if necessary, with exact identification and transparent reporting.

Do not rely merely on the number of failures.

**A provisional qualification pass with one explicitly recognized known failure must not be represented as a fully green release gate.**

A strict release-readiness mode should report the unresolved test failure honestly.

If a baseline-aware development validation mode is retained, document its narrower semantics.

### Windows CI

Review the new GitHub Actions workflow.

Verify:

- Valid workflow syntax.
- Correct repository paths.
- Reproducible dependency installation.
- No dependency on personal workstation paths.
- Appropriate temporary directories.
- Windows runner compatibility.
- Native helper compilation.
- Correct test exit handling.
- No hidden reliance on locally installed Unreal Engine.
- Unreal-required tests gated appropriately.
- No secrets embedded in source.
- Correct artifact packaging behavior.

Do not claim the remote workflow has passed unless it has actually run in its target environment.

Do not push or trigger remote CI without separate authorization.

### VSIX

Produce and inspect a validation-only VSIX.

Confirm:

- Extension identity.
- Version 0.8.0.
- Runtime modules.
- Native helper.
- Snippet assets.
- Required documentation.
- No test fixtures.
- No recovery data.
- No ignored disposable projects.
- No local scratch artifacts.

Where practical, load the validation VSIX into an isolated VS Code profile and exercise the relevant functionality.

Do not overwrite or install into the user's normal profile.

---

## 9. Work package F — Regression validation

After fixing confirmed issues, execute:

1. Focused tests for changed modules.
2. Complete Node suite.
3. Python tests.
4. JavaScript syntax checks.
5. Manifest validation.
6. Native helper integrity checks.
7. Packaging preflight.
8. Import/export compatibility checks.
9. Public command and settings checks.
10. Documentation consistency checks.
11. Scratch-directory compliance.
12. Git whitespace checks.
13. Native VS Code host tests.
14. Appropriate real UnrealBuildTool integration.
15. Debugger lifecycle validation.
16. Process-ownership cleanup verification.

Record exact commands, counts and outcomes.

### Preserve existing P1.1 limitation

P1.1 remains unresolved.

UnrealBuildTool modifies protected VS Code configuration, and no verified isolation or writer-authenticated restoration boundary has been established.

Do not attempt another speculative P1.1 fix.

Do not remove or weaken its failing acceptance test.

Do not silently accept UBT-modified configuration as the new baseline.

Do not make the release gate appear completely green by suppressing this known failure.

No new unexplained test failures are acceptable for Phase 4E completion.

---

## 10. Engineering priorities and efficiency

Focus on the highest-risk and highest-value issues first:

1. Release-gate failure masking.
2. Unsafe process termination.
3. False real-integration claims.
4. Actual debugger detach safety.
5. Correct Unreal C++ generation.
6. Packaging and CI reliability.
7. Documentation accuracy.

Use targeted tests during investigation.

Avoid repeated heavyweight Unreal builds unless changes require them.

Do not conduct another broad historical audit.

Do not introduce new features.

Do not reorganize working modules for cosmetic reasons.

Do not start Phase 5.

Only modify files that need corrections or tests.

The goal is **independent validation and remediation**, not rewriting Gemini's implementation.

---

## 11. Maintenance records

Create a new maintenance record using the next available identifier.

Suggested:

`docs/maintenance/runs/0013-phase4e-review/`

Archive the exact effective prompt.

Required reports:

- `RESULT.md`
- `FINDINGS.md`
- `CHANGES.md`
- `VALIDATION.md`
- `RELEASE_GATE_REVIEW.md`
- `INTEGRATION_EVIDENCE.md`

Update the maintenance index.

### Findings classification

For every issue, record:

- Severity.
- Affected file.
- Reproduction evidence.
- Whether the defect is confirmed.
- Correction made.
- Regression test added.
- Validation result.
- Remaining limitation, if any.

Avoid treating cosmetic preferences as critical defects.

Preserve original Phase 4 reports as historical evidence, including any incorrect claims. Correct current documentation rather than silently rewriting history.

Do not automatically commit changes.

---

## 12. Final acceptance criteria

Phase 4E may be classified Complete only when:

- The entire incoming Git diff has been reviewed.
- All confirmed high-severity defects are fixed or explicitly blocked.
- No unsafe process termination remains in relevant new harnesses.
- Reported real integration evidence has been verified or appropriately qualified.
- Class generation is correctly implemented and appropriately tested.
- Debugger lifecycle evidence is credible.
- Release validation cannot silently accept unrelated test failures.
- Windows CI is validated to the extent possible without unauthorized remote actions.
- VSIX packaging is verified.
- Existing process-supervision safeguards remain intact.
- New targeted regression tests pass.
- Full-suite results distinguish the known P1.1 failure from regressions.
- Task-owned processes and temporary artifacts are handled safely.
- Documentation accurately represents what was tested.
- The user has a clear commit-readiness assessment.

If some criteria cannot be established, classify the result Partially Complete.

Do not invent success.

---

## 13. Final report

Provide:

### Overall outcome

Complete, Partially Complete or Blocked.

### Independent review findings

Summarize verified defects, false positives and accepted limitations.

### Corrections

List material changes and their reasons.

### Validation

Provide exact Node, Python, host, native, Unreal, packaging and debugger results.

### Release readiness

Distinguish:

- Safe to commit.
- Suitable for continued development.
- Suitable for test VSIX installation.
- Production release-ready.

These are separate classifications.

### P1.1

Clearly state that regeneration preservation remains unresolved.

### Git

Provide starting HEAD, changed files, final status and any remaining untracked files.

Do not automatically commit.

### Next action

State whether the user should commit the verified Phase 4 work or whether an additional targeted correction is necessary.

---

# Final directive

You have standing authorization for necessary work involving Visual Studio Code, the extension repository, Unreal Engine, and their directly required toolchains, including appropriately scoped sandbox exceptions.

Do not repeatedly request permission for routine authorized actions.

Preserve Gemini's existing work.

Inspect the actual implementation and independently verify its claims.

Fix confirmed defects without unnecessary redesign.

Keep the known P1.1 failure visible.

Maintain the dedicated test scratch directory.

Complete Phase 4E verification, produce an evidence-based commit-readiness assessment, and stop.

**Do not automatically commit, push, publish, or start another development phase.**