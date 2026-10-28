Unreal Engine Auto Setup — Phase 3A: Compatibility Baseline and Real Integration Testing

Mission

You are working on my custom Visual Studio Code extension, Unreal Engine Auto Setup, currently at version 0.8.0.

Phase 1 addressed reliability defects, with some unresolved safety limitations. Phase 2 improved maintainability, documentation, and architecture without changing public behavior.

Your assignment is Phase 3A: establish verified Unreal Engine, VS Code, and Windows toolchain compatibility using an authorized disposable Unreal project.

This is an execution and validation task, not merely a planning exercise.

You have explicit permission to create and test a temporary Unreal Engine project within the working repository, subject to the boundaries below.

Do not upgrade the extension version or begin broader feature development.

1. Read the existing evidence

Inspect:

* docs/audit/AUDIT_SUMMARY.md
* docs/audit/03-unreal-integration.md
* docs/audit/04-reliability-security.md
* docs/audit/05-testing-and-tooling.md
* docs/audit/07-improvement-roadmap.md
* docs/DEVELOPMENT.md
* The Phase 1 and Phase 2 maintenance execution records.

Review Git status, current branch, source version, tests, and documented limitations.

Preserve existing changes and historical documents.

Do not repeat the completed comprehensive audits.

2. Important context about my RPG project

I previously developed an RPG-like Unreal Engine project while learning and revisiting Unreal Engine development.

The project is primarily an educational prototype, not a production game.

Very important: This RPG project was previously configured and used with an older version of this same custom VS Code extension, before the recent maintenance and reliability improvements.

Therefore, it is a useful existing integration reference.

The RPG project contains historical extension-generated or extension-managed configuration, including potentially:

* VS Code workspace settings.
* C++ IntelliSense configuration.
* Build tasks.
* Unreal Engine associations.
* Generated project metadata.
* Custom C++ classes and modules.

These are examples to investigate, not assumptions about the actual project contents.

RPG project permissions

The RPG project is disposable, and I intend to restart it from scratch eventually.

If it breaks during authorized basic testing, that is acceptable.

However:

* Prefer read-only inspection initially.
* Preserve the current configuration where practical.
* Do not deliberately damage or delete it.
* Do not migrate it to a newer engine version without additional approval.
* Do not delete its content, source code, assets, or entire directory.
* Do not undertake broad refactors of its gameplay systems.
* Do not use it for destructive fault-injection experiments.

Basic, reversible extension compatibility checks against the existing project are permitted.

Use the new disposable test project for potentially destructive test cases.

If the RPG project cannot be located confidently, report that and continue using the disposable project. Do not guess its path.

3. Authorized operations

You have my approval to perform the following operations without asking again:

1. Inspect my installed Unreal Engine versions.
2. Inspect VS Code and relevant extensions.
3. Inspect installed MSVC and Windows SDK tooling.
4. Read existing Unreal Engine configuration and relevant source documentation.
5. Create a disposable Unreal Engine C++ project.
6. Create ordinary C++ classes, modules, and plugins in that disposable project.
7. Generate project files for the disposable project.
8. Compile the disposable project’s Development Editor target.
9. Launch and close the disposable Unreal Editor session.
10. Perform basic extension integration tests.
11. Perform basic debugger attachment tests against the disposable project where safe.
12. Run ordinary diagnostics and build verification.
13. Collect non-sensitive logs and timing measurements.
14. Modify temporary project files for controlled test cases.
15. Remove the disposable test project after confirming its identity and recording results.

Only terminate processes that this test explicitly launched and can identify.

Use existing installed software and dependencies where possible.

Operations requiring additional approval

Stop and request approval before:

* Installing or upgrading Unreal Engine.
* Installing, removing, or upgrading Visual Studio or compiler toolchains.
* Changing global environment variables, registry entries, or system configuration.
* Installing or updating VS Code extensions.
* Modifying shared engine source files.
* Rebuilding Unreal Engine itself.
* Migrating the existing RPG project.
* Deleting or replacing existing RPG content.
* Modifying another unrelated project.
* Publishing or distributing the extension.
* Reinstalling or upgrading the extension globally.
* Introducing major new extension features.
* Running destructive, privileged, or system-wide tests.
* Undertaking operations materially beyond ordinary creation, build, launch, debugging, and integration validation.

If approval is required and unavailable, document the blocked operation and continue with independent authorized checks.

4. Disposable project creation

Create a test workspace under the repository’s working directory.

Preferred location:

/.local-test-projects/Phase3AIntegration/

