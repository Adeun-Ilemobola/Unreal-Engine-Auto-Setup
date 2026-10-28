# Unreal Engine Auto Setup — Phase 3B.1
## Conflict-Safe Regeneration, Data Integrity, Recovery, and Real Integration Validation

### Mission

You are working on my custom Visual Studio Code extension, **Unreal Engine Auto Setup**, currently at version 0.8.0.

The extension has completed:

- Phase 1 — Reliability fixes and initial safety hardening.
- Phase 2 — Architecture, maintainability, and code organization.
- Phase 3A — Real Unreal Engine 5.8.4 compatibility and integration validation.
- Phase 3B.0 — Engineering preparation and implementation planning, if its handoff documents exist.

Your assignment is **Phase 3B.1: implement, test, and validate a safe regeneration-preservation mechanism addressing the unresolved P1.1 defect.**

This is an authorized implementation task.

Do not stop after planning or produce only an architecture proposal.

Inspect the existing implementation, establish the required safety contract, implement the solution, test it, document it, and provide a final engineering report.

Work independently within the permissions and safety boundaries defined below.

---

# 1. Operating permissions and autonomy

## 1.1 Authorized applications

You have permission to interact with exactly two graphical applications:

1. **Visual Studio Code**
2. **Unreal Engine**

You may use these applications as necessary to complete the assigned work.

This includes:

- Opening the extension repository.
- Inspecting and modifying source files.
- Running project-specific commands.
- Running tests.
- Launching VS Code Extension Development Hosts.
- Opening disposable Unreal projects.
- Running UnrealBuildTool.
- Generating project files.
- Compiling disposable Unreal C++ projects.
- Inspecting relevant Editor output and diagnostics.
- Debugging extension behavior.
- Reproducing failures in controlled test environments.
- Validating fixes through real application integration.

You may use VS Code's integrated terminal and the necessary command-line tools supporting these applications, including Git, Node.js, npm, Python, PowerShell, MSVC, Windows SDK tools, and Unreal command-line executables.

These permissions apply only to commands needed for the authorized extension and Unreal integration work.

Repository-local validation and existing CI scripts may be inspected or executed where safe. Do not access or modify unrelated external CI services or accounts.

## 1.2 VS Code profile access

I may provide the exact VS Code profile used for Unreal Engine development.

If a profile name or identifier is explicitly supplied, use it for relevant integration testing.

Do not guess which personal profile is intended.

If no profile is provided, proceed using an isolated VS Code Extension Development Host with an appropriately separated profile or user-data environment.

Do not modify unrelated VS Code profiles.

Preserve existing personal settings and extensions.

Installing or loading the current extension in an isolated development-test host is authorized. Replacing the extension in my normal personal profile requires separate approval unless I explicitly designate that profile for replacement.

## 1.3 Autonomy expectations

You are authorized to complete the entire Phase 3B.1 scope without requesting individual approvals for routine development actions.

Do not repeatedly ask permission to:

- Read relevant repository files.
- Create or modify in-scope extension source files.
- Add or update regression tests.
- Execute existing test scripts.
- Use VS Code for debugging.
- Launch the isolated Extension Development Host.
- Create and modify disposable test fixtures.
- Run authorized Unreal project regeneration.
- Build the disposable Unreal project.
- Inspect relevant logs.
- Run safe validation commands.
- Update maintenance documentation.
- Perform another targeted test after a failure.
- Clean up files and processes created exclusively by this task.

Do not stop after discovering a problem that can be solved safely within the approved scope.

Investigate the failure, establish the cause, apply a defensible fix, and rerun the relevant validation.

Use engineering judgment to select the smallest robust implementation.

Do not expand the task into unrelated feature development.

## 1.4 Sandbox and permission boundaries

Use the existing sandbox wherever possible.

Narrowly scoped sandbox elevation may be requested only when necessary for authorized VS Code or Unreal Engine development and testing.

Any elevated access must be restricted to:

- The extension repository.
- Relevant VS Code development-host files and processes.
- The designated disposable Unreal test project.
- Required Unreal Engine executables and their test-generated files.
- Necessary project-specific compiler and toolchain operations.

