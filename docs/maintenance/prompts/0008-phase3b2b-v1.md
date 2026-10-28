# Codex — Phase 3B.2b: Windows Process-Tree Supervision and Safe Recovery

## Mission

Continue development of **Unreal Engine Auto Setup**, my custom Visual Studio Code extension for Unreal Engine.

The existing extension is version `0.8.0`, with the stable identifier:

`local-tools.unreal-project-tools`

Your assignment is to complete **Phase 3B.2b — Windows Process-Tree Lifecycle, Safe Claim Release, and Cross-Reload Recovery**.

The immediate problem is that Phase 3B.2 introduced durable process-ownership quarantine, but cannot establish when an entire managed process tree has finished.

As a result, even successful builds leave unresolved claims that block future managed Build and Run operations.

**Your primary objective is to restore normal repeated Build/Run functionality while retaining the safety improvements from Phase 3B.2.**

You are authorized to investigate, design, implement, test, debug and validate the necessary solution independently.

Do not stop after a design document or initial prototype.

Work through the complete engineering lifecycle, including real integration testing, within the permissions below.

---

# 1. Standing authorization — Read carefully

## 1.1 Explicit user authorization

The user grants Codex full permission to perform necessary work, including appropriately scoped operations outside the normal sandbox, within these three authorized areas:

1. **Visual Studio Code** — including Extension Development Hosts, isolated test profiles, extension debugging, terminals, settings required for testing, and extension-host reloads.
2. **The extension source repository** — including its actual source directory, tests, scripts, documentation, ignored temporary directories, and task-specific artifacts.
3. **Unreal Engine** — including the installed engine's necessary executable interfaces, UnrealBuildTool, Unreal Editor, and the designated disposable integration project.

This authorization includes the directly necessary development and testing toolchain associated with these areas, such as Git, Node.js, npm, Python, PowerShell, Windows process APIs, MSVC, Windows SDK tools, and relevant build or CI scripts.

The user explicitly authorizes routine testing, development, compilation, debugging, controlled process creation and termination, and necessary filesystem operations within this scope.

**Do not repeatedly request approval for ordinary operations already authorized above.**

This authorization applies to the entire Phase 3B.2b workflow.

## 1.2 Sandbox access

You may request or use narrowly scoped access outside the sandbox when necessary to complete authorized VS Code, repository or Unreal Engine work.

For example:

- Accessing the actual extension repository.
- Launching a VS Code Extension Development Host.
- Running UnrealBuildTool against the disposable project.
- Inspecting Windows process identities for test-owned operations.
- Running a supervised test process.
- Compiling a project-specific native supervisor or helper.
- Testing extension-host reload and recovery.
- Accessing task-specific temporary storage.
- Cleaning up positively identified test-owned processes.

Use the narrowest necessary permissions.

Do not request unrestricted full-computer access when a narrower capability can accomplish the task.

If the execution environment enforces an approval despite this authorization, follow the platform's required approval mechanism. Do not bypass its controls.

If one operation is blocked, continue independent authorized work and report the exact limitation.

## 1.3 Strict application boundary

You are authorized to interact with only these graphical applications:

- Visual Studio Code.
- Unreal Engine.

Do not interact with other graphical applications without separate approval.

Command-line tools and Windows APIs directly necessary to develop and test the authorized extension and Unreal workflows are permitted.

Do not open or control unrelated applications.

Do not access personal accounts, messages, unrelated projects, credentials or private documents.

## 1.4 Additional approval is required for

- System-wide security or permission changes.
- Windows registry modifications.
- Global environment configuration changes.
- Installing or upgrading Unreal Engine.
- Installing or upgrading system-wide compilers or development toolchains.
- Editing installed Unreal Engine source files.
- Rebuilding the entire Unreal Engine installation.
- Modifying unrelated software.
- Accessing unrelated directories or projects.
- Terminating unverified or unrelated processes.
- Publishing or distributing the extension.
- Replacing the extension in an unapproved personal VS Code profile.
- Modifying the RPGX project.
- Starting Phase 3B.3 or another unrelated development phase.

You may compile an in-repository helper using already installed authorized toolchains if the implementation requires one.

Do not install external dependencies unnecessarily.

## 1.5 Autonomous execution expectations

