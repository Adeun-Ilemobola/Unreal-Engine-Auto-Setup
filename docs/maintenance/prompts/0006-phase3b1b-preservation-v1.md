# Unreal Engine Auto Setup — Phase 3B.1b
## Complete Automatic Regeneration Preservation Without Sacrificing Data Integrity

### Mission

Continue the unfinished P1.1 implementation from Phase 3B.1.

The previous implementation successfully removed destructive snapshot restoration, added bounded recovery storage, conflict reporting, and synchronization for cooperating extension-owned writes.

However, ordinary UnrealBuildTool regeneration now produces preservation conflicts and leaves generated configuration modifications in place.

The original configuration is recoverable but is not automatically restored.

**Your task is to restore safe automatic preservation during ordinary regeneration while retaining the new protection against concurrent user edits.**

This is an implementation and validation assignment. Do not stop after another design review.

## 1. Current baseline

The previous Phase 3B.1 execution reported:

- 408 Node tests: 407 passing, one failing.
- Four Python tests passing.
- Syntax and packaging validation passing.
- Four actual UE 5.8.4 regeneration runs returning exit code zero.
- All four regeneration runs reporting preservation conflicts.
- Successful Development Editor compilation.
- Saved user edits preserved without destructive restoration.
- Approximately 0.68–0.88 seconds of recovery overhead per operation.
- Recovery data of approximately 2.27–3.27 MB per sample.

Treat these as historical results. Verify the current checkout before changing code.

The remaining failed test represents unfinished functionality. Do not remove it, skip it, or weaken its assertions simply to achieve a passing suite.

## 2. Operating permissions

The user authorizes independent work within the Unreal Engine Auto Setup repository and its designated disposable integration project.

You may use:

- Visual Studio Code.
- An isolated VS Code Extension Development Host.
- Unreal Engine 5.8.4.
- UnrealBuildTool.
- Existing repository-specific Git, Node.js, Python, PowerShell, compiler and testing commands necessary to operate those applications.

You may inspect, edit, compile, debug, test, regenerate, and perform controlled experiments within this scope.

Routine authorized operations do not require repeated user approval.

You may request narrowly scoped sandbox access only when necessary for these permitted operations.

You must not access unrelated graphical applications, projects, credentials, or system resources.

Do not modify system-wide configuration, install or upgrade software, replace the user's personal VS Code installation, or perform unrelated operations without separate approval.

Use the existing disposable test project:

`C:\Dev\VSCodeTools\unreal-auto-setup\.local-test-projects\Phase3AIntegration`

Verify its location and Git exclusion first.

Do not modify RPGX.

Do not delete the disposable project.

## 3. Read existing implementation and reports

Inspect the Phase 3B.1 records:

- RESULT.md
- CHANGES.md
- VALIDATION.md
- SAFETY_CONTRACT.md
- RECOVERY_BEHAVIOR.md
- INTEGRATION_RESULTS.md

Also inspect the relevant Phase 3B.0 design and Phase 3A compatibility records, where available.

Review the current implementation of:

- Regeneration snapshot and preservation logic.
- Recovery storage.
- Protected-file mutation detection.
- VS Code document-change tracking.
- Filesystem event tracking.
- Operation coordinator.
- Extension-owned write synchronization.
- Existing diagnostics and conflict reporting.

Identify the exact reason ordinary UBT changes are being classified as unresolved conflicts.

Do not repeat a full repository audit.

## 4. Establish the required behavior

### A. Ordinary regeneration

When regeneration completes without concurrent user modifications:

- Preserve existing user configuration automatically.
- Restore protected files to the appropriate pre-generation state.
- Preserve genuinely intended generated outputs.
- Avoid unnecessary conflict reports.
- Preserve existing C++ provider and VS Code configuration.
- Report the regeneration outcome accurately.

A successful UBT exit and successfully completed preservation should result in an ordinary successful operation.

### B. Concurrent user changes

If a user edits or saves a protected file during regeneration:

- Do not silently discard the user's newer version.
- Do not assume the change belongs to UBT.
- Preserve recoverable content.
- Report conflicts where ownership or intended outcome cannot be safely established.
- Explain what requires manual resolution.

This applies to saved edits, unsaved VS Code buffers, and external modifications.

### C. Failed or cancelled regeneration

Ensure failed or cancelled operations preserve available recovery data and report their execution and preservation outcomes separately.

### D. Repeated operations

A previous completed regeneration must not cause false conflicts on the next ordinary regeneration.

An unresolved conflict must not be silently discarded or treated as resolved.

## 5. Investigate the source of generated modifications

Determine exactly which protected files UnrealBuildTool modifies during normal regeneration.

Use controlled experiments against the disposable project.

Record:

- Pre-generation content.
- Post-generation content.
- File identities.
- Relevant timestamps.
- Observed VS Code document events.
- Observed filesystem events.
- UBT execution boundaries.
- Existing recovery snapshots.

Investigate whether UnrealBuildTool provides a verified, compatible method to isolate generated configuration output.

If supported, test that method with the actual engine and project before adopting it.

If isolation is unavailable, evaluate whether a controlled generation transaction can establish a sufficiently strong distinction between known generated modifications and observed concurrent edits.

**Do not assume that a quiet filesystem watcher proves no external process wrote a file.**