Do not request unrestricted computer access merely for convenience.

Do not disable security controls globally.

Do not modify system-wide permissions to work around a test failure.

Do not access unrelated files, applications, credentials, browsers, accounts, personal directories, or system services.

A sandbox approval is not permission to interact with other applications or expand the project scope.

If the environment requires approval for an operation that cannot be performed within the authorized boundary, request only that specific permission. Do not repeatedly attempt broader escalation.

Continue with independent authorized work if one operation is blocked.

## 1.5 Actions requiring explicit additional approval

Do not perform these actions without my separate approval:

- Accessing or controlling graphical applications other than VS Code and Unreal Engine.
- Installing, updating, or removing Unreal Engine.
- Installing or updating Visual Studio or system-wide toolchains.
- Changing the Windows registry or global environment configuration.
- Modifying Unreal Engine installation source files.
- Rebuilding the Unreal Engine installation itself.
- Changing system-wide security or sandbox settings.
- Accessing unrelated projects or directories.
- Running destructive operations against existing personal projects.
- Publishing the extension.
- Uploading private project content to an external service.
- Installing or replacing the extension in an unapproved personal VS Code profile.
- Making changes outside the defined Phase 3B.1 functionality.
- Starting Phase 3B.2 or Phase 3B.3.

If an action genuinely requires additional approval, explain the reason and the narrow operation needed.

Do not interpret general development authorization as permission for unrestricted machine access.

---

# 2. Established environment

Phase 3A reported the following validated environment:

| Component | Baseline |
|---|---|
| Unreal Engine | 5.8.4 |
| Engine installation | Epic installed build |
| VS Code | 1.143.1 |
| MSVC | 14.50.35739 |
| Windows SDK | 10.0.22621.0 |
| Extension version | 0.8.0 |
| Extension ID | `local-tools.unreal-project-tools` |
| Runtime architecture | CommonJS JavaScript |

Phase 3A successfully validated:

- Interactive VS Code Extension Development Host operation.
- Project initialization and configuration preservation.
- C++ class, module, and plugin creation.
- Dependency editing and undo/redo.
- Ordinary Unreal project-file regeneration.
- Five successful UnrealBuildTool builds.
- Two expected controlled build failures and successful recovery.
- Editor detection and Run reuse.
- Basic debugger attachment.

Ordinary regeneration preserved all 22 observed protected-file hashes.

That result does **not** establish concurrent-edit safety.

The last reported source baseline was 362 passing Node tests, four passing Python tests, and one existing TODO.

Verify the current repository state rather than treating these historical numbers as current execution results.

---

# 3. Repository and test-project locations

The previously established repository location is:

`C:\Dev\VSCodeTools\unreal-auto-setup`

The existing disposable integration project is:

`C:\Dev\VSCodeTools\unreal-auto-setup\.local-test-projects\Phase3AIntegration`

Verify both paths before using them.

The integration project was previously reported as Git-ignored and approximately 2.96 GB.

Reuse it rather than creating another large Unreal project unnecessarily.

### Git protection

Before modifying files:

1. Inspect `git status`.
2. Record the current branch and HEAD.
3. Identify existing uncommitted modifications.
4. Verify the disposable test-project directory is ignored.
5. Confirm that tests cannot accidentally add Unreal-generated assets to version control.
6. Preserve existing history and unrelated user changes.

Do not automatically reset, clean, revert, or delete existing repository content.

Do not create Git commits unless explicitly authorized.

---

# 4. Read the existing Phase 3B evidence

Consult the existing documentation before implementing changes.

Relevant documents include:

- `docs/audit/AUDIT_SUMMARY.md`
- `docs/audit/01-current-architecture.md`
- `docs/audit/04-reliability-security.md`
- `docs/audit/05-testing-and-tooling.md`
- `docs/audit/06-proposed-architecture.md`
- `docs/audit/07-improvement-roadmap.md`
- `docs/DEVELOPMENT.md`
- Phase 1 implementation records.
- Phase 2 maintenance records.
- Phase 3A result and validation reports.

If Phase 3B.0 was completed, locate:

