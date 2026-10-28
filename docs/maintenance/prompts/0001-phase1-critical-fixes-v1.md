# Unreal Engine Auto Setup — Phase 1 Implementation

## Role and objective

You are working in the existing Unreal Engine Auto Setup Visual Studio Code extension repository.

Your assignment is to implement **Phase 1 — Critical Fixes and Confirmed Defects**, based on the completed repository audit.

This is an implementation task, not another comprehensive audit.

The extension is currently functional and has an established v0.8.0 baseline. The prior audit reported 301 passing tests, but identified reliability defects and edge cases requiring correction.

**Primary objective:** Improve data integrity, process cancellation, resource lifecycle management, engine discovery, target parsing, and workspace-state safety without breaking existing functionality.

Preserve the current architecture wherever possible. Do not undertake an unrelated refactor.

## 1. Mandatory preparation

Before making changes:

1. Read `docs/audit/AUDIT_SUMMARY.md`.
2. Read `docs/audit/04-reliability-security.md`.
3. Read `docs/audit/05-testing-and-tooling.md`.
4. Read `docs/audit/07-improvement-roadmap.md`.
5. Consult `docs/audit/01-current-architecture.md` and `06-proposed-architecture.md` for architectural context.
6. Inspect relevant source files and existing tests.
7. Check `git status`, the current branch, and HEAD revision.
8. Identify any existing uncommitted user changes and preserve them.

Treat the audit findings as evidence and starting points, not as a substitute for inspecting the actual source code.

Do not assume that repository line numbers are unchanged.

Record the initial state and existing behavior before implementation.

### Baseline validation

Run existing safe tests and syntax checks where practical.

The repository previously reported 301 passing tests. The current total may increase as new regression tests are introduced.

Do not assume the historical number is still the correct expected count.

Do not modify production files to accommodate broken test-environment permissions.

## 2. Maintenance documentation and history

Use the existing `docs/maintenance/` directory if available.

Otherwise create a minimal directory structure:

```text
docs/
  audit/
    ... existing reports ...
  maintenance/
    README.md
    INDEX.md
    prompts/
    runs/
    decisions/
```

Do not move or rewrite historical audit reports.

Archive the complete effective Phase 1 prompt in `prompts/`, using the next available task ID and version.

Use immutable prompt versions such as:

`0001-phase1-critical-fixes-v1.md`

If the same prompt ID already exists, do not overwrite it. Use the appropriate existing version or next available identifier.

Each execution should have a separate run directory containing:

- `RESULT.md`
- `CHANGES.md`
- `VALIDATION.md`

Record the initial and final Git revisions, if available, and any relevant commits.

Do not automatically create commits.

Document implementation decisions, rejected alternatives, and limitations. Link the run from `INDEX.md`.

Do not duplicate full source-code backups. Use Git for source history.

## 3. Implementation strategy

Work through P1.1, P1.2, P1.3, and P1.4 sequentially.

For each work package:

1. Inspect the relevant implementation.
2. Reproduce the audit finding where possible.
3. Add regression tests demonstrating the undesired behavior.
4. Implement the smallest reliable correction.
5. Run targeted tests.
6. Run the full unit suite where practical.
7. Review the diff for unintended changes.
8. Record findings, changes, and validation.

Continue automatically when tests and safety checks pass.

If an important safety requirement cannot be satisfied, do not implement a speculative workaround. Preserve the working baseline, document the blocker, and continue only with independent work packages that can safely proceed.

Do not fabricate successful validation.

---

# P1.1 — Conflict-safe project-file regeneration

## Problem

The audit confirmed that `generation.js` can restore original configuration or descriptor bytes over a saved edit made while regeneration is running.

The current preservation strategy snapshots files before UnrealBuildTool executes and restores them afterward without sufficiently distinguishing generated changes from concurrent edits.

This creates a data-loss risk.

## Required changes

Design and implement a conflict-aware regeneration preservation mechanism.

