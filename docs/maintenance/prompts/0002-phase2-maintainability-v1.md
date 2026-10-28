# Codex — Phase 2: Architecture and Maintainability

## Objective

Improve the readability, organization, maintainability, and internal consistency of Unreal Engine Auto Setup while preserving its existing functionality.

This phase follows the completed architecture audit and Phase 1 reliability work.

Refer to:

- `docs/audit/AUDIT_SUMMARY.md`
- `docs/audit/02-code-quality.md`
- `docs/audit/06-proposed-architecture.md`
- `docs/audit/07-improvement-roadmap.md`
- `docs/maintenance/`, if present

Do not repeat the comprehensive audit.

## 0. Prerequisite verification

Before starting:

1. Inspect Git status and current modifications.
2. Read the Phase 1 implementation records.
3. Confirm the final test results.
4. Identify incomplete Phase 1 work.
5. Confirm P1.1 regeneration preservation remains documented as unresolved unless subsequently fixed and validated.
6. Preserve all previous changes and reports.

If Phase 1 validation or documentation is incomplete, finish that work first and stop. Do not begin Phase 2 until the implementation baseline is established.

Do not silently classify unresolved issues as completed.

## 1. Readability and code formatting

Inspect production JavaScript files, especially:

- `runtimeCoordinator.js`
- `runtimeWatcher.js`
- `runner.js`
- `sidebar.js`
- `dependencyActions.js`
- `extension.js`

Improve overly compressed or difficult-to-follow code.

Requirements:

- Expand dense one-line functions.
- Use consistent indentation and formatting.
- Clarify nested conditions.
- Introduce descriptive local variables where useful.
- Separate unrelated operations within functions.
- Keep comments focused on intent, constraints, and non-obvious behavior.
- Preserve existing execution order, side effects, and asynchronous semantics.

Do not rewrite functional code merely to change its appearance.

## 2. Service contracts and architecture

Improve the clarity of how services communicate.

Identify implicit contracts involving:

- Runtime state.
- Project context.
- Service composition.
- Build operation results.
- Workspace identity.
- Cancellation outcomes.
- Filesystem reconciliation.
- Dependency management.

Introduce JSDoc types and contracts where they improve understanding.

Make ownership and lifecycle responsibilities explicit.

Do not introduce TypeScript, a dependency-injection framework, or an event bus.

## 3. Separation of responsibilities

Review existing modules for mixed responsibilities.

Prioritize:

- `runner.js`
- `extension.js`
- `runtime.js`
- `core.js`

Separate command registration, UI handling, workflow coordination, and policy decisions where doing so clearly reduces coupling.

Use small, focused extractions.

Do not reorganize every source file merely to match the proposed architecture diagram.

Retain existing module exports where required by internal callers or tests.

## 4. Validation and configuration consistency

Review the duplicated validation logic identified in the audit.

Investigate:

- Engine version and association parsing.
- Filesystem path containment.
- Descriptor validation.
- Automation setting normalization.
- Project identity checks.
- Shared configuration policies.

Consolidate rules only when they have genuinely identical semantics.

Preserve transaction-specific safeguards for class creation, descriptor editing, and dependency modifications.

Add regression tests for any changed validation behavior.

## 5. Small maintenance corrections

Review confirmed minor findings, including:

- Unused internal parameters and variables.
- Misleading function names.
- Encoding problems in diagnostic output.
- Unhandled asynchronous errors.
- Duplicated documentation maintenance.
- Packaging lists that require manual updates.

Correct these where safe.

Do not remove exported functions without checking their callers and tests.

Do not change the product name, extension identifier, or public command IDs.

## 6. Folder organization

Use `docs/audit/06-proposed-architecture.md` as architectural guidance, not a mandatory migration specification.

Prefer incremental changes.

If a folder move is justified:

1. Explain the benefit.
2. Move the smallest relevant group.
3. Update imports and callers.
4. Update tests.
5. Update `build_bundle.py` and packaging references.
6. Validate runtime source completeness.

Avoid extensive file movement that creates large diffs without practical benefits.

## 7. Documentation and maintainability

Update relevant documentation to explain:

- Major module responsibilities.
- Service initialization.
- Runtime operation flow.
- Build and regeneration lifecycle.
- Cancellation and recovery states.
- Filesystem safety boundaries.
- How to add future extension functionality.

Prefer concise diagrams, targeted comments, and clear module contracts.

Avoid duplicating the existing product documentation.

Archive this Phase 2 prompt and its execution under `docs/maintenance/`.

Preserve earlier prompt versions and execution reports.

## 8. Testing

After each meaningful change:

- Run relevant tests.
- Verify JavaScript syntax.
- Check for changed command registrations.
- Check import/export compatibility.
- Inspect Git diffs.
- Confirm behavior remains consistent.

At completion:

1. Run the complete Node test suite.
2. Report exact passing/failing test totals.
3. Verify public command and setting inventories.
4. Check packaged source inclusion if modules moved.
5. Identify any unverified VS Code or Unreal integration behavior.

Do not claim that unit tests prove real Unreal Engine compatibility.

Do not modify or migrate any Unreal Engine project.

## 9. Strict constraints

Do not:

- Change the extension identifier.
- Introduce new product features.
- Add unnecessary runtime dependencies.
- Change automation defaults.
- Alter build or cancellation safety contracts.
- Weaken filesystem protections.
- Replace conservative Build.cs parsing with speculative rewriting.
- Change the Unreal Engine compatibility policy.
- Automatically upgrade the extension version.
- Publish or reinstall the extension.
- Begin Phase 3 modernization.
- Attempt a speculative fix for the unresolved regeneration-preservation issue.

If a readability refactor exposes a new defect, document it and add a focused regression test before making a necessary correction.

## 10. Maintenance deliverables

Create a Phase 2 execution record containing:

- `RESULT.md`
- `CHANGES.md`
- `VALIDATION.md`

Record architectural decisions separately when meaningful.

Update the maintenance index.

Every major change must identify:

- Previous implementation.
- New implementation.
- Reason for change.
- Files affected.
- Compatibility implications.
- Validation performed.

## 11. Completion report

Provide:

1. Final source structure.
2. Summary of improvements.
3. Files moved or renamed.
4. New service contracts.
5. Reduced duplication.
6. Remaining architectural weaknesses.
7. Exact test results.
8. Any incomplete work.
9. Documentation locations.
10. Recommended Phase 3 priorities.

**Do not begin Phase 3 automatically.**

The goal is a codebase I can comfortably maintain and extend myself.

Favor clarity and stability over unnecessary abstraction.

Complete the approved work, record the results, and stop.