Once the task begins:

- Investigate issues independently.
- Implement defensible corrections.
- Add regression tests.
- Run necessary validation.
- Debug failures.
- Rerun affected tests.
- Operate authorized development hosts.
- Perform controlled Unreal integration testing.
- Record findings.
- Complete the required documentation.

Do not stop merely because the first implementation fails a test.

Do not repeatedly ask permission for ordinary iteration within the approved scope.

If a genuine technical or permission boundary prevents a safe implementation, preserve the stable behavior, document the blocker and continue any independent work that can be completed safely.

---

# 2. Current engineering baseline

Phase 3B.2 was completed only partially.

The latest report states:

- Extension version: 0.8.0.
- Branch: `main` at the start of Phase 3B.2.
- Node tests: **435 total; 434 passed and one existing P1.1 failure**.
- Python tests: four passed.
- Ten new ownership regression tests passed.
- Syntax, packaging and interface validation passed.
- Real VS Code extension-host reload was successfully exercised.
- Durable process-ownership quarantine survived reload.
- Cross-window claim acquisition was tested for the same canonical project and storage root.
- One ordinary up-to-date real UBT build exited successfully.

These are previous reported results, not current validation. Verify the actual repository state.

## 2.1 Confirmed current regression

Once a managed operation attempts to spawn a process, its ownership claim remains unresolved even after successful root-process exit.

This occurs because the extension cannot prove that every relevant compiler descendant has completed.

The current conservative behavior blocks subsequent managed builds and regeneration for that project.

This is a serious availability regression.

**The next implementation must not solve this simply by releasing the claim after the root process exits.**

## 2.2 Existing limitations

Phase 3B.2 also identified:

- Recovered cancellation is refused.
- Wrapper PID and root-process exit do not establish entire process-tree completion.
- Same-host cancellation retains a PID-to-process-handle race.
- Process descendants may outlive their parent.
- Cross-window coordination has a defined storage-root boundary.
- Different profiles or storage roots are not automatically coordinated.
- Skybox and external builds are not extension-owned.
- Journal inspection stops at 256 entries, with limitations under larger concurrent workloads.

Do not claim these limits have been resolved unless the new implementation actually establishes and tests the relevant guarantees.

## 2.3 Separate unresolved regeneration defect

P1.1 remains blocked.

UnrealBuildTool can rewrite protected VS Code configuration, and the existing regeneration-preservation implementation cannot safely identify all external concurrent writes.

The repository contains one known failing P1.1 acceptance test.

That test must remain visible.

Do not remove, skip, weaken or reclassify it merely to obtain a fully green suite.

Do not modify P1.1 regeneration-preservation behavior during this phase.

Changes to shared build-process supervision may apply to regeneration's process lifetime, but must not be represented as solving the unrelated protected-configuration problem.

---

# 3. Repository and development environment

The previously validated repository is:

`C:\Dev\VSCodeTools\unreal-auto-setup`

The disposable Unreal project is:

`C:\Dev\VSCodeTools\unreal-auto-setup\.local-test-projects\Phase3AIntegration`

Previously validated tools:

- Unreal Engine 5.8.4 — Epic installed build.
- VS Code 1.143.1.
- MSVC 14.50.35739.
- Windows SDK 10.0.22621.0.
- Node.js and Python as configured in the repository.

Confirm relevant paths and versions before depending on them.

Do not assume an installation moved or changed without evidence.

The disposable project is authorized for ordinary builds, launches, file modifications and controlled lifecycle testing.

It must remain excluded from Git.

Do not modify RPGX.

## 3.1 Git checkpoint

Before implementation:

1. Inspect Git status.
2. Record the current branch and HEAD.
3. Inspect any pre-existing uncommitted changes.
4. Confirm the Phase 3B.2 implementation exists.
5. Confirm the disposable project is Git-ignored.
6. Preserve historical recovery data and maintenance reports.

The user previously committed an earlier checkpoint. Verify the current state rather than assuming all later work has been committed.

Do not automatically reset, clean, amend, rebase or commit.

---

# 4. Required documentation review

Read the relevant engineering records before implementing.

Prioritize:

- `docs/audit/04-reliability-security.md`
- `docs/audit/06-proposed-architecture.md`
- `docs/audit/07-improvement-roadmap.md`
- `docs/DEVELOPMENT.md`
- Phase 3A integration results.
- Phase 3B.0 process-recovery design, if available.
- Phase 3B.1b outcome and safety limitations.
- Phase 3B.2 `RESULT.md`.
- Phase 3B.2 `PROCESS_OWNERSHIP_CONTRACT.md`.
- Phase 3B.2 `RELOAD_RECOVERY_MATRIX.md`.
- Phase 3B.2 `VALIDATION.md`.
- Phase 3B.2 `INTEGRATION_RESULTS.md`.

Inspect current production implementation and tests.

Do not rely on historical line numbers.

Do not repeat the entire repository audit.

---

# 5. Primary technical objective

Establish a reliable lifecycle boundary for an extension-owned Windows build process and its relevant descendants.

The extension must be able to determine when it is safe to:

- Release a durable ownership claim.
- Admit a subsequent managed build.
- Report process termination.
- Reconcile an operation after extension-host reload.
- Cancel an active operation where ownership is verifiable.
- Clean up completed-operation metadata.

The strongest acceptable solution will provide reliable process-tree supervision across extension-host interruption.

A Windows Job Object supervisor is a candidate, **not an assumed complete solution**.

Investigate and validate it against the installed Windows environment and actual UnrealBuildTool process structure.

---

# 6. Research and verify Windows Job Object behavior

Use authoritative Windows API documentation and actual controlled experiments.

Relevant Microsoft documentation includes:

- https://learn.microsoft.com/windows/win32/procthread/job-objects
- https://learn.microsoft.com/windows/win32/procthread/nested-jobs
- https://learn.microsoft.com/windows/win32/api/jobapi2/nf-jobapi2-assignprocesstojobobject

Investigate:

- `CreateJobObject`
- `OpenJobObject`
- `AssignProcessToJobObject`
- `QueryInformationJobObject`
- `TerminateJobObject`
- Process creation and suspended-start behavior
- Job Object handle lifetime
- Named Job Object access control
- Nested Job Objects
- Child process inheritance
- Breakaway behavior
- Job Object completion notifications
- Active process counts
- Process exit codes
- The effect of extension-host termination on job ownership

Do not assume the existence of a Job Object proves that every descendant is contained.

Do not assume a named Job Object survives without a valid lifetime/handle strategy.

Do not infer that a job is empty merely because its original wrapper process exited.

Do not rely solely on completion-port notifications; determine their documented delivery limitations and establish an authoritative state check.

Do not treat a Job Object being signaled as a universal proof that all processes exited without verifying the exact API semantics.

## 6.1 Important engineering questions

Determine:

1. Can the extension launch the initial process into a job before that process can spawn descendants?
2. Can all relevant UBT/MSVC descendants be proven to remain contained?
3. Can UnrealBuildTool operate normally within this job?
4. Can the job be observed after VS Code extension-host reload?
5. What keeps the required job handle alive?
6. How can a new host authenticate or verify the surviving supervisor?
7. Can cancellation safely terminate the entire contained operation?
8. How can the extension prove that a job contains no active processes?
9. What happens if the supervisor crashes?
10. What happens if a child escapes or cannot join the job?
11. Can the process tree finish while the extension host is unavailable?
12. How is the final completion result persisted without a race?

Answer these using source evidence, API documentation and controlled tests.

---

# 7. Supervisor architecture

Evaluate whether a dedicated, narrowly scoped process supervisor is required.

A possible architecture is:

```text
VS Code Extension Host
        |
        | Launch / observe / cancel
        v
Managed Operation Supervisor
        |
        | Windows Job Object
        v
PowerShell / Build wrapper
        |
        v
UnrealBuildTool
        |
        v
Compiler and related child processes
```

This is a conceptual design only.

The final implementation must reflect verified process behavior.

## 7.1 Supervisor responsibilities

If implemented, the supervisor should:

- Own or maintain a verifiable handle to the managed Job Object.
- Create the process within a known containment boundary.
- Track the exact operation identity.
- Observe process-tree state.
- Record the root process result.
- Distinguish root exit from complete process-tree exit.
- Persist trustworthy completion or failure evidence.
- Support bounded status queries.
- Reject unverified cancellation requests.
- Survive a normal VS Code extension-host reload when required.
- Release resources after a verified terminal state.

