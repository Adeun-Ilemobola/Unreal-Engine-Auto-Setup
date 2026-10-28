# Unreal Engine Auto Setup — Phase 3B.0
## Engineering Preparation, Safety Design, and Implementation Handoff

### Context

The Unreal Engine Auto Setup VS Code extension has completed Phase 1, Phase 2, and Phase 3A.

Phase 3A established an interactive integration baseline using Unreal Engine 5.8.4, VS Code 1.143.1, MSVC 14.50.35739, and Windows SDK 10.0.22621.0.

The project retains its v0.8.0 extension identity and existing public interfaces.

The remaining safety concerns are:

- **P1.1:** Conflict-safe preservation during Unreal project-file regeneration remains blocked.
- **P1.2:** Build-process ownership across extension-host reload remains partially unresolved.
- **Debugger lifecycle:** Clean detach and subsequent reattachment remain unverified.

Your assignment is to prepare the technical implementation of Phase 3B.

**This is a bounded engineering-preparation task. Do not implement Phase 3B production fixes.**

### 1. Inspect existing material

Read the relevant records:

- `docs/audit/AUDIT_SUMMARY.md`
- `docs/audit/04-reliability-security.md`
- `docs/audit/06-proposed-architecture.md`
- `docs/audit/07-improvement-roadmap.md`
- `docs/DEVELOPMENT.md`
- Phase 1 maintenance reports.
- Phase 2 maintenance reports.
- Phase 3A result, validation, compatibility matrix and performance baseline.

Inspect current source and tests only where necessary to design the next work packages.

Do not conduct another full repository audit.

Record Git status and current HEAD before beginning.

### 2. P1.1 — Prepare conflict-safe regeneration design

Inspect the actual regeneration workflow and its existing tests.

Document:

- Files protected by regeneration.
- When snapshots are captured.
- When UBT can modify files.
- When restoration happens.
- Existing document and filesystem guards.
- How cancellation and failure affect restoration.
- Potential concurrent extension-owned operations.
- Shared engine configuration exposure.

Evaluate possible solutions, including:

- Conflict detection with recoverable versions.
- VS Code document version tracking.
- Filesystem identity and content verification.
- Explicit user-conflict handling.
- Isolation of generated output, if supported.
- Coordination with extension-owned descriptor modifications.

For each proposed solution, identify:

- What it can reliably prove.
- What it cannot prove.
- Data-loss risks.
- Compatibility implications.
- Necessary tests.
- Recovery strategy.

**Do not claim that file hashes alone identify the writer of a modification.**

Choose a recommended design only if it provides a defensible safety contract.

If evidence remains insufficient, identify the smallest experiment required to resolve the uncertainty.

Produce a clear implementation specification for the next Codex session.

Do not modify generation production code.

### 3. P1.2 — Prepare cross-reload process ownership design

Inspect:

- Build process creation.
- PowerShell wrapper execution.
- Child-process identification.
- Process-tree termination.
- Existing cancellation acknowledgement.
- Extension disposal.
- Operation coordinator lifecycle.
- Extension-host reload behavior.

Define a reliable ownership and recovery model.

Consider:

- A session-specific operation identity.
- Process identity and creation-time checks.
- Durable operation metadata.
- Recovery after extension-host reload.
- Distinguishing owned, unrelated and unknown processes.
- Conservative refusal when safety cannot be established.
- Cleanup and metadata expiration.
- Multiple VS Code windows.

Do not assume PID alone establishes process identity.

Do not introduce silent termination of an uncertain process.

Document the minimum safe approach and how it could be validated.

Do not implement process persistence or recovery code in this task.

### 4. Debugger lifecycle test specification

Inspect the current debugger implementation and available integration harness.

Prepare a repeatable test covering:

1. Launch disposable Unreal Editor.
2. Attach VS Code native C++ debugger.
3. Confirm the debug session is active.
4. Detach without terminating Unreal Editor.
5. Verify the Editor process remains alive.
6. Confirm debug-session cleanup.
7. Reattach to the same Editor process.
8. Detach again.
9. Close only the test-owned Editor.
10. Confirm test-owned process cleanup.