- `REGENERATION_DESIGN.md`
- `PROCESS_RECOVERY_DESIGN.md`
- `DEBUGGER_TEST_PLAN.md`
- `PHASE_3B_HANDOFF.md`

Read the regeneration design and handoff before making implementation decisions.

If these documents are absent, do not invent their contents or restart a comprehensive audit. Use the existing audit findings and actual source code to proceed.

Prioritize the relevant files, including:

- `generation.js`
- `runner.js`
- `runtimeCoordinator.js`
- `build.js`
- `runtime.js`
- `runtimeWatcher.js`
- `creation.js`
- `classFiles.js`
- Related test modules.

Inspect additional source only where relevant.

---

# 5. P1.1 — Confirmed defect

The original audit identified a data-integrity defect in project-file regeneration.

The extension snapshots protected project and configuration files before running UnrealBuildTool.

After regeneration, the existing implementation can restore original bytes even if a user or another operation saved a newer version while regeneration was in progress.

A disposable audit probe demonstrated this overwrite behavior.

### Why this matters

A user could modify a protected file while project-file generation is active.

The current restoration process may restore an older version over those changes.

This can result in silent data loss.

### Engineering objective

Implement a regeneration-preservation mechanism that:

1. Retains existing configuration-preservation functionality.
2. Prevents silent destructive restoration.
3. Detects conflicts wherever reliable evidence exists.
4. Preserves recoverable content when conflicts occur.
5. Reports unresolved conflicts accurately.
6. Integrates with the existing operation coordinator.
7. Handles success, failure, cancellation, and recovery.
8. Does not weaken the extension's current safety guarantees.

**Important:** File hashes, timestamps, or modification order alone cannot reliably identify whether UBT, another process, or the user wrote a particular change.

Do not implement a false ownership assumption.

---

# 6. Establish the safety contract

Before implementing, define explicit invariants.

At minimum:

### Invariant A — No silent destructive restoration

Never knowingly replace a newer or conflicting user edit with an older snapshot without preserving the newer content and explicitly reporting the conflict.

### Invariant B — Recoverable ambiguity

If the extension cannot distinguish a generated change from a concurrent external modification, it must not falsely claim that restoration was conflict-free.

Preserve available evidence and provide an actionable recovery path.

### Invariant C — Correct successful behavior

Ordinary project-file regeneration, without concurrent modifications, must continue to preserve user configuration as previously validated.

### Invariant D — Failure safety

A failed or cancelled UnrealBuildTool operation must not automatically trigger unsafe restoration.

### Invariant E — Operation identity

Restoration must remain associated with the exact project and operation that initiated regeneration.

A workspace switch or stale callback must not restore files into another project.

### Invariant F — No fabricated guarantees

Do not claim that all concurrent external writes are preventable if the selected implementation does not actually prevent them.

If reliable prevention requires a supported generator-isolation mechanism, blocking protocol, or stronger synchronization, establish that evidence before claiming success.

### Invariant G — Recoverable operation state

A regeneration operation with unresolved preservation conflicts must not be reported as fully successful merely because UnrealBuildTool exited with code zero.

Keep execution status and preservation status distinguishable.

Document the exact guarantees the implementation can and cannot make.

---

# 7. Determine the implementation strategy

Use the Phase 3B.0 design if available, but verify it against the actual source.

Investigate the following approaches.

## 7.1 Generator output isolation

Determine whether UnrealBuildTool supports a documented and compatible mechanism for generating relevant files into an isolated destination.

Do not assume such a mechanism exists.

If reliable isolation is supported, evaluate staging and conflict-checked commit behavior.

Verify that staged results accurately represent the intended project and preserve project identity.

Do not introduce a temporary duplicate-engine workflow that silently changes semantics.

## 7.2 Transaction-aware preservation

Evaluate durable pre-operation snapshots, file identity checks, content comparisons, and restoration decisions.

Ensure that snapshots cannot overwrite later user changes without appropriate conflict handling.

Consider how the extension should react if a file:

