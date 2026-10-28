# Reliability, security and performance findings

Priorities: P1 = address before relying on unattended operations; P2 = important reliability/maintainability work; P3 = bounded hardening or improvement. There is no confirmed critical remote-code-execution vulnerability in this audit. Workspace code/build rules are executable by design after trust; this extension is not a sandbox for trusted Unreal projects.

## Significant findings

### F01 — regeneration can overwrite a concurrent saved edit (P1)

**Confidence: Confirmed by source code and disposable probe.** `unreal-auto-setup/generation.js:18–37` snapshots existing project `.vscode` files, .clang-format, .uproject, .ignore, root code-workspaces and engine `.vscode`. `:39–51` restores old bytes whenever disk differs, without distinguishing generator output from later user/tool writes. `:60–61` does this on success, failure and cancellation.

A probe saved `{\"before\":true}`, snapshotted, wrote `{\"userEditDuringGeneration\":true}`, then restored; the result was the original bytes. No Unreal process was involved. The implementation's overwrite behavior is proven; frequency in real projects is not measured.

Impact is high: a saved configuration or descriptor edit can disappear. Likelihood is moderate during long generation or concurrent wizard/other-window work. Initial dirty-document checks do not protect edits made afterward. Engine configuration is shared across projects/windows, increasing the conflict surface. Hard links are not rejected by this restoration code either, unlike descriptor/dependency editing; external linked-file impact requires separate testing.

Fix with an explicit generation preservation transaction: retain recoverable original and post-run versions, detect concurrent document/file changes, and refuse ambiguous restoration rather than silently overwrite. Avoid claiming that a before/after hash alone identifies the writer. Prefer engine-supported output isolation if verified. Serialize extension-owned descriptor creation with regeneration and surface any recovery conflict. Do not remove protection wholesale: UBT's overwrite behavior is why it exists.

### F02 — cancellation has no termination acknowledgement or failure path (P1/P2)

**Confidence: Confirmed missing handling by source; stalled promise reproduced with an injected failed/no-op terminator.** `build.js:29–31` ignores taskkill's callback result. `:93` sets cancelled and asks to stop a PID, but with a PID present it waits for child close to finish. There is no timeout or cancellation-failed state. The injected process never closed and `done` remained pending; real taskkill failure was not induced.

Impact is a permanently occupied operation gate and possibly ongoing compiler work. Likelihood is low to moderate if taskkill fails, permissions differ, or shutdown races occur. Existing successful cancellation tests make the fake terminator emit close immediately (`tests/build.test.js:24–28`), so they do not cover this path.

Return termination status, report failure, bound the wait and keep unsafe work blocked until process termination is established. Do not simply resolve Cancelled and allow another build while the old process could still run. Define deactivation behavior separately for owned build wrappers and intentionally opened Editor sessions.

### F03 — completed operation resources retained until extension shutdown (P2)

**Confidence: Confirmed by source and mocked-service probe.** Each run adds terminal and two EventEmitters to `context.subscriptions` (`build.js:38,94–96`). Replacing a terminal disposes it, but does not remove its subscription or dispose the retained emitters at completion. Ten completed mocked builds added 30 entries.

Impact grows with automatic-build count/session length; retained emitters/listeners/closures can retain operation data. Actual host heap growth has not been profiled. Likelihood is high that references accumulate, while severity depends on workload. Use one build-service disposable plus a bounded current-operation resource scope and explicitly release completed emitters/closures. Keep intended history in a bounded representation.

### F04 — engine discovery ignores requested capabilities (P2)

**Confidence: Confirmed by source and disposable probe.** `engine.js:54` always requires build and Editor executables, unlike configured/picked branches. A valid version-only engine was rejected on discovery and accepted when configured with both requirements disabled. Impacts setup/source/build-only installations; likelihood depends on installation layout. Share one requirement predicate. See [integration report](03-unreal-integration.md).

### F05 — target parser mistakes literal text for target type (P2)

**Confidence: Confirmed by source and disposable probe.** `project.js:13–16` does not remove string literals. A string containing `Type = TargetType.Editor` produced type Editor. Impact: wrong Run candidate/validation, followed by possible UBT failure. Likelihood low for ordinary generated targets, higher for custom rules. Implement literal-aware scanning and ambiguous/conditional tests; do not evaluate C#.

### F06 — repeated broad scans and no cancellation for indexing (P2)

**Confidence: Confirmed scan paths; user-visible performance severity requires profiling.** Each runtime refresh discovers modules/plugins, fingerprints structure, recursively stats source and enumerates class folders (`runtimeWatcher.js:31–49`, `dirtyTracker.js:13–25`, `explorerClass.js:27–36`). Plugin discovery repeats within that collection. Process queries request fresh results, bypassing the five-second cache. Broad save/configuration/debug/focus events initiate refresh (`runtimeWatcher.js:52–70`); saves of unrelated documents can therefore cause expensive collection even when they do not become dirty source.