The folder name may be adjusted to avoid collisions.

Git exclusion — mandatory

Before creating the project:

1. Inspect the current .gitignore.
2. Add a narrowly scoped ignore rule for the disposable test-project directory.
3. Confirm the intended path is actually ignored.
4. Confirm unrelated source and documentation paths remain trackable.
5. Avoid broad ignore patterns that could conceal legitimate repository files.

Use git check-ignore to verify exclusion.

The temporary Unreal project must not appear as untracked project content.

The narrow .gitignore change itself should remain tracked and documented.

Do not place the project inside the extension’s packaged runtime source directory.

Do not let packaging scripts accidentally include the test project.

Project requirements

Prefer a minimal, code-based Unreal project with:

* A valid .uproject.
* One conventional runtime module.
* A Development Editor target.
* A basic AActor C++ class.
* Minimal required configuration.
* No Starter Content or unnecessary assets.

Use a supported project-creation workflow validated against the installed engine.

Do not assume Unreal provides a particular command-line project creation interface without verification.

If automated creation is unavailable, use an equivalent safe template-based or editor-driven workflow.

Never substitute a fabricated project structure and report it as a successful Unreal Editor-created project.

Record exactly how the project was created.

5. Installed environment inventory

Identify the actual installed versions and locations of:

* Unreal Engine.
* UnrealBuildTool.
* UnrealEditor executable.
* VS Code.
* This Unreal extension.
* Microsoft C/C++ extension.
* Skybox Labs Unreal Engine Integrations.
* Node.js.
* Python.
* MSVC compiler.
* Windows SDK.

Where applicable, inspect:

* Engine Build.version.
* EngineAssociation.
* Toolchain detection.
* Relevant Windows/Win64 target support.
* Available project generation methods.

Record versions and supported capabilities separately.

Distinguish:

* Detected installation.
* Version-policy acceptance.
* Toolchain availability.
* Successful actual execution.
* Historical validation.
* Untested compatibility.

Do not claim full compatibility merely because a version number passes a minimum-version check.

6. VS Code extension integration

Using the disposable project, test the extension’s major existing workflows.

Project discovery and setup

Verify:

* Workspace recognition.
* Project descriptor selection.
* Engine association resolution.
* Default configuration generation.
* Existing configuration preservation.
* Companion integration.
* Build target selection.

C++ generation

Verify at least:

* UObject creation.
* Actor creation.
* Actor Component creation.
* One appropriate subsystem creation.
* Module creation.
* Project-local plugin creation.

Verify file layout, expected macros, naming, descriptors, and Build.cs behavior.

Do not test every exotic engine module type unless necessary to reproduce a discovered compatibility issue.

Dependencies

Exercise ordinary supported dependency operations.

Verify:

* Dependency inspection.
* Adding a conventional dependency.
* Safe preview.
* Undoable WorkspaceEdit.
* Saved Build.cs behavior.
* Dependency-index interpretation.

Avoid unsupported or intentionally complex C# patterns unless validating refusal behavior.

Compilation

Verify:

* The selected Editor target.
* Win64 Development configuration.
* UnrealBuildTool invocation.
* Compiler diagnostics.
* Successful compilation.
* Correct error reporting for a disposable controlled compile failure.
* Successful compilation after restoring the test source.

Editor and debugging

Where safe:

* Launch the disposable project in Unreal Editor.
* Verify matching Editor detection.
* Verify clean Run reuse.
* Verify Build/Run safeguards when Editor is active.
* Test basic debugger attachment if the toolchain and host support it.
* Close only the explicitly test-launched Editor session.

Do not automate PIE or Live Coding through undocumented methods.

7. Regeneration safety limitation — P1.1

The audit identified unresolved regeneration preservation risks.

Do not claim P1.1 is fixed.

Real project-file generation is permitted in the disposable project, but must be approached conservatively.

Before regeneration:

* Record protected-file baselines.
* Confirm there are no concurrent user changes.
* Confirm the project is disposable.
* Record the invocation and expected outputs.

After regeneration:

* Compare relevant configuration bytes.
* Inspect generated files.
* Record unexpected modifications.
* Preserve evidence of any conflict.

Do not simulate concurrent saved edits in shared engine configuration while real UBT generation is active.

Do not change the existing regeneration protection implementation as part of Phase 3A.

Report whether ordinary regeneration works under controlled conditions, without claiming this proves conflict safety.

8. Process ownership limitation — P1.2

Phase 1 improved cancellation handling, but process ownership can be lost across extension-host reloads.