It must:

- Preserve existing user configuration when regeneration legitimately modifies generated metadata.
- Detect relevant filesystem and open-document changes during regeneration.
- Avoid silently overwriting newer saved user changes.
- Detect ambiguous modifications and report them.
- Preserve recoverable versions where necessary.
- Handle successful, failed, and cancelled generation.
- Prevent ambiguous restoration from being reported as complete success.
- Preserve meaningful error messages and recovery information.
- Avoid introducing destructive behavior for symlinks, hard links, or unexpected file replacement.
- Keep compatibility with the existing Unreal Engine generation workflow.

Inspect whether UBT provides a validated output-isolation mechanism before selecting the final preservation strategy.

Do not assume that comparing only pre-run and post-run hashes can identify which process made a change.

Where ownership of a change cannot be determined safely, retain recoverable data and surface an explicit conflict instead of making a destructive guess.

### Concurrency and ownership

Investigate overlapping operations involving:

- Class creation.
- Module creation.
- Plugin creation.
- Project descriptor updates.
- Project-file regeneration.
- Shared engine configuration.

Coordinate extension-owned operations where necessary to prevent conflicting writes.

Do not introduce a broad operating-system-level locking framework unless clearly justified.

### Regression tests

Add tests for:

1. Ordinary successful regeneration.
2. Successful regeneration that changes protected configuration.
3. Saved user edit during generation.
4. Unsaved VS Code document edit during generation.
5. Concurrent descriptor creation or modification.
6. Regeneration failure.
7. Regeneration cancellation.
8. Restore failure.
9. File deletion or replacement.
10. Symlink/hard-link conflict.
11. Shared engine configuration conflicts.
12. Preservation and recovery of conflicting versions.

Use disposable fixtures.

Do not run destructive experiments against an existing real project.

### Acceptance criteria

- No newer saved user change is silently overwritten.
- Unambiguous generator changes are handled correctly.
- Ambiguous modifications produce actionable conflict reporting.
- Failed/cancelled generation does not cause silent data loss.
- The existing user-configuration preservation contract remains functional.
- All relevant regression tests pass.

---

# P1.2 — Cancellation and resource lifecycle

## Problem

The audit identified two related issues in `build.js`.

**F02:** A failed or ineffective process termination request can leave the build completion promise pending indefinitely.

**F03:** Completed operations retain terminal and EventEmitter references in the extension context subscriptions.

The audit reproduced the second problem using mocked operations; ten completed builds added 30 subscriptions.

## Required changes

Introduce explicit process cancellation outcomes and bounded operation-resource ownership.

Cancellation must distinguish:

- Cancellation requested.
- Termination request accepted.
- Process exit confirmed.
- Process termination failed.
- Process termination unconfirmed.

A cancellation request must not automatically imply that the process has terminated.

### Process termination

Improve the existing Windows process-tree termination workflow.

Ensure that:

- Termination errors are captured.
- Failure is reported.
- Waiting for acknowledgement is bounded.
- Already-exited processes are handled.
- Repeated cancellation is safe.
- The extension does not launch an overlapping build while a previous process may remain active.
- The operation coordinator remains consistent with the actual process state.

If termination cannot be established, provide a safe blocked/recovery state rather than falsely reporting successful cancellation.

Do not resolve the user-facing status as safely cancelled while silently releasing the operation gate for another build.

### Resource ownership

Review all operation-specific terminals, listeners, EventEmitters, and callbacks.

Establish clear ownership and disposal rules.

Prefer a service-level disposable and a bounded operation-resource scope.

Release completed-operation resources promptly without destroying resources still required for active terminals, diagnostics, or user-visible history.

Preserve the intended ten-operation bounded history and build-output behavior.

### Regression tests

Cover:

1. Normal cancellation.
2. Failed termination request.
3. Termination request with no subsequent child close event.
4. Child process already exited.
5. Repeated cancellation.
6. Cancellation during regeneration.
7. Cancellation during compilation.
8. Extension disposal/reload.
9. Repeated completed builds.
10. EventEmitter and context-subscription retention.
11. Cancellation under an active operation gate.
12. Recovery after confirmed process termination.

Use mocked subprocesses for deterministic failure cases.

Where available and safe, supplement with a disposable real Windows child-process test.

Never terminate an unrelated process or an existing user-owned Unreal Editor session.

### Acceptance criteria

- Cancellation cannot remain silently pending without a defined outcome.
- An unconfirmed process state never permits unsafe overlapping work.
- Completed operations do not accumulate unbounded subscriptions.
- History and diagnostics remain functional.
- Existing manual and automatic build coordination remains intact.

---

# P1.3 — Engine capability and target detection

## Problem

The audit confirmed two defects.

**F04:** Automatically discovered engine candidates require both `Build.bat` and `UnrealEditor.exe` even when the caller requests fewer capabilities. Configured or manually selected engines behave differently.

**F05:** Target-type detection can mistake a string literal containing `Type = TargetType.Editor` for an actual C# assignment.

## Engine capability requirements

Inspect `engine.js`.

Create a consistent engine-capability validation policy across:

- Configured engines.
- Automatically discovered engines.
- Manually selected engines.

Respect the caller's actual requirements for build capability and Editor capability.

Keep version-policy validation separate from executable-capability validation.

Do not expand support to unverified operating systems or engine layouts.

### Engine tests

Cover the combinations of:

- Build required / Editor required.
- Build required / Editor not required.
- Editor required / Build not required.
- Neither explicitly required.

Test those combinations against configured, discovered, and picked engine candidates.

Include missing-executable and incompatible-version cases.

## Target-type inference

Inspect `project.js`.

Replace fragile literal-insensitive detection with a bounded, conservative implementation.

The detector should:

- Ignore comments where appropriate.
- Ignore misleading string and character literals.
- Recognize conventional actual target-type declarations.
- Preserve existing supported Editor, Game, Client, Server, and Program behavior.
- Return Unknown when it cannot safely infer the target.
- Avoid executing arbitrary project C#.
- Avoid adding a heavyweight parser without clear necessity.

Test conventional assignments, string literals, comments, multiline syntax, and ambiguous cases.

### Acceptance criteria

- Equivalent capability requirements produce consistent results across engine sources.
- Valid build-only or Editor-only requirements are not rejected because of unrelated executable requirements.
- Literal text does not impersonate a real target assignment.
- Existing target workflows remain compatible.
- No unsupported engine-version certification is implied.

---

# P1.4 — Workspace identity and asynchronous safety

## Problem

The audit found potential lifecycle issues in:

- `extension.js`
- `runtimeWatcher.js`
- `dependencyActions.js`

Some operations retain workspace/project references across asynchronous boundaries.

A watcher can also mutate internal state before its publication-epoch check.

One background promise lacks an explicit rejection handler.

The audit did not reproduce every suspected workspace-switch failure. Do not treat unverified outcomes as confirmed defects.

## Required investigation

First write deterministic interleaving tests.

Investigate:

- Workspace changing during engine discovery.
- Workspace changing during setup dialogs.
- Workspace changing during configuration updates.
- Project switching during runtime reconciliation.
- Stale watcher collection finishing after a newer project becomes active.
- Build.cs deletion during dependency parsing.
- Malformed project descriptors.
- Background parsing failures.

Use controlled barriers or injected promises instead of relying on arbitrary delays.

## Required corrections

Where tests demonstrate unsafe behavior:

- Add project/workspace identity checks before mutations.
- Introduce or reuse explicit operation epochs where appropriate.
- Prevent stale asynchronous work from changing the active project's state.
- Report background errors through an appropriate diagnostic boundary.
- Validate relevant descriptor structures before accessing arrays or properties.
- Preserve successful existing behavior and cancellation semantics.