Do not assume that content equality or hash differences establish writer identity.

Document unavoidable limitations honestly.

## 6. Implementation strategy

Select the strongest defensible preservation strategy based on verified behavior.

Possible components include:

- Verified UBT output isolation.
- Pre-generation snapshots.
- Recovery copies.
- File identity verification.
- VS Code document-version tracking.
- In-scope mutation synchronization.
- Conditional restoration.
- Explicit conflict handling.
- Operation-state validation.

Implement the smallest reliable solution compatible with the existing architecture.

Preserve the Phase 3B.1 safety improvements.

Do not return to unconditional snapshot restoration.

Do not remove conflict detection merely because it inconveniences ordinary regeneration.

Do not treat an unverifiable external-write race as fully solved.

If automatic restoration cannot be established safely under the available constraints, preserve the conflict behavior and identify the specific missing guarantee rather than implementing a speculative workaround.

## 7. Regression tests

Add or update tests covering:

1. Successful ordinary regeneration.
2. Automatic restoration of protected configuration.
3. Existing C++ provider configuration preservation.
4. Repeated ordinary regeneration.
5. Saved VS Code edit during generation.
6. Unsaved VS Code document modification.
7. External file modification.
8. User save immediately before restoration.
9. Extension-owned descriptor modification.
10. File replacement or deletion.
11. Symlink and hard-link conflicts.
12. Failed UBT execution.
13. Cancelled UBT execution.
14. Recovery artifact failure.
15. Workspace switch during execution.
16. Existing unresolved recovery conflict.
17. Recovery-data retention and cleanup.
18. Accurate operation and diagnostic statuses.

Use deterministic synchronization for race tests.

Do not rely on arbitrary delays to prove concurrency safety.

Do not weaken existing tests or discard previous regression coverage.

## 8. Real Unreal Engine validation

Using the disposable UE 5.8.4 project:

1. Verify its baseline and Git-ignored status.
2. Confirm no unrelated test processes are running.
3. Capture relevant protected-file hashes.
4. Perform ordinary regeneration.
5. Verify that original protected configuration is automatically preserved.
6. Verify the C++ provider configuration remains valid.
7. Repeat ordinary regeneration to detect stale state.
8. Exercise controlled saved-edit behavior in disposable project files.
9. Confirm the saved user version is never silently overwritten.
10. Inspect conflict and recovery reporting.
11. Verify a successful Development Editor build.
12. Confirm no test-owned processes remain.

The ordinary regeneration acceptance target is:

**UBT exit 0, preservation successful, no unnecessary conflict, and protected configuration preserved.**

Do not claim that four successful UBT exits prove preservation works if the protected files remain modified.

Do not perform destructive conflict experiments against shared engine configuration.

## 9. Required validation

Execute:

- Targeted regeneration and recovery tests.
- Complete Node test suite.
- Existing Python tests.
- JavaScript syntax checks.
- Packaging preflight.
- Command and setting compatibility checks.
- Documentation link validation.
- Git diff and whitespace checks.
- Real VS Code/Unreal integration testing.

Report exact totals.

The previously failing ordinary-preservation test must pass before the task can be marked complete.

If an acceptance criterion remains blocked, report the blocker explicitly.

Do not hide failures or label partially validated behavior as fully verified.

## 10. Maintainability and scope

Keep the extension in CommonJS.

Retain:

- Extension ID `local-tools.unreal-project-tools`.
- Version 0.8.0.
- Existing public command identifiers.
- Existing five settings.
- Current build automation defaults.
- Existing C++ creation workflows.
- Existing dependency tooling.
- Conservative Live Coding behavior.
- Current recovery safety guarantees.

Do not implement Phase 3B.2 or Phase 3B.3.

Do not introduce unrelated features, broad architectural migrations, or new dependencies.

Do not publish, package a release, or install the extension into the user's normal profile.

## 11. Maintenance documentation

Archive this prompt as the next versioned maintenance task.

Create a new Phase 3B.1b execution record.

Include:

- RESULT.md
- CHANGES.md
- VALIDATION.md
- PRESERVATION_STRATEGY.md
- CONFLICT_MATRIX.md
- INTEGRATION_RESULTS.md

Update the maintenance index.

Document exactly which safety guarantees are established and which remain conditional or unverified.

Preserve all previous Phase 3B.1 recovery evidence and reports.

Do not automatically create Git commits.

## 12. Completion requirements

Report:

1. Root cause of the ordinary preservation conflicts.
2. Chosen preservation mechanism.
3. Why the mechanism is safer than the previous implementation.
4. Whether ordinary configuration is now restored automatically.
5. Whether concurrent user edits remain protected.
6. Whether the previously failing test now passes.
7. Final Node and Python test totals.
8. Real VS Code/Unreal regeneration outcomes.
9. Protected-file hash comparisons.
10. Remaining limitations and recovery procedures.
11. Maintenance documentation paths.
12. Whether P1.1 can now be classified as complete.

Continue autonomously through authorized implementation, debugging, testing, and documentation.

Do not request approval for routine in-scope operations.

Request approval only when a necessary operation exceeds the explicit application, system, or project boundaries.

**Do not proceed to Phase 3B.2 until this work is finished or its remaining limitations are clearly established.**

Stop after completing Phase 3B.1b.