During Phase 3A:

* Track test-launched process IDs.
* Record their command lines and project association where accessible.
* Test ordinary process exit and cleanup.
* Test cancellation only for disposable test-owned child processes.
* Confirm no test-owned processes remain when cleanup is reported complete.

Do not intentionally create orphaned real UnrealBuildTool processes to reproduce the reload limitation.

Do not terminate processes whose ownership is uncertain.

Report the existing cross-reload limitation separately.

9. Compatibility matrix

Create an evidence-based matrix covering the actual environment.

Suggested columns:

Component	Installed version	Detection	Basic validation	Integration validation	Limitations

Include Unreal Engine, VS Code, C++ companion, Skybox integration, MSVC, Windows SDK, UBT, Editor, and this extension.

Use accurate status values:

* Passed.
* Failed.
* Partially validated.
* Blocked.
* Not tested.

Add exact test evidence wherever possible.

Do not present a single successful project build as certification of every engine version or configuration.

10. Performance baseline

Measure existing behavior before considering optimizations.

Focus on:

* Extension activation.
* Project discovery.
* Module and plugin discovery.
* Saved-file reconciliation.
* Runtime refresh.
* Dependency indexing.
* Engine header indexing.

Where practical, record:

* File counts.
* Directory counts.
* Elapsed execution time.
* Project size.
* Number of repeated scans.
* Any notable extension-host blocking.

Use reproducible, low-impact measurement techniques.

Do not run uncontrolled large-scale benchmarks or continuously rescan the engine.

Do not implement speculative caches, new watcher architecture, or activation-policy changes in Phase 3A.

Measurements are the deliverable.

11. Existing RPG compatibility review

If the RPG project is confidently located:

1. Identify its engine association.
2. Inspect its .uproject and module structure.
3. Inspect its VS Code configuration.
4. Identify settings created or managed by earlier extension versions.
5. Compare those settings with the current extension’s expectations.
6. Identify potential upgrade or compatibility problems.
7. Perform only safe, reversible validation.

Pay particular attention to preservation of existing:

* .vscode/settings.json
* .vscode/tasks.json
* .vscode/c_cpp_properties.json
* .clang-format
* Existing project descriptors and build rules.

Do not automatically regenerate or overwrite these files merely to modernize them.

Document whether existing historical extension configuration remains understandable to the current extension.

The RPG is disposable, but the purpose of this particular review is backward compatibility rather than gameplay development.

12. Cleanup

When authorized testing is complete:

* Identify the disposable test-project directory.
* Confirm it contains only Phase 3A-created disposable files.
* Ensure no test-owned Editor or build processes are active.
* Preserve the logs and summaries needed for documentation.
* Remove the disposable project if safe and useful.
* Otherwise retain it under the ignored test directory and explain why.

Never broadly delete sibling directories or unrelated temporary files.

Do not delete the original RPG project.

13. Documentation and history

Archive this prompt under the next available versioned maintenance ID.

Create a Phase 3A execution record containing:

* RESULT.md
* CHANGES.md
* VALIDATION.md
* COMPATIBILITY_MATRIX.md
* PERFORMANCE_BASELINE.md
* RPG_COMPATIBILITY.md, if located

Update docs/maintenance/INDEX.md.

Include:

* Test environment.
* Exact commands.
* Actual execution results.
* Files created and modified.
* Temporary-project creation and cleanup.
* Git exclusion checks.
* Historical-versus-current evidence.
* Known limitations.
* Required user approvals not yet granted.

Do not invent or backfill results for operations that were not performed.

14. Completion requirements

At completion, provide:

1. Detected Unreal Engine patch and installation type.
2. VS Code and compiler environment summary.
3. Disposable project location and cleanup status.
4. Real UnrealBuildTool build results.
5. Successful and unsuccessful extension workflows.
6. Compatibility matrix.
7. Performance measurements.
8. RPG backward-compatibility findings.
9. Remaining P1.1 and P1.2 limitations.
10. Recommended scope for Phase 3B.

Explicitly distinguish successful source-level tests from actual VS Code extension-host tests.

If the extension cannot be loaded into a real test host, report that limitation.

Do not mark integration testing complete based solely on calling internal helper modules.

Do not upgrade the extension version, package a release, install software, migrate the RPG project, or start Phase 3B.

Finish Phase 3A, archive the evidence, and stop.

The objective is to establish an accurate compatibility baseline using real Unreal Engine integration rather than assumptions, while keeping all destructive and system-wide changes behind explicit approval.