Do not add large new architecture solely to guard an unproven hypothetical scenario.

### Acceptance criteria

- No reproduced scenario writes to the wrong project.
- Stale operations cannot publish incorrect active-project state.
- Background promise rejections are handled.
- Malformed inputs produce understandable errors rather than incidental TypeErrors.
- Existing workspace initialization behavior remains functional.

---

# 4. Preserve existing functionality

This is a targeted reliability release.

Preserve:

- Extension identifier `local-tools.unreal-project-tools`.
- Current command identifiers and settings.
- Existing extension activation behavior unless a required safety fix demands a minimal change.
- Native VS Code TreeView and status bar.
- C++ class, module, and plugin wizards.
- Safe Build.cs dependency editing.
- Manual Build and Run.
- Opt-in automation modes.
- Saved-change tracking and debounce.
- Revision-aware operation coordination.
- Existing Editor running/Unknown safeguards.
- Conservative Live Coding behavior.
- Existing IntelliSense companion integration.
- Existing Windows/Win64 scope.
- Existing project setup configuration-preservation guarantees.

Do not introduce unrelated features, architecture migrations, TypeScript conversion, new UI frameworks, or dependency upgrades.

Do not rename modules merely for style.

Do not migrate any Unreal Engine project.

Do not change the extension's release version unless separately authorized.

---

# 5. Testing and validation

After each work package, run the relevant regression tests.

After all safe implementations are complete:

1. Run the existing full Node test suite.
2. Run JavaScript syntax checks.
3. Check command and setting compatibility.
4. Check Git diff for accidental changes.
5. Validate generated maintenance documentation.
6. Check package/runtime source inclusion rules if files were added or moved.
7. Report remaining untested integration scenarios.

If live VS Code or real Unreal integration tests require an installed engine, use only an explicitly designated disposable project and preserve existing workspaces.

Do not run potentially destructive integration tests against a production project.

Do not overwrite existing VSIX installers or source bundles during validation.

Do not run the packaging script simply to prove that unit tests pass.

The previous baseline was 301 passing tests. Report the actual new result and new test count rather than repeating the historical figure.

Historical Unreal Engine 5.8.1 validation must remain labeled historical unless it is actually reproduced.

---

# 6. Implementation documentation

Write a factual result for every completed work package.

For each P1 task, record:

- Original finding and evidence.
- Reproduction status.
- Root cause.
- Files changed.
- Implementation strategy.
- Alternatives considered.
- Regression tests added.
- Test results.
- Remaining limitations.
- Any changes to documented behavior.

Update the maintenance execution record as implementation progresses.

Keep the original audit documents unchanged as historical evidence.

Record decisions that may influence future implementation.

Do not claim a fix is complete when a required acceptance criterion remains unresolved.

---

# 7. Completion report

Provide a final summary containing:

## Implementation status

Show P1.1, P1.2, P1.3, and P1.4 individually as:

- Complete.
- Partially complete.
- Blocked.
- Not started.

## Code changes

Summarize what was changed and why.

## Validation

Report the exact commands executed and test counts.

Separate mocked tests from real Windows/VS Code/Unreal integration tests.

## Safety

Explain how user configuration is protected and what happens when process termination cannot be confirmed.

## Compatibility

Identify any user-facing behavioral changes, preserved APIs, and limitations.

## Documentation

Provide paths to archived prompts, execution reports, validation records, and decisions.

## Next steps

Identify any remaining Phase 1 issues and the prerequisites for Phase 2.

**Do not begin Phase 2 architecture restructuring, Phase 3 modernization, or feature development.**

## Final instruction

Work methodically and implement the confirmed defects rather than endlessly expanding the audit.

Prioritize correctness, regression protection, preservation of user data, and stable behavior.

Where a defect is reproduced, fix it.

Where a suspected defect is not reproduced, document the evidence and avoid speculative modifications.

When the scoped Phase 1 work and its documentation are complete, stop.