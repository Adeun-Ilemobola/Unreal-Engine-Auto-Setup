# Prioritized improvement roadmap

This is a proposed plan only. No task below has been implemented. Priority combines impact and evidence; implementation risk is the risk of making the proposed change, not the severity of the existing defect. Complexity is relative (small/medium/large), without unsupported schedule estimates. Paths are under `unreal-auto-setup/` unless stated otherwise.

## Phase 1 — Critical fixes and confirmed defects

### P1.1 Protect user edits during regeneration

* **Problem/evidence:** F01, `generation.js:18–62`; unconditional restoration overwrote a concurrent saved descriptor edit in the disposable probe. Independent creation workflows can overlap generation (`classWizard.js:81–86`, `structureWizard.js:72–76`).
* **Solution:** Design conflict-aware preservation with recoverable before/post-run bytes, document/file change checks and explicit conflict reporting. Coordinate extension-owned descriptor commits with generation. Validate whether UBT output can be isolated before selecting a preservation strategy.
* **Benefit:** Prevent silent loss of saved configuration/descriptor changes while retaining protection against UBT overwrites.
* **Priority/complexity/risk:** P1; medium–large; high implementation risk because restoration semantics are delicate.
* **Dependencies:** None; establish regression fixtures before changing behavior.
* **Verification:** Concurrent saved/unsaved user edits, wizard descriptor edits, engine shared config, failed/cancelled UBT, link replacement and restore failure; then disposable real UBT generation with byte comparisons and conflict recovery.
* **Required or optional:** Required. This is the first implementation task.

### P1.2 Make cancellation and build resource ownership explicit

* **Problem/evidence:** F02/F03, `build.js:29–31,38–42,71–99`; failed termination can leave `done` unresolved and completed operations add three retained subscriptions each.
* **Solution:** One build-service disposable with an operation resource scope. Await/report termination, enforce a bounded acknowledgement path, and retain a blocked state if process exit cannot be established. Release completed emitters/listeners while keeping intended bounded result history.
* **Benefit:** Recoverable cancellation and stable long-session resource use.
* **Priority/complexity/risk:** P1 for cancellation recovery, P2 for retention; medium; medium risk.
* **Dependencies:** Coordinate generation cancellation/restoration semantics with P1.1; otherwise independently implementable.
* **Verification:** Fake and real owned child termination success/failure, already-exited PID, repeat cancellation, no-close timeout, reload/disposal, repeated builds and emitter/subscription counts. Ensure a possibly running process never permits overlapping work.
* **Required or optional:** Required.

### P1.3 Correct engine capability and target-type inference

* **Problem/evidence:** F04/F05, `engine.js:47–60`, `project.js:13–16`; discovered/configured capability behavior differs and strings can impersonate Editor assignments.
* **Solution:** Share the engine requirement predicate across all candidate sources. Make target inference literal/comment-aware and conservative for ambiguous conditions/inheritance.
* **Benefit:** Consistent setup/build-only handling and reliable target selection without executing project C#.
* **Priority/complexity/risk:** P2; small–medium; low–medium risk.
* **Dependencies:** None; preserve existing supported conventional target cases.
* **Verification:** Capability flag matrix across configured/discovered/picked engines; missing Build.bat/Editor independently; strings, comments, conditional assignments, unknown types and ordinary Editor/Game rules.
* **Required or optional:** Required defect fixes; no engine support expansion implied.

### P1.4 Guard setup identity and asynchronous event failures

