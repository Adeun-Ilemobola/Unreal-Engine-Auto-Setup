# Changes

## P1.1 — Blocked

Finding F01: generation snapshots protected bytes and restores them unconditionally. A disposable regression saves a newer descriptor during the mocked generation operation; the final descriptor reverts to the old bytes. Root cause is lack of reliable change ownership, not merely a missing hash comparison.

Added `unreal-auto-setup/tests/generation-conflict.test.js` with the desired assertion as an explicit TODO. Production preservation logic is unchanged; `generation.js` only forwards P1.2 cancellation status callbacks. Ordinary success/failure/dirty/link tests remain in the existing suite. The full requested twelve-scenario conflict/recovery matrix is not implemented because no accepted preservation strategy exists. See [decision 0001](../../decisions/0001-generation-preservation-blocker.md). Rejected alternatives and concurrency investigation are recorded there. This package remains unsafe for concurrent protected-file edits.

## P1.2 — Partially complete

Findings F02/F03 reproduced with injected child processes: termination errors were discarded, absent close events left no explicit outcome, and completed builds accumulated terminal/emitter subscriptions. Initial six lifecycle regressions failed before implementation. A terminal-creation failure regression also reproduced a stranded operation gate during final review.

Changed `build.js` to own the terminal and emitters at service/operation scope, remove listeners and dispose emitters on completion, retain only the current terminal, and register one service disposable instead of three subscriptions per run. Diagnostics/output and the existing ten-operation state history are retained. Terminal creation failure settles a never-started operation; if a child already exists it requests termination while preserving ownership.

The owned Windows PID tree is terminated using taskkill with a five-second subprocess timeout. Cancellation distinguishes Requested, Accepted, Exited, Failed and Unconfirmed. A six-second acknowledgement deadline returns a defined warning/status. Failed/unconfirmed termination retains both the service and coordinator gates until close; repeated cancellation shares one promise and does not repeat taskkill. `runner.js` and `generation.js` forward state to coordinator stage reporting. Completion after close clears the blocked reason and permits a later operation. Disposal prohibits new work and requests cancellation.

Added `tests/build-lifecycle.test.js`: 9 passing tests cover twenty completed builds with constant subscription count, listener/emitter release, terminal creation failure, build/generation timeout, failed termination, idempotence, already-completed cancellation, disposal, coordinator retention/recovery and a disposable real Windows child tree. Existing diagnostics/output/history tests pass. Chose bounded acknowledgement with retained completion/gate over falsely completing after timeout; rejected interpreting taskkill acceptance as child exit. Cross-host persistence and actual VS Code reload remain unimplemented, so acceptance is partial; see [decision 0002](../../decisions/0002-cancellation-and-inference-boundaries.md).

## P1.3 — Complete

Finding F04: discovered engines unconditionally required both executables. `engine.js` now uses the same capability predicate for configured, discovered and picked candidates, independently of the existing version policy. Twelve matrix tests cover three sources times four requirement pairs; each checks all four executable-presence combinations and incompatible numeric association.

Finding F05: regex inference accepted target-looking literal text. `project.js` now scans bounded source text, strips comments/literals, rejects malformed/unsupported interpolation and control flow, and requires one supported literal assignment. For class declarations, the assignment must be directly in a single conventional constructor body; helper-only assignments are Unknown. Supports Editor, Game, Client, Server and Program, `this.Type`, multiline/comments and normal base-constructor syntax. No project code executes and no parser dependency was added. Unsupported/ambiguous cases fall back to Unknown; this is inference, not C# evaluation.

Added `tests/detection-regressions.test.js`: 35 tests (12 engine matrix plus 23 target cases). Original targeted detection run had 12 failures; the final helper-method case independently failed 1/2 before the resumed correction. All now pass. Existing engine/project/runner tests also pass. Regex-only stripping was rejected because literals can contain escaped delimiters/comment markers; a full C# parser was outside the necessary scope.

## P1.4 — Complete for reproduced scenarios

Controlled barriers reproduced setup continuing after workspace change during engine discovery, project dialog and configuration updates, plus old runtime collection switching coordinator state before its publish-epoch check. Same-folder selected-project changes also invalidate pending reconciliation. Build.cs deletion during parsing produced a background rejection. Malformed descriptor collections produced incidental errors or accepted invalid structures.

Changed `extension.js` to capture workspace identity/epoch and recheck after awaited setup stages and before subsequent mutations, including selection persistence and task setup. `core.js` accepts an optional pre-write identity guard while preserving exclusive creation. `engine.js` checks identity after settings protection before remembering a path. `project.js` validates descriptor object/Modules/Plugins structures, verifies workspace identity after discovery and supports a setup selection guard. `runtimeWatcher.js` stages all awaited collection before a current-epoch check and synchronous state/coordinator commit; clears stale snapshots on workspace/configuration reset. `dependencyActions.js` catches background parse rejection and reports a warning while active.

Added `tests/workspace-safety.test.js` (9 tests) and three barrier cases in `tests/workflow.test.js`. Before fixes the initial targeted workflow/workspace run had 11 failures out of 15. Final focused regression run includes all 60 tests across the four focused files and passes. Existing successful setup/preservation and watcher/automation tests pass in the full suite. Chose local guards and existing epochs rather than architectural restructuring. No broader unproven race guarantee is asserted; native writes already submitted cannot be recalled and no real extension-host interleaving run was performed.

## Scope review

Ten tracked files changed: `build.js`, `core.js`, `dependencyActions.js`, `engine.js`, `extension.js`, `generation.js`, `project.js`, `runner.js`, `runtimeWatcher.js`, `tests/workflow.test.js`, all under `unreal-auto-setup/`. Four new regression files listed above. Maintenance records added under `docs/maintenance/`. Historical `docs/audit/` bytes and package.json preserved. No new production module, rename, dependency, UI framework, version change or Phase 2 restructuring.