It must not become a general-purpose remote process controller.

## 7.2 Implementation technology

Choose the smallest maintainable and reliable implementation.

Possible approaches include a small native helper, an existing Windows API bridge, or another verified mechanism.

Do not add a third-party process-management dependency without demonstrating why it is necessary.

If a compiled helper is required:

- Keep its source in the repository.
- Document build prerequisites.
- Use the existing authorized development toolchain.
- Provide a reproducible build path.
- Validate executable identity and packaging.
- Avoid downloading unverified binaries.
- Avoid runtime compilation from arbitrary generated source.
- Handle absent or incompatible helper binaries safely.
- Ensure the helper is included in the appropriate development and distribution validation.
- Do not overwrite the existing released VSIX.

A helper must have explicit cleanup and failure semantics.

Do not introduce a permanently running system service.

## 7.3 Supervisor lifetime and crash handling

Determine what happens when:

- The extension host closes normally.
- The extension host crashes.
- VS Code reloads.
- The supervisor exits unexpectedly.
- The supervisor is killed during an operation.
- The supervisor exits after process-tree completion.
- The operation finishes before the new extension host activates.
- Metadata writes fail.

Preserve truthful states.

If the required containment guarantee is lost, the extension must not falsely report that the operation completed safely.

---

# 8. Process identity and ownership

Continue using the Phase 3B.2 durable operation identity model where appropriate.

Do not rely on PID alone.

A trustworthy operation association should consider:

- Random operation identifier.
- Canonical project descriptor.
- Executable identity.
- Process creation identity.
- Verified supervisor identity.
- Job Object identity where supported.
- Operation-specific metadata.
- Relevant process command line.
- Existing journal or claim ownership.

Process identities must be resistant to stale PID reuse and unrelated-process confusion.

If cross-process communication is introduced:

- Limit it to local, task-specific communication.
- Authenticate or otherwise securely bind requests to the intended operation.
- Validate all received data.
- Avoid command injection.
- Avoid unrestricted process-control endpoints.
- Restrict access to the appropriate local user/session where supported.
- Do not log secrets or sensitive authentication material.

Unknown ownership must remain non-terminable.

---

# 9. Durable journal and claim lifecycle

Inspect and extend the existing Phase 3B.2 claim system.

Define explicit states such as:

- Reserved.
- Starting.
- Running.
- Root exited, descendants unconfirmed.
- Full tree completed.
- Cancellation requested.
- Termination confirmed.
- Supervisor lost.
- Recovery uncertain.
- Released.

Use names that fit the existing implementation.

## 9.1 Claim creation

The claim must be acquired before allowing a conflicting operation.

Ensure the initial spawn and journal-update sequence does not create an untracked process if the host or supervisor fails at an unfortunate time.

Investigate crash boundaries before and after process creation.

## 9.2 Claim release

A claim may be released automatically only when adequate evidence establishes that the relevant managed process tree has finished.

Successful root exit alone is insufficient.

Age, missing PID, missing wrapper, or a lost event alone is insufficient.

A verified full-tree completion outcome should allow normal release without user intervention.

## 9.3 Unknown state

If supervision is lost or completion cannot be established:

- Preserve the unresolved claim.
- Explain the uncertainty.
- Avoid automatic termination of unrelated processes.
- Provide actionable diagnostics.
- Permit safe reconciliation when stronger evidence becomes available.

Do not introduce a force-release shortcut that silently ignores a possibly active compiler operation.

## 9.4 Journal cleanup and bounds

Ensure that:

- Completed operation records can be safely removed or archived.
- Unresolved records remain recoverable.
- Corrupt records cannot grant permission to start conflicting operations.
- Partial writes are handled.
- Storage cannot grow indefinitely through ordinary successful builds.
- Scanning limits cannot silently bypass active claims.
- Different projects remain correctly isolated.

If the current 256-entry inspection limit is relevant, address its fail-safe behavior.

Do not allow exceeding a limit to be interpreted as permission to start an operation.

---

# 10. Restore normal Build and Run behavior

This is a mandatory acceptance area.

The extension must support:

1. Start first managed build.
2. Observe its completion.
3. Prove the relevant process tree is finished.
4. Release the claim.
5. Start second managed build.
6. Complete successfully without stale quarantine.
7. Perform another ordinary operation without restarting the extension.

Also verify:

- Build after a controlled compile failure.
- Build after confirmed cancellation.
- Run after a successful build.
- Manual Build priority over pending automation.
- Correct status-bar and sidebar updates.
- Appropriate Problems diagnostics.
- No duplicate concurrent operation.

Do not weaken current editor-running and Live Coding safeguards.

Do not consider Phase 3B.2b complete if successful managed builds still permanently quarantine their project.

---

# 11. Cross-reload recovery

A central requirement is maintaining correct safety state across extension-host interruption.

Test the lifecycle:

1. Start a managed, supervised test operation.
2. Verify its durable claim.
3. Reload or interrupt the extension host.
4. Verify the managed operation's actual state.
5. Start a new extension-host instance.
6. Reconcile the previous operation.
7. Correctly identify active, completed, or uncertain state.
8. Block conflicting work while the operation is active.
9. Release the claim once the complete tree is positively finished.
10. Perform a subsequent successful managed operation.

## 11.1 Operation finishes while host is absent

This is especially important.

Test an operation that completes after the old extension host disappears but before the new host finishes activation.

The new host must not mistake an expired wrapper PID for successful completion.

If reliable durable evidence exists, it should recognize verified completion and permit ordinary subsequent builds.

If the result code cannot be proven, distinguish completion of the tree from success of the build.

## 11.2 Lost supervisor

Test supervisor loss separately.

Do not assume that loss of the supervisor means the compiler tree has exited.

Determine whether the selected containment strategy guarantees termination, preserves a recoverable job, or leaves an uncertain state.

Report only guarantees that actual testing establishes.

---

# 12. Cancellation semantics

Preserve and, where justified, improve existing cancellation behavior.

A cancellation request must distinguish:

- Request accepted.
- Termination initiated.
- Process-tree termination confirmed.
- Termination failed.
- Outcome uncertain.

A confirmed owned Job Object may provide a safe entire-operation termination boundary if the implementation and API behavior validate that assumption.

Do not terminate based on stale PID alone.

Do not kill external builds.

Do not terminate unrelated Unreal Editors.

Do not kill Skybox-owned tasks.

If recovered cancellation becomes supportable, implement it only with verified operation ownership and containment.

Otherwise preserve refusal with an explanation.

## 12.1 Same-host cancellation race

Investigate the existing PID-to-handle race when relevant to the new implementation.

Do not expand into unrelated process-system refactoring.

If the new supervisor resolves the race, demonstrate that through tests.

If not, document the remaining limitation.

---

# 13. Cross-window safety

Preserve the current same-project claim coordination.

Test two VS Code Development Hosts attempting a managed build against the same canonical descriptor and shared claim store.

Required behavior:

- At most one conflicting managed operation is admitted.
- The second receives an accurate blocked state.
- A proven completed operation releases its claim.
- A later operation can acquire the claim safely.
- Different non-conflicting projects are not unnecessarily blocked.

Do not claim coordination across different profiles, user accounts, machines, storage roots, or external build providers unless explicitly implemented and tested.

Evaluate whether the new supervisor affects cross-window identity or claim ownership.

Keep the actual tested boundary documented.

---

# 14. Deterministic regression tests

Add meaningful regression tests before relying on new lifecycle behavior.

Use existing Node testing conventions and controlled fake processes where possible.

Cover:

## Normal lifecycle

1. Claim acquired before spawn.
2. Supervised process starts successfully.
3. Root exit observed.
4. Descendant remains running after root exit.
5. Claim stays active while descendant runs.
6. Full-tree completion confirmed.
7. Claim automatically released.
8. Two consecutive successful builds.
9. Successful build following a controlled failure.
10. Successful build following confirmed cancellation.

## Host reload

11. Reload with active operation.
12. Reload after root exit but before descendant exit.
13. Operation completes while host is absent.
14. New host reconciles completed operation.
15. New host reconciles still-running operation.
16. Reload during cancellation.
17. Reload before spawn.
18. Reload after spawn but before durable metadata update.

## Supervisor and Job Object behavior