* **Problem/evidence:** F07, `extension.js:49–149`, `runtimeWatcher.js:28–51`, `dependencyActions.js:148`; setup retains old workspace data across awaits, collector mutates before publication epoch checks, and a background parse promise lacks a catch. Cross-workspace mutation is strongly indicated, not reproduced.
* **Solution:** Add controlled interleaving tests first; introduce project/epoch checks at mutation boundaries where tests confirm the gap. Add local rejection reporting and descriptor shape validation.
* **Benefit:** Prevent stale operations affecting a changed workspace and replace silent/generic failures with useful messages.
* **Priority/complexity/risk:** P2; medium; medium risk.
* **Dependencies:** Preserve coordinator semantics from P1.2; no dependence on folder reorganization.
* **Verification:** Switch folder/project during dialogs, engine resolution, setup updates and watcher collection; delete Build.cs during parsing; malformed descriptor arrays; assert no wrong-project writes/processes.
* **Required or optional:** Required investigation/error handling; race-specific fixes conditional on reproduced behavior.

## Phase 2 — Architecture and organization

### P2.1 Make state transitions and service contracts readable

* **Problem/evidence:** Q01–Q03, `runner.js:21–145`, `runtimeCoordinator.js:6–47`, `runtimeWatcher.js:25–71`, `sidebar.js:7–15`; dense multi-action lines and late-mutated services obscure ownership.
* **Solution:** Reformat, introduce JSDoc contracts for ProjectContext/OperationResult/Services, name transitions and separate registration/view projection from workflow policy. Use the proposed directory plan only incrementally.
* **Benefit:** Safer reviews and easier isolated tests without feature changes.
* **Priority/complexity/risk:** P2; medium; low risk for formatting, medium for extraction.
* **Dependencies:** Phase 1 behavior locked by regression tests; update root `build_bundle.py` if files move.
* **Verification:** Existing suite, syntax checks, command inventory and packaged runtime completeness; review diff for behavior preservation.
* **Required or optional:** Recommended maintainability; folder moves optional.

### P2.2 Centralize policy-bearing validation and configuration

* **Problem/evidence:** Q04–Q06, `core.js:16–18`, `engine.js:8`, `classWizard.js:12–19`, `classFiles.js:6–17`, `dirtyTracker.js:4–11`, `runtime.js:7–11`, `package.json:183–227`; duplicated rules and inconsistent interval/containment semantics.
* **Solution:** Share version/association, path-containment and normalized automation-setting helpers; validate descriptor shapes once. Keep exclusive-file transactions and WorkspaceEdit application separate.
* **Benefit:** Fewer policy inconsistencies and clearer errors for unsupported inputs.
* **Priority/complexity/risk:** P2; medium; medium risk in filesystem helpers.
* **Dependencies:** P1.3 establishes desired engine behavior; P2.1 contracts help but are not mandatory.
* **Verification:** Parent/root/relative/case/junction paths, malformed descriptors, numeric/GUID versions, interval 0/1/9/10/3600, saved configuration migration and no unexpected writes.
* **Required or optional:** Required where fixing divergent validation; consolidation elsewhere recommended.

### P2.3 Remove small maintenance hazards

* **Problem/evidence:** Q08–Q10, unused parameters/locals in `dependencyIndex.js:9–10`, `dependencyDiagnostics.js:33`, `moduleTemplates.js:24`; mojibake in `diagnostics.js:101`; duplicate root/extension docs.
* **Solution:** Remove genuinely unused internals, fix report encoding, document compatibility exports and select one documentation source/check-copy workflow. Do not rename stable public command/package IDs.
* **Benefit:** Less ambiguity and documentation drift.
* **Priority/complexity/risk:** P3; small; low risk.
* **Dependencies:** None; preserve callers/tests of exported helpers.
* **Verification:** Search call sites, run affected tests and syntax checks, compare document copies and report output.
* **Required or optional:** Encoding correction recommended; cleanup optional.

## Phase 3 — Modernization and compatibility

### P3.1 Establish a tested compatibility policy and matrix