- Was created during generation.
- Was deleted.
- Was replaced.
- Was modified by an editor.
- Was modified by an external process.
- Became a symlink or hard link.
- Changed while cancellation was occurring.
- Could not be read or restored.

## 7.3 VS Code document tracking

Investigate whether VS Code document events can provide reliable evidence of edits during generation.

Consider:

- Document version changes.
- Save events.
- Unsaved document changes.
- Multiple editor windows.
- External file modifications.
- File changes occurring between snapshot and restoration.

Do not mistake observation of an event for exclusive knowledge of a file's writer.

## 7.4 Extension-owned operation coordination

Determine which extension-owned actions can modify protected paths during regeneration.

For example:

- Module creation.
- Plugin creation.
- Descriptor modifications.
- Project setup.
- Other regeneration operations.

Introduce the narrowest synchronization needed to prevent these operations from conflicting.

Preserve existing preview, confirmation, Undo, and cancellation behavior.

Do not introduce a global lock affecting unrelated projects without evidence that it is necessary.

## 7.5 Recovery storage

If the implementation requires temporary recovery copies or transaction metadata:

- Use a suitable extension-owned or scoped storage location.
- Avoid accidental Git tracking.
- Avoid embedding recovery artifacts in the VSIX package.
- Avoid overwriting recovery data from unresolved conflicts.
- Record file identity and original location.
- Provide clear user-facing recovery instructions.
- Define cleanup behavior for successful and unsuccessful transactions.

Do not retain unlimited copies indefinitely.

Do not delete unresolved recovery data automatically without a safe retention policy.

---

# 8. Implement the solution

After selecting the safest technically defensible approach:

1. Add failing regression tests for the reproduced defect.
2. Implement the smallest necessary production changes.
3. Update operation-result contracts where required.
4. Add explicit preservation/conflict outcomes.
5. Integrate with existing user-facing diagnostics.
6. Add safe recovery handling.
7. Add only the synchronization actually required.
8. Run targeted tests.
9. Correct any regressions.
10. Verify ordinary regeneration remains functional.

Prefer extending the current architecture rather than replacing it.

Use CommonJS and existing repository conventions.

Do not introduce new runtime dependencies without a demonstrated necessity and separate approval.

Do not convert the codebase to TypeScript.

Do not rewrite unrelated build, debugging, or dependency-management systems.

### Important stop condition

If you establish that the available mechanisms cannot guarantee a particular safety property, do not implement a speculative solution and label it complete.

Instead:

- Implement independently safe improvements where justified.
- Preserve recoverable data.
- Document the remaining limitation.
- Identify the exact missing guarantee.
- Report the blocked acceptance criterion.

Continue with all other safe, authorized validation work.

A partial implementation with accurate guarantees is preferable to a false claim of complete data-loss prevention.

---

# 9. Regression testing

Create deterministic regression tests covering at least the following scenarios.

## Normal operation

1. Ordinary successful regeneration.
2. Existing protected files unchanged after regeneration.
3. Generator changes to protected files.
4. Files originally absent.
5. Files created during regeneration.
6. Multiple protected files.

## Concurrent modifications

7. Saved VS Code edit during generation.
8. Unsaved editor modification during generation.
9. External write during generation.
10. Extension-owned descriptor edit during generation.
11. Concurrent module/plugin creation.
12. Modification after snapshot but before UBT execution.
13. Modification during UBT execution.
14. Modification after UBT completion but before restoration.
15. Multiple successive changes to the same file.

## Filesystem edge cases

16. File deletion.
17. File replacement.
18. Symlink replacement.
19. Hard-link conflict.
20. File permission failure.
21. Partial read/write failure.
22. Unexpected directory creation.
23. Restore failure.
24. Recovery artifact write failure.

## Operation lifecycle

25. Successful UBT execution with preservation conflict.
26. Failed UBT execution.
27. Cancelled UBT execution.
28. Workspace switch during regeneration.
29. Repeated regeneration request.
30. Interleaving with a running operation.
31. Extension disposal while work is active.
32. Recovery after an interrupted transaction, where supported.

Tests must distinguish simulated behavior from actual external-process behavior.

Use controlled fixtures and deterministic synchronization.