19. Assignment success.
20. Assignment failure.
21. Unsupported nested-job condition.
22. Attempted child breakaway.
23. Supervisor crash.
24. Supervisor exits before completion record is committed.
25. Handle closure behavior.
26. Missing or unreliable notification.
27. Verified active-process count.
28. Partial or corrupt supervisor output.

## Identity and cancellation

29. PID reuse.
30. Wrong operation identity.
31. Wrong project identity.
32. Wrong executable.
33. Unknown process refusal.
34. Verified owned cancellation.
35. Termination failure.
36. Duplicate cancellation.
37. Unrelated Editor survival.

## Concurrency and storage

38. Two windows, same project.
39. Two windows, different projects.
40. Atomic claim acquisition.
41. Claim release and reacquisition.
42. Corrupt journal.
43. Interrupted journal write.
44. Inspection-limit behavior.
45. No unbounded metadata retention.
46. No unbounded listener or handle retention.

Adapt these cases to the implementation.

Do not add artificial tests solely to increase the count.

Use deterministic synchronization barriers for race tests.

Do not claim that mocked tests prove native Job Object behavior.

---

# 15. Controlled Windows integration tests

Before attempting real UnrealBuildTool reload tests, create a harmless, explicitly test-owned process-tree fixture.

For example, the fixture may have a parent that launches a child which remains active after the parent exits.

The exact implementation is your decision.

The fixture must not modify unrelated files or processes.

Prove:

- Process assignment occurs before descendants can escape the intended containment path.
- Root exit is independently observable.
- A surviving child prevents premature claim release.
- The supervisor detects eventual full-tree completion.
- The extension releases the claim when safe.
- A new operation becomes available.
- Reload during the fixture behaves correctly.
- Cancellation affects only positively identified test-owned processes.
- Cleanup leaves no test-owned processes behind.

If a Job Object does not contain a particular descendant, document that behavior and determine whether the containment strategy needs adjustment.

Do not silently omit escaped descendants from a claimed complete operation.

---

# 16. Real VS Code and Unreal Engine validation

Use the existing disposable project.

Run integration tests through an actual VS Code Extension Development Host, not only unit-test mocks.

## 16.1 Ordinary managed builds

Verify:

- First managed Development Editor build succeeds.
- Entire supervised operation finishes.
- Claim releases.
- Second managed build succeeds.
- Claim releases again.
- No indefinite quarantine remains.
- Build output and Problems continue to function.

Use the previously validated Unreal Engine 5.8.4 installation.

Do not rebuild engine source.

## 16.2 Reload while operation is active

After the synthetic process-tree fixture proves safe recovery:

- Start a controlled supervised build.
- Reload the development extension host.
- Reconcile the active process.
- Confirm correct blocking and eventual safe release.
- Execute another successful managed build.

For a short up-to-date UBT build, use a controlled test fixture rather than introducing arbitrary delays into production source merely to force a race.

Do not deliberately abandon an uncontrolled compiler process tree.

## 16.3 Cancellation

Test safe cancellation using positively identified test-owned operations.

Confirm that completion is acknowledged and that another build is permitted afterward.

Do not cancel unrelated processes.

## 16.4 Editor safety

Confirm that the supervisor does not terminate an independently running Unreal Editor session.

An Editor process launched by the extension must not be treated as a disposable build descendant solely because the extension host reloaded.

Do not begin debugger detach/reattach testing; that belongs to Phase 3B.3.

## 16.5 Regeneration boundary

Verify that the process-supervision changes do not weaken the existing operation gate or recovery records used by regeneration.

Do not require a destructive real regeneration test to complete this phase.

The known P1.1 preservation failure remains separately blocked.

---

# 17. Safety and cleanup

Before every real test:

- Confirm the designated test project.
- Confirm the process identity.
- Check whether a relevant operation is already active.
- Verify whether test resources are currently owned by another run.
- Avoid disturbing unrelated activity.

After testing:

- Close test-owned Development Hosts where appropriate.
- Confirm test-owned processes have exited.
- Release verified completed claims.
- Preserve genuinely unresolved records.
- Verify the disposable project remains ignored.
- Preserve existing recovery artifacts.
- Document any remaining process or handle uncertainty.

Do not use broad process-name-based termination.