Identify any VS Code, debugger or operating-system limitations that prevent automation.

This is a test plan, not an authorization to perform destructive debugger experiments.

### 5. Disposable test environment

Use the existing ignored Phase 3A integration project:

`.local-test-projects/Phase3AIntegration/`

Confirm it exists and is excluded from Git.

Do not recreate the project unnecessarily.

Do not delete it.

For this preparation phase, do not launch Editor, compile, regenerate, or modify Unreal project files.

Preserve RPGX unchanged.

### 6. Implementation work packages

Create three independently executable Phase 3B implementation specifications:

**3B.1 — Regeneration Preservation and Conflict Recovery**

Include precise invariants, algorithms or pseudocode, expected module changes, regression fixtures, integration checks, rollback approach and acceptance criteria.

**3B.2 — Process Ownership and Cross-Reload Safety**

Include process identity, metadata lifecycle, recovery behavior, conservative blocking, cross-window considerations, test strategy and acceptance criteria.

**3B.3 — Debugger Detach and Reattach Validation**

Include the exact interactive or automated test workflow, expected observations, failure reporting and criteria for completion.

Each work package must include:

- Objective.
- Confirmed evidence.
- Unresolved assumptions.
- Required changes.
- Allowed test operations.
- Prohibited operations.
- Dependencies.
- Acceptance criteria.
- Stop conditions.

Sequence the packages to minimize integration risk.

### 7. Time and usage efficiency

This task is intentionally limited because the available Codex usage allowance is low.

Optimize for useful completion.

- Do not scan unrelated modules.
- Do not regenerate the entire feature inventory.
- Do not run the full 362-test Node suite unless necessary to validate changed test infrastructure.
- Do not run UnrealBuildTool.
- Do not launch Unreal Editor.
- Do not rebuild or package the extension.
- Do not install dependencies.
- Do not perform broad performance benchmarks.
- Do not reformat production source.
- Do not modify extension runtime behavior.
- Do not begin Phase 3B implementation.

Prefer targeted source inspection and existing evidence.

If execution is interrupted, preserve the completed preparation documents and clearly mark unfinished sections.

### 8. Maintenance archive

Create a new execution record, following the existing maintenance conventions.

Suggested identifier:

`0004-phase3b0-2026-10-27`

Adapt the identifier if a collision exists.

Include:

- `RESULT.md`
- `CHANGES.md`
- `VALIDATION.md`
- `REGENERATION_DESIGN.md`
- `PROCESS_RECOVERY_DESIGN.md`
- `DEBUGGER_TEST_PLAN.md`
- `PHASE_3B_HANDOFF.md`

Update the maintenance index.

Do not overwrite any existing prompt, report or historical execution record.

Save the exact effective Phase 3B.0 prompt in the maintenance prompt archive when available.

### 9. Handoff document

The most important deliverable is `PHASE_3B_HANDOFF.md`.

Make it concise enough for a fresh Codex session to use without rereading the entire historical repository documentation.

Include:

- Current extension baseline.
- Confirmed unresolved safety issues.
- Relevant source modules.
- Chosen implementation contracts.
- Remaining design decisions.
- Required regression tests.
- Dependencies between work packages.
- Recommended implementation sequence.
- Explicit acceptance criteria.
- Commands needed to verify the changes.
- Approvals needed for operations outside the existing testing scope.

Link to detailed design documents rather than duplicating them.

### 10. Completion criteria

Finish by reporting:

1. Which designs are ready for implementation.
2. Which assumptions remain unresolved.
3. Whether any experimentation is required before implementation.
4. Whether the disposable test project remains intact and ignored.
5. Which maintenance documents were created.
6. Whether production source remains unchanged.
7. The recommended starting task for the next session.

Do not begin implementing Phase 3B.

**Stop after completing the handoff and documentation.**

The goal is to make the upcoming implementation sessions shorter, safer, and more effective without spending this remaining usage allowance on an unfinished major code change.