* **Problem/evidence:** `core.js:16–18` accepts future major versions; `generation.js:7–16` assumes UBT .exe layouts; `extension.js:137–144` discovers a companion command by title; historical UE 5.8.1 evidence is narrower than “5.8+”.
* **Solution:** Separate minimum-policy acceptance from tested compatibility; record engine patch, VS Code and companion versions. Validate modern/source installations and companion command/task/provider contracts before adding adapters. Prefer explicit stable companion API/ID if available and verified.
* **Benefit:** Honest support claims and fewer upgrade surprises.
* **Priority/complexity/risk:** P2; medium; low risk for documentation/tests, medium for adapters.
* **Dependencies:** P1 fixes and a disposable engine/toolchain environment; user selects actual supported versions.
* **Verification:** UBT generation/build, templates/UHT, Editor/debug attach and task/IntelliSense configuration on each supported combination; minimum VS Code host plus current supported host.
* **Required or optional:** Required before broad compatibility claims; additional engines/platforms optional.

### P3.2 Scope activation and expensive refresh work

* **Problem/evidence:** F06; `package.json:15–17`, `runtimeWatcher.js:31–70`, `dirtyTracker.js:13–25`, `explorerClass.js:27–36`, `dependencyIndex.js:52–65`; unconditional startup activation and repeated collection.
* **Solution:** Measure startup/scan latency and file counts first. Consider workspaceContains activation while retaining later-project creation discovery. Reuse per-refresh module/plugin snapshots, filter irrelevant events, and add cancellable indexing/progress and stale-scan aborts.
* **Benefit:** Less extension-host and disk work on unrelated/large projects.
* **Priority/complexity/risk:** P2; medium; medium risk of missed refresh events.
* **Dependencies:** P2.1/P2.2 snapshot ownership; representative large project fixtures.
* **Verification:** No-project startup, project created after startup, interval 0, rapid saves/deletes, engine path change, cancellation and disposal; compare measured latency/I/O before/after.
* **Required or optional:** Profiling recommended; optimizations conditional on measured impact; index cancellation recommended.

### P3.3 Bound logs/parser state and harden distribution inputs

* **Problem/evidence:** F08/F09, `build.js:40,59–68`, root `build_bundle.py:9,16,28–29`; no parser/diagnostic caps, manual manifest duplication and recursive source ZIP inclusion.
* **Solution:** Bound incomplete parser fragments and diagnostic counts with visible truncation; define raw log retention. Derive shared manifest fields and package an explicit source allowlist. Evaluate official vsce only if it reduces maintenance.
* **Benefit:** Predictable resource use and reproducible, intentional release contents.
* **Priority/complexity/risk:** P2/P3; medium; medium risk of dropping useful diagnostics if poorly capped.
* **Dependencies:** P1.2 resource ownership; no new dependency required for initial checks.
* **Verification:** Huge newline-free output, many unique Problems, normal UBT logs; package with intentionally placed ignored/cache fixture files and verify exclusions, metadata and runtime closure.
* **Required or optional:** Bounds/distribution policy recommended; packager replacement optional.

## Phase 4 — Testing and developer experience

### P4.1 Add reproducible native extension-host validation

* **Problem/evidence:** `tests/vscode-smoke.js`, `vscode-dependency-smoke.js`, `vscode-automation-smoke.js`; useful opt-in modules but no manifest runner/CI integration. Most tests mock VS Code.
* **Solution:** Provide a documented isolated fixture/profile launcher; evaluate official VS Code testing packages in a separately approved dependency change. Separate host-only and engine-required tests; assert disposable workspace safety in every mutation harness.
* **Benefit:** Repeatable trust, UI, terminal, Undo and lifecycle verification.
* **Priority/complexity/risk:** P2; medium; low product risk, moderate fixture/process risk.
* **Dependencies:** P1 regressions; explicit choice of supported VS Code versions; no production workspace.
* **Verification:** Trusted/untrusted runs, activation, command/menu contributions, native WorkspaceEdit Undo, Quick Fixes, terminal cancellation/disposal, extension reload and workspace switch.
* **Required or optional:** Required for reliable release validation; choice of runner dependency optional.

### P4.2 Make engine validation failures fail the harness