Do not kill all PowerShell, compiler or Unreal processes.

Do not use system-wide cleanup commands.

---

# 18. Performance and implementation quality

Avoid adding an expensive continuous process scanner.

Prefer event-driven or bounded reconciliation.

Any supervisor should be lightweight.

Record:

- Process launch overhead.
- Claim acquisition and release latency.
- Recovery latency after host reload.
- Memory or handle growth across repeated builds.
- Additional build overhead.
- Relevant metadata storage growth.

Avoid accumulating unlimited supervisor processes, handles, listeners, output buffers or journal records.

Keep all I/O associated with the current operation and project.

Use CommonJS and existing JSDoc conventions for JavaScript changes.

Do not migrate the extension to TypeScript.

Do not introduce an unrelated architecture overhaul.

---

# 19. Packaging and portability

If new source files or helper executables are introduced:

1. Update the existing packaging policy.
2. Ensure the helper is included where required.
3. Verify its source and expected binary identity.
4. Check manifest and runtime-module completeness.
5. Avoid packaging disposable test data.
6. Avoid bundling unrelated local files.
7. Ensure the extension fails safely if the helper cannot start.
8. Document runtime prerequisites.
9. Keep the existing public extension identity unchanged.

If the helper needs a compilation step, make the build process reproducible using the existing supported toolchain.

Do not install additional system-wide software.

Do not overwrite existing released VSIX artifacts.

A validation-only package may be generated under a separate temporary name if necessary, but it must not replace or publish the existing release.

---

# 20. Preserve existing public behavior

Do not change:

- Extension ID `local-tools.unreal-project-tools`.
- Version 0.8.0.
- Existing public commands.
- Existing five settings unless a genuinely essential addition is separately justified.
- Watch-mode default.
- Existing automation modes.
- Class, module and plugin creation.
- Dependency management.
- Engine discovery.
- Build target selection.
- Running-Editor safeguards.
- Live Coding restrictions.
- Skybox companion integration.
- Unresolved P1.1 safety handling.

Add internal modules only where needed.

Avoid unnecessary source-file moves.

Do not automatically release or reinstall the extension.

---

# 21. Validation requirements

After implementation, run:

1. Targeted process-supervision regression tests.
2. Existing process-ownership tests.
3. Complete Node test suite.
4. Python tests.
5. JavaScript syntax checks.
6. Native helper build and verification, if applicable.
7. Packaging preflight.
8. Public command and settings compatibility checks.
9. Import/export integrity checks.
10. Documentation link validation.
11. Git diff and whitespace checks.
12. Real VS Code Development Host tests.
13. Real UnrealBuildTool managed builds.
14. Test-owned process cleanup verification.

Report exact commands and outcomes.

## Known test failure

The previous baseline had 435 Node tests, with 434 passing and one P1.1 failure.

Do not modify that failing acceptance test merely to obtain a passing suite.

A successful Phase 3B.2b result may still show that one independently documented P1.1 failure.

However, **there must be no new unexplained or unresolved Phase 3B.2b regression failures**.

Do not conflate known defects with new defects.

---

# 22. Maintenance archive

Use the existing `docs/maintenance/` system.

Archive this exact effective prompt under the next available task identifier.

Suggested identifier:

`0008-phase3b2b-v1.md`

Create a new execution directory, for example:

`docs/maintenance/runs/0008-phase3b2b/`

Use existing naming conventions and avoid collisions.

Required reports:

- `RESULT.md`
- `CHANGES.md`
- `VALIDATION.md`
- `PROCESS_SUPERVISION_DESIGN.md`
- `PROCESS_TREE_TEST_MATRIX.md`
- `RELOAD_INTEGRATION_RESULTS.md`
- `SAFETY_CONTRACT.md`

Update the maintenance index and developer guide.

Document:

- Starting Git revision.
- Actual selected implementation.
- Rejected alternatives.
- Verified Windows API behavior.
- Supervisor lifecycle.
- Claim-release rules.
- Cancellation rules.
- Reload behavior.
- Cross-window guarantees.
- Packaging changes.
- Exact validation results.
- Remaining limitations.
- Final working-tree status.

Preserve all previous Phase 3B.2 documents.

Do not automatically create Git commits.

---