Do not rely on random delays for concurrency correctness.

Do not modify shared engine configuration for destructive race experiments.

---

# 10. Real Unreal Engine integration testing

Use the existing ignored Phase 3A integration project.

You are authorized to perform ordinary real integration testing using Unreal Engine 5.8.4.

### Permitted testing

- Launch VS Code Extension Development Host.
- Open the disposable project.
- Execute regeneration.
- Inspect generated project files.
- Execute safe C++ builds where relevant.
- Compare protected-file hashes.
- Inspect UBT output.
- Verify extension UI messages.
- Exercise ordinary cancellation where safe.
- Confirm recovery behavior using disposable fixtures.
- Inspect Editor state where relevant.
- Close only test-owned processes.

### Integration sequence

1. Verify the disposable project's baseline.
2. Ensure no unrelated Editor or build operation is active.
3. Capture protected-file hashes and relevant identities.
4. Run ordinary regeneration.
5. Confirm expected output and preservation.
6. Execute controlled conflict tests only against disposable files.
7. Confirm conflict reporting and recovery.
8. Verify no unexpected overwrites occurred.
9. Run subsequent ordinary regeneration.
10. Verify the project remains buildable.
11. Confirm all test-owned processes have exited.
12. Record the final project state.

Do not claim source-level unit tests are equivalent to interactive host validation.

If the environment prevents a specific interactive test, report it as unverified rather than passed.

### Shared Unreal installation safeguards

Do not modify Unreal Engine installation source.

Do not deliberately corrupt shared engine configuration.

Do not run concurrent-write fault injection against existing global engine settings.

Do not terminate unrelated Unreal Editor or compiler processes.

Use the disposable project for destructive simulations.

---

# 11. Preserve existing extension functionality

The following must remain unchanged unless a narrowly necessary compatibility-preserving adaptation is required:

- Extension ID: `local-tools.unreal-project-tools`.
- Current release version.
- Existing command identifiers.
- Existing five public settings.
- Manual Build behavior.
- Run behavior.
- Existing automation modes.
- Default Watch behavior.
- C++ class creation.
- Module and plugin creation.
- Dependency editing.
- Existing conservative C# parsing.
- Existing project discovery.
- Editor launch safeguards.
- Current Live Coding restrictions.
- Existing diagnostic behavior outside the required fix.
- Existing VS Code companion integration.

Do not implement Phase 3B.2 process-recovery features.

Do not implement Phase 3B.3 debugger improvements.

Do not start Phase 4 or new feature development.

---

# 12. Validation and quality gates

Run tests throughout implementation rather than leaving every check until the end.

### Targeted validation

After each significant implementation change:

- Run affected unit tests.
- Check JavaScript syntax.
- Inspect relevant async flows.
- Verify file ownership assumptions.
- Inspect the diff.
- Confirm recovery information remains available.

### Full validation

At completion:

1. Run the complete Node test suite.
2. Run the existing Python test suite.
3. Run syntax checks.
4. Run the repository's packaging preflight.
5. Verify extension command and settings compatibility.
6. Verify module import/export compatibility.
7. Check relevant documentation links.
8. Check `git diff --check`.
9. Confirm the disposable project remains Git-ignored.
10. Perform authorized interactive VS Code/Unreal validation.
11. Confirm no test-owned processes remain.

Do not overwrite historical release artifacts merely for validation.

Do not publish or globally install a new extension release.

Distinguish current validation from historical reports.

If a test fails:

- Identify the cause.
- Determine whether it is a code regression, test expectation issue, or environmental limitation.
- Apply an appropriate correction.
- Rerun the failed tests.
- Rerun relevant regression suites.

Do not hide failures by weakening assertions.

Do not delete tests merely to obtain a passing count.

---

# 13. Performance and maintainability

The correction must not introduce uncontrolled filesystem scanning or significant extension-host blocking.

Use asynchronous I/O where practical.

Avoid full-engine rescans for every regeneration event.

Avoid unnecessary repeated content reads.

Keep transaction metadata bounded.

Avoid retaining large buffers after successful completion when no recovery information is required.