Engine indexing recursively scans Source/Plugins and collects headers (`dependencyIndex.js:4–40,52–65`). It is explicit and asynchronous, a good default, but has no cancellation/progress token or quota. Superseded/disposed scans discard results after traversal rather than stopping I/O. Large projects can consume significant I/O, retain large maps and delay UI updates. Likelihood moderate on large trees; no timing benchmark was performed. Coalesce by affected paths, reuse one discovery snapshot, and add cancellable explicit indexing with progress. Avoid speculative complex persistent caches until measured.

### F07 — configuration, error and lifecycle gaps (P2/P3)

**Confidence: Confirmed by source except where qualified.** `dependencyActions.js:148` does not catch `parsed(m)` rejection from an event. Invalid descriptor shapes can throw generic TypeErrors during refresh. `runtimeWatcher` rejects old publications but its collector mutates state earlier (`:28–49`); old-workspace side effects are strongly indicated as an area needing interleaving tests, not a reproduced wrong-project execution.

`extension.js:49–149` holds the original folder across multiple awaited dialogs/configuration updates, without a final project identity guard comparable to runner's. A workspace switch during setup could apply old-project defaults at Workspace scope in the new context. **Strongly indicated but not yet reproduced**; impact moderate/high if settings are misapplied, likelihood low. Add cancellation/identity guards around setup mutations and event error reporting.

### F08 — unbounded stream fragments and diagnostic collections (P2/P3)

**Confidence: Confirmed absence of bounds; exhaustion not reproduced.** `build.js:40,59–68` accumulates an unterminated stdout/stderr line and all distinct diagnostics for a build. Output history is continually appended (`:49,65`) without an extension retention policy. OutputChannel storage is VS Code-managed, so do not equate append calls with proven JS heap leakage. A pathological tool emitting a huge newline-free record can grow the JS string; many diagnostics grow arrays. Likelihood low for normal UBT, higher for unusual tool output. Bound parser fragments/diagnostic counts and document truncation while retaining a usable raw log.

### F09 — packaging relies on manual inclusion and unrestricted source bundling (P2/P3)

**Confidence: Confirmed by source; current VSIX is intact.** `build_bundle.py:16` hardcodes runtime modules; `:9` repeats engine/category metadata; `:28–29` includes every file under the extension source in the ZIP, ignoring Git exclusions. Future node_modules, caches or local files there would enter the source bundle. No credential leakage was found. Likelihood rises if development dependencies/local configuration are later introduced. Use an explicit distribution policy and validate package/source equality. Current 0.8.0 ZIP integrity/XML and packaged source equality passed without rebuilding.

## Safeguards to preserve

* Trust/virtual-workspace manifest restrictions, runtime trust checks and single-local-folder checks. These align with [VS Code Workspace Trust guidance](https://code.visualstudio.com/api/extension-guides/workspace-trust).
* PowerShell single-quoted values with apostrophe escaping, encoded scripts, restricted target/config/platform, rejection of quotes, percent, exclamation and control characters (`build.js:8–23`). Base64 encoding is transport, not sanitization; the validation/quoting is the protection. Percent/exclamation rejection deliberately excludes otherwise valid Windows paths.
* Fixed reg/CIM query structure, executable paths based on SystemRoot, bounded registry/CIM/mutex query durations (`engine.js:35–36`, `processes.js:49–58`, `liveCoding.js:17–20`). No workspace string is inserted into the CIM query.
* Exclusive `wx` creation, ancestor symlink checks, case-insensitive conflict checks, identity/timestamp-aware rollback and incomplete-rollback reporting (`classFiles.js:10–80`, `creation.js:29–86`). Narrow TOCTOU windows remain; no exploit was demonstrated.
* Dependency edits are restricted to discovered project-local Build.cs, reject dirty/changed/hardlinked files, revalidate after preview, and use Undo-capable WorkspaceEdit (`dependencyEditor.js:52–69`, `dependencyActions.js:72–81`).
* One in-extension operation gate, bounded ten-entry operation history, revision-aware completion, no blind retry on failure, and running/unknown-Editor refusal.

## Additional practical limits

No production synchronous filesystem or synchronous process execution was found. Parsing large text and dependency graph traversal still run synchronously in the extension host. Graph traversal repeatedly filters edges (`dependencyModel.js:25–33`); optimize only after measuring representative projects.

Cancellation exists for active builds/generation via their shared wrapper, but not for registry/CIM queries beyond their timeouts, setup, scans or dialogs as one workflow. Build duration itself is unbounded; that can be appropriate for Unreal compilation, provided cancellation failure is recoverable.

Timestamp+size dirty tracking can miss an edit preserving both values; initial activation cannot reconstruct offline changes, and .hpp/.cxx are outside automation's supported extension list (`dirtyTracker.js:5–11,19`). These are documented/policy limitations, not evidence that supported .cpp/.h saves are generally lost. Dependency indexing accepts .hpp while automation does not; clarify this difference.

The operation gate is not shared with other VS Code windows, Skybox tasks, external build invocations, or separate creation wizards. Process-check-to-launch races remain possible. Treat cross-window coordination as optional unless concurrent workflows are required, but protect shared configuration from data loss regardless.