# 23. Required acceptance criteria

Phase 3B.2b can be marked **Complete** only when all the following are satisfied.

### Process-tree correctness

- The implementation establishes a defensible process-tree lifetime boundary.
- Root-process exit alone never authorizes unsafe release.
- Surviving contained descendants keep the operation active.
- Verified full-tree completion permits automatic release.
- Uncertain containment or ownership remains safely blocked.

### Normal usability

- Two consecutive real managed builds succeed.
- Both completed operations release their claims.
- The extension no longer permanently quarantines ordinary successful builds.
- A failed or safely cancelled operation can be followed by a new managed build after its process tree is confirmed finished.

### Reload correctness

- Reload during a controlled active operation preserves safety state.
- Reconciliation identifies active versus completed or unknown operations correctly.
- A completed operation can be safely released after reload.
- A still-running operation blocks conflicting work.
- A lost supervisor does not produce fabricated completion.

### Cancellation

- Only verified owned operations can be terminated.
- Termination confirmation is separate from termination request.
- Unknown processes are never automatically killed.
- The existing cancellation safety behavior is preserved.

### Compatibility

- Existing public commands and settings remain compatible.
- Build/Run and diagnostics remain functional.
- Unreal Editor sessions remain independent.
- The P1.1 regeneration defect remains isolated and unchanged.
- Native packaging and development-host operation remain valid.

### Evidence

- Deterministic regression tests pass.
- Real Windows process-tree tests establish the relevant native behavior.
- Real VS Code host testing succeeds.
- Real UnrealBuildTool repeated-build testing succeeds.
- Results are archived accurately.

Do not mark Phase 3B.2b complete based only on mocked tests or documentation.

---

# 24. Failure and stop conditions

If a Windows Job Object design cannot safely provide the required guarantees, investigate a better verified alternative within the approved scope.

Do not repeatedly force the same failed design.

Do not introduce a false recovery mechanism merely to satisfy tests.

If complete safety cannot be established:

1. Preserve the confirmed safeguards.
2. Keep unknown operations blocked.
3. Avoid claiming ordinary functionality is restored.
4. Record the precise technical blocker.
5. Preserve experimental evidence.
6. Complete independent safe improvements.
7. Report the task as partially complete or blocked.

Do not silently weaken tests.

Do not release claims based on guesswork.

Do not broaden access to unrelated applications.

Do not start Phase 3B.3.

---

# 25. Final engineering report

When finished, report:

**Implementation status:** Complete, Partially Complete or Blocked.

**Process-supervision mechanism:** How it actually works, including job containment, supervisor lifetime and ownership verification.

**Normal Build/Run behavior:** Results for two or more consecutive real managed builds.

**Reload recovery:** Which operation states can be reliably recovered.

**Cancellation:** Which operations can be safely terminated.

**Cross-window behavior:** Exactly what is coordinated and what is not.

**Resource lifetime:** Handle, listener, supervisor and journal cleanup.

**Performance:** Measured overhead and recovery latency.

**Validation:** Exact Node, Python, syntax, packaging and real integration results.

**Known P1.1 failure:** Confirm it remains explicitly tracked and unchanged.

**Maintenance documentation:** Exact paths to the archived prompt, decisions and reports.

**Git status:** Starting revision, changed files and final working-tree state.

**Next step:** Whether Phase 3B.3 can safely begin.

Do not automatically start Phase 3B.3.

---

# Final operating directive

The user has explicitly authorized you to operate autonomously within Visual Studio Code, the Unreal Engine Auto Setup repository, and Unreal Engine, including their directly necessary development and testing toolchains.

That authorization includes the necessary narrowly scoped work outside the sandbox for these areas.

Do not repeatedly request permission for routine in-scope actions.

Respect any approval the execution platform itself requires.

Do not access other graphical applications or unrelated system resources.

Use the existing disposable Unreal test project.

Preserve the Git checkpoint and historical recovery data.

**Your task is not merely to make the current safety system stricter. It is to make that safety system correct and usable.**

Prove the entire relevant process tree has completed, release verified finished claims, restore ordinary repeated Build/Run functionality, preserve cross-reload safety, validate the result in actual VS Code and Unreal Engine, and document the evidence.

Complete Phase 3B.2b and stop.