Measure performance impact where practical against the Phase 3A baseline.

Do not optimize unrelated systems.

Explain any meaningful cost introduced by stronger preservation guarantees.

---

# 14. Documentation and maintenance history

Use the existing `docs/maintenance/` system.

Do not overwrite earlier execution reports.

Archive the exact effective Phase 3B.1 prompt.

Create a new execution directory using the next available maintenance ID.

Suggested structure:

```text
docs/maintenance/
  prompts/
    0005-phase3b1-regeneration-v1.md
  runs/
    0005-phase3b1/
      RESULT.md
      CHANGES.md
      VALIDATION.md
      SAFETY_CONTRACT.md
      RECOVERY_BEHAVIOR.md
      INTEGRATION_RESULTS.md
```

Adjust numbering to existing conventions and avoid collisions.

### RESULT.md

Document:

- Scope.
- Starting repository revision.
- Confirmed original defect.
- Selected implementation.
- Completion status.
- Remaining limitations.
- Final repository revision.
- Next recommended work.

### CHANGES.md

Document:

- Files modified.
- New modules, if any.
- Tests added.
- Behavior changes.
- Compatibility considerations.
- Recovery and rollback implications.

### VALIDATION.md

Document:

- Exact commands executed.
- Test results.
- Passed, failed and skipped checks.
- Simulated versus real integration tests.
- Unreal Engine patch.
- VS Code environment.
- Toolchain.
- Relevant logs and evidence.

### SAFETY_CONTRACT.md

Document the precise preservation guarantees.

Separate:

- Guaranteed behavior.
- Best-effort behavior.
- Detected conflicts.
- Undetectable or unresolved scenarios.
- Conditions requiring manual intervention.

### RECOVERY_BEHAVIOR.md

Document what the extension does when regeneration succeeds but preservation cannot safely complete.

Explain how recovery data is located, retained and cleaned up.

### INTEGRATION_RESULTS.md

Record actual VS Code and Unreal Engine observations.

Do not represent mocked tests as interactive validation.

Update the maintenance index and relevant developer documentation.

Do not copy the entire audit into the new reports.

---

# 15. Completion and reporting

You are expected to carry the authorized work through implementation and validation.

Do not stop after producing a plan.

Do not stop after writing the first regression test.

Do not stop after an initial successful unit-test run.

Do not stop merely because an existing implementation is complicated.

Continue until the scoped work is complete, an essential safety requirement cannot be met, or additional authorization is genuinely required.

When finished, provide a final engineering summary.

### Required final report

**1. Implementation status**

State whether P1.1 is:

- Complete.
- Partially complete.
- Blocked.

Explain the evidence supporting that status.

**2. Safety guarantees**

Explain exactly what the implementation now guarantees about concurrent edits and restoration.

**3. Code changes**

Summarize the affected modules and responsibilities.

**4. Regression testing**

Report the number of tests added and the final totals.

**5. Real Unreal validation**

Report the results from the disposable Unreal Engine 5.8.4 project.

**6. Performance**

Report any meaningful change in regeneration overhead.

**7. Recovery**

Explain how the extension handles unresolved conflicts.

**8. Compatibility**

Confirm whether public commands, settings, extension identity and existing workflows remain unchanged.

**9. Maintenance records**

Provide the paths to the completed reports and archived prompt.

**10. Remaining work**

List any unresolved Phase 3B.1 issues and the requirements for Phase 3B.2.

Do not begin Phase 3B.2 automatically.

---

# 16. Final operating instructions

You have my authorization to use VS Code, Unreal Engine, and their necessary project-specific command-line development tools to complete Phase 3B.1.

You do not need to request individual approval for normal in-scope editing, testing, compilation, debugging, or disposable-project operations.

Use the smallest necessary sandbox permissions.

Do not interact with unrelated graphical applications or modify system-wide configuration.

Do not bypass security controls or assume permission for unrelated actions.

Keep the repository recoverable.

Preserve historical evidence.

Prioritize correctness over speed.

Implement the safest defensible solution, validate it with both automated and real integration tests, record any remaining limitations, and stop after completing Phase 3B.1.