* **Problem/evidence:** `tests/real-unreal-validation.js:5–6,34–41` records stage exit codes without asserting nonzero failure; live smoke scripts modify workspace files/settings and assume specialized fixtures.
* **Solution:** Assert each UBT stage, stop dependent stages after failure, bound process waits, retain versioned logs/results, restore settings as well as source and explicitly constrain all harnesses to disposable roots.
* **Benefit:** Reliable integration-test exit status and safer repeatability.
* **Priority/complexity/risk:** P2; small–medium; low production risk.
* **Dependencies:** P3.1 version matrix; P4.1 launcher for host tests.
* **Verification:** Inject failed generation/module/plugin compile and hung child; assert nonzero harness exit and retained evidence; successful disposable UE path.
* **Required or optional:** Required before using harness results as CI gates.

### P4.3 Establish lightweight quality/release checks

* **Problem/evidence:** `package.json:284–286` provides only tests; no CI/lint/type-check configuration. Current packaging integrity was checked manually in this audit.
* **Solution:** Add documented syntax/test/artifact checks, Windows CI, selected static JS checks and formatter only after approving any needed dependencies. Check command registration, packaging completeness, document parity and clean checkout outputs. Start with built-in tools; do not require a full TS conversion.
* **Benefit:** Prevent omission/format drift and make release claims reproducible.
* **Priority/complexity/risk:** P2; medium; low product risk.
* **Dependencies:** P3.3 package policy and P4.1/P4.2 test separation.
* **Verification:** Fresh checkout on supported Node/VS Code matrix, deliberate broken package entry/metadata/test stage, no unintended artifact mutation during read-only checks.
* **Required or optional:** Recommended; lint/type-check tooling and CI provider choices optional.

## Phase 5 — Optional enhancements

### P5.1 Expand source/dependency assistance selectively

* **Problem/evidence:** `dirtyTracker.js:10–11` watches cpp/h/inl/ipp while dependency indexing also accepts hpp (`dependencyIndex.js:30`); existing dependencies suppress missing-dependency hints regardless of Public/Private exposure (`dependencyDiagnostics.js:28`).
* **Solution:** If used by real projects, add .hpp/.cxx classification and conservative Public-header/Private-dependency advisories. Retain user-confirmed edits and ambiguity refusal.
* **Benefit:** More complete assistance for non-default project conventions.
* **Priority/complexity/risk:** P3; medium; medium false-positive/automation risk.
* **Dependencies:** P2.2 shared classification policy, P4 regression infrastructure and explicit product preference.
* **Verification:** Nonstandard extension saves, ignored/generated files, public/private include fixtures, conditional Build.cs read-only behavior and no speculative auto-edits.
* **Required or optional:** Optional new features.

### P5.2 Add project/platform breadth only when needed

* **Problem/evidence:** Single-root/Win64 and conventional target scope in `project.js:23,48`, `runner.js:74`; independent windows/tasks have no common operation gate.
* **Solution:** First gather actual demand for multi-root, Linux/macOS, nested targets or cross-window coordination. Introduce project selection/process adapters only for selected workflows, with platform-specific toolchain tests. Keep external Live Coding triggering separate until a supported interface is demonstrated.
* **Benefit:** Broader workflows without compromising the existing Windows path.
* **Priority/complexity/risk:** P3; large; high risk.
* **Dependencies:** Stable contracts from Phase 2 and per-platform native/Unreal tests from Phases 3–4.
* **Verification:** Independent project states, correct command routing, platform launch/quoting/debugging, concurrent windows and trust boundaries.
* **Required or optional:** Optional new features; no implementation recommended merely for architectural symmetry.

## First implementation scope

Start with P1.1 and its regression fixtures, then P1.2. Fix P1.3 as a small independent patch; investigate P1.4 before changing concurrency semantics. Keep these reviews separate from formatting/moves. Exit Phase 1 only when concurrent user bytes are preserved/recoverable, failed cancellation cannot silently free the gate or hang without explanation, operation resources are bounded, and engine/target regressions pass alongside the existing 301 tests. A later fresh Unreal/host validation is needed before a release claim.
