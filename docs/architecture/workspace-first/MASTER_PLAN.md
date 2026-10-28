# Unreal Engine Auto Setup — Workspace-First Architecture Migration

**Master plan / living specification**  
**Created:** 2026-10-28  
**Status:** Proposed; **no migration has been executed by this document**  
**Product:** Unreal Engine Auto Setup (Alpha)  
**Stable extension ID:** `local-tools.unreal-project-tools`  
**Current reference environment:** Windows 11, VS Code, installed Unreal Engine 5.8, C/C++ extension; other versions are not automatically certified  
**Plan shape:** **Exactly five main phases; each has only subphases A and B.**  
**Execution rule:** Finish and verify one subphase before moving to the next. Phase 4E, already underway in the prior development track, is the handoff baseline—not an automatically completed or accepted prerequisite.

> **Mission:** Stop inventing a parallel Unreal development environment. Make Unreal Engine and UnrealBuildTool the authoritative build/project systems; make VS Code's native workspace, task, debugging, configuration and extension APIs the primary integration surface; make our extension a thin, reliable, ergonomic layer for discovery, workspace bootstrap, C++ type creation, dependencies, diagnostics and safe automation.
>
> **Priority:** A reliable workflow beats a long feature list. Removing redundant code is a successful outcome when native behavior replaces it demonstrably. Do not preserve complexity merely to preserve past effort.

---

## 0. What we know, what we do not, and why the architecture is changing

### 0.1 User-directed operating assumptions

1. `hex` and all successor Unreal projects used during development are **disposable, reproducible test fixtures**, **not** the beginning of actual game development. They may be recreated at will; **do not silently delete a project without identifying the exact owned fixture and receiving the relevant authorization**.
2. Preferred clean setup: create a Blueprint project in Unreal Editor; add exactly one trivial temporary C++ class *through Unreal* so the project is C++-capable; **do not invoke Unreal's VS Code / IDE project-file generator as a prerequisite**; open or bootstrap the project's development workspace using our extension. A separate baseline may be created using Unreal's C++ project template for comparison.
3. The **target presentation** is a VS Code multi-root workspace with **Project** and **Engine** roots, as in the provided screenshot. Both roots are navigable. All extension writes must be limited to the project/extension-owned configuration and purposefully created scratch/test locations—not the installed engine root.
4. Standard behavior comes first: project identification, usable classes, build, errors, IntelliSense, debugger, tasks, reload and repeatability. Rich automation, custom UI and additional templates are secondary.
5. Class/type creation **must work repeatedly in the same VS Code session**. Existing observed failure: the first folder-context creation succeeds and subsequent invocations may appear to do nothing until VS Code is restarted.
6. Existing observed editor problem: after class generation, cpptools reports missing source entry in `.vscode/compileCommands_Default.json` and missing `UObject/Object.h`. A target-query task is **not** proof of a successful full C++ build.
7. Another Unreal integration, **SkyBox's Unreal Engine Integrations**, may interfere by providing a C/C++ configuration provider, custom task type, setup, or activation side effects. Isolate it in tests; do not assume it is definitively the cause.
8. **P1.1 remains a live architecture/safety concern**: UBT regeneration can write generator-owned configuration, and restoring old snapshots over later user edits is unsafe. We need elimination of the conflicting workflow, safe ownership boundaries, or a proven conflict-safe alternative—not simply a green test obtained by deleting the old assertion.
9. Test executables, packaged fixture helpers, process-supervision artifacts, isolated VS Code profiles and temp test outputs belong under **`C:\Dev\Scratch\UnrealAutoSetupTests`**, already covered by the user's development antivirus exclusion. Set scoped `TEMP` / `TMP` for relevant child test processes if needed. Do not change global environment variables, disable Bitdefender, or scatter tests under `%LOCALAPPDATA%\Temp` unnecessarily.
10. Real game development is deliberately postponed until the extension is stable. Do not use the user's future RPG/game source or any nonfixture project as a destructive validation target.

### 0.2 Evidence from the uploaded `hex` workspace ZIP

The supplied reference archive (`.zip`, previously uploaded in the conversation; do **not** assume an absolute local path inside Codex) contains **a generated example**, not a requirement that all future projects run the generator. Its `hex.code-workspace` declares:

```json
{
  "folders": [
    { "name": "hex", "path": "." },
    { "name": "UE5", "path": "C:\\Program Files\\Epic Games\\UE_5.8" }
  ]
}
```

Observed properties of that exact capture:

- Workspace top-level keys: `folders`, `settings`, `extensions`, `tasks`, `launch`.
- **24** native-style build/rebuild/clean tasks (generated combinations of targets/configurations).
- **Nine** launch configurations, including eight `cppvsdbg` launch entries and a Generate Project Files configuration using `coreclr`.
- Workspace settings provide Unreal-bundled .NET environment locations.
- `.vscode/c_cpp_properties.json` points at `compileCommands_hex.json` and `compileCommands_Default.json`.
- `.vscode/tasks.json` additionally contains a custom `UnrealBuildTool` task, which likely requires a provider; identify its owning extension rather than assuming VS Code itself supports this task type.
- Those captured compile databases included `hex.cpp` and `MyClass.cpp` only; they do not establish coverage for subsequently created `ModObject.cpp`.
- The engine root appeared separately as `UE5` in the screenshot; `.vscode` folders can exist in *both* roots. Do not edit the installed engine's `.vscode` merely because it is in the workspace.

**Distinction:** These facts describe the supplied captured workspace. The current installed extension, Unreal installation, and rebuilt fixtures must be independently inspected during Phase 1. Do not turn captured paths, toolchain versions, and sample counts into universal assumptions.

### 0.3 Constraints confirmed by public documentation

- **UBT builds independently of IDE project/solution files.** IDE files are for editor integration, not the authoritative project build graph. See official UnrealBuildTool documentation below.
- Unreal documents generating a VS Code workspace through the Editor, `.uproject` context menu, or `GenerateProjectFiles.bat -vscode`; these are established *options*, not an obligation to run generation before initial workspace bootstrap.
- VS Code **multi-root** workspaces have per-root and workspace-scoped settings, task and launch configuration resolution. Workspace-level variable references should identify named folders, for example `${workspaceFolder:hex}` and `${workspaceFolder:UE5}`, with dynamic names derived from actual workspace metadata.
- VS Code's API exposes `workspace.workspaceFolders`, `getWorkspaceFolder(uri)`, workspace trust, and workspace change events. Changing the first root can terminate/restart the current extension host: reactivation must be treated as a normal lifecycle event.
- Cpptools takes a compile database entry when available; when missing, it falls back to other configured compiler/include data. An executable build can succeed even if cpptools cannot yet index a newly created translation unit.
- VS Code task execution and debugging are native APIs. A custom process supervisor is justified only for capabilities (safe ownership/cancellation, provenance, or diagnostics) that native delegation cannot safely provide.

### 0.4 Core questions that this plan deliberately does not pre-answer

- Can a minimal two-root `.code-workspace` give reliable navigation and build integration **without any IDE regeneration**? Yes for opening workspace and launching UBT; **full IntelliSense may require a documented metadata-generation strategy**, to be proven.
- Can the extension provide an automatically updated cpptools configuration through a supported provider mechanism, instead of editing a UBT-owned compile database? Evaluate; do not assume.
- Does native VS Code task cancellation fulfill our full-tree process safety contract on Windows? **Not established**. Preserve the existing Windows Job Object supervisor or equivalent until evidence proves a suitable replacement.
- Must all 24 generated tasks be physically copied into our workspace? **No conclusion yet.** Prefer a small accurate task set or a native TaskProvider if verified to work reliably. Avoid duplicating an expensive generated matrix without benefit.
- Is the SkyBox extension necessary or helpful? **Unknown** until no-SkyBox, SkyBox-only and coexistence experiments.
- Does the proposed design truly eliminate P1.1? **Not until the file-write and concurrency matrix proves it.**

---

## 1. Non-negotiable design rules

### 1.1 Ownership hierarchy

| Owner | Authoritative responsibility | Allowed extension action | Forbidden assumption |
|---|---|---|---|
| Unreal Editor | Blueprint-to-C++ conversion, project assets, native workflows | Discover/import the resulting project; observe changes | Reimplement Blueprint asset authoring to make workspace work |
| UnrealBuildTool + UnrealHeaderTool | Source/target/module build graph, reflection, generated headers, compile jobs | Invoke documented tools; parse results; preserve boundaries | Treat a `.code-workspace` as a replacement for UBT/UHT |
| VS Code | Multi-root workspace lifecycle, tasks, debugging interface, settings, native UI, command registration | Use workspace and task/debug APIs; scope settings correctly | Treat the first workspace root as necessarily the game project |
| Microsoft C/C++ | C++ IntelliSense backend and database/provider handling | Configure documented inputs and diagnose stale/missing entries | Promise that a normal build *always* regenerates IntelliSense metadata |
| Unreal Auto Setup | Detection, bootstrap, UX, safe C++ type/module/plugin creation, dependency guidance, diagnostics, tested coordination | Own explicitly marked artifacts and changes | Override UBT-generated configuration silently |
| SkyBox / other companions | Optional separately owned integration surfaces | Detect conflicts, compose explicitly if useful | Make the project's core workflow depend on a third-party task provider unknowingly |
| User | Game files and manual changes | Request consent for destructive/conflicting edits | Overwrite user modifications in the name of convenience |

### 1.2 Extension behavior policies

- **Minimal bootstrap:** create/open a valid, clear, two-root workspace without requiring the generator. Retain a convenient single-root fallback for recognition and migration, but make the reference two-root mode first-class.
- **No engine-root writes:** navigation/indexing is permitted, but no engine `.vscode` edits, engine `.Build.cs` edits or engine-source patching. Treat symlinks and case/relative path aliases carefully.
- **Distinct state:** separate `ProjectIdentity`, `EngineIdentity`, `WorkspaceIdentity`, `MetadataStatus`, `BuildStatus` and `IntelliSenseStatus`. Do not conflate them in one “configured” boolean.
- **Stable public identity:** preserve `local-tools.unreal-project-tools`; audit old commands/settings and provide aliases/deprecation rather than breaking user installations silently.
- **Persistent vs. ephemeral:** keep user-owned `.code-workspace` settings, extension-owned markers, UBT-generated metadata and scratch artifacts in clearly separate lifetimes.
- **No misleading success:** `Build succeeded`, `Metadata current`, `IntelliSense ready`, and `Editor launched` are distinct outcomes, never combined as one checkmark.
- **No silent failure:** every command must either show a form/picker, complete with a result, or emit an actionable error. The second invocation cannot disappear behind a stale flag.
- **No scope explosion:** unrelated bugs discovered mid-phase enter the issue log unless they block that subphase; do not embark on incidental redesigns.
- **Trust & permissions:** obey workspace trust, selected roots and scoped file-write authorization. A trusted workspace is not consent to alter the entire engine installation.
- **Docs-first but evidence-driven:** use Unreal 5.8 and VS Code current API docs for supported behavior. Verify behavior on the user's installed engine and extension; do not rely on guessed internal UBT switches.

### 1.3 Candidate target modules (conceptual, not a mandate to implement every file)

```text
extension/
  activation/                 # small composition, registration, lifetime
  workspace/                  # discover roots, create/open .code-workspace, migration
  unreal/                     # project/engine/target/module model (read-mostly)
  vscode/                     # tasks, debugging, native commands, UI
  metadata/                   # UBT outputs + cpptools inputs, provenance, freshness
  creation/                   # type/module/plugin planners and safe file commits
  dependencies/               # Build.cs parsing/advice/editor operations
  execution/                  # safe native task/UBT execution and cancellation boundary
  diagnostics/                # one coherent Project Doctor & error reporting
  tests/                      # pure tests + real host + real UE fixture coverage
```

This is a **responsibility map**, not a requirement to immediately reorganize every source file. Existing CommonJS/native UI/simple functions can be retained. A single explicit owner per concern matters more than folder naming or fashionable framework migrations.

### 1.4 Required quality evidence for each subphase

Every subphase must leave:

1. `PLAN_STATUS.md`: scope, state (`Not Started` / `In Progress` / `Blocked` / `Accepted`), prerequisite checkpoint, exact acceptance results, next action.
2. `DECISIONS.md`: architecture decisions with alternatives considered and why, especially file ownership and replacement/deletion justifications.
3. `VALIDATION.md`: exact commands, environment/versions, test output, known failures, manual verification gaps, artifacts.
4. `CHANGES.md`: newly created/modified/deleted files and externally observable behavior changes.
5. A stable **Git diff checkpoint** (record HEAD/branch before and after; **no automatic commit, tag, reset, stash or force-clean without explicit user instruction**). A named suggested commit message is fine.
6. Explicit rollback instructions that restore this subphase alone and do not discard someone else's changes.
7. A fresh deterministic smoke on the fixture, not just a mock/unit-test claim, whenever a native VS Code interaction changes.

Place records in `docs/architecture/workspace-first/` or adapt to the repository's existing `docs/maintenance` conventions after inspecting the current checkout. **Do not create a parallel archive or duplicate reports unnecessarily.**

---

# Phase 1 — Baseline, ownership map and architecture decision

**Objective:** Know which layer owns each feature, identify present failures, and choose a minimal architecture before any expensive rewrite. Preserve the existing Phase 4E state until it is finished and validated.

## Phase 1A — Source-of-truth audit and controlled baseline

**Work:**

- Inspect the **actual present** repository, installed extension version/VSIX, changed Git tree, Phase 4E reports, manifests, commands, settings, tests, packaging and process supervisor. Historical 0.8.0 audits are reference data, not a substitute for current code.
- Inspect the user's captured `hex.code-workspace`, project `.vscode`, compile databases and project source *read-only*; derive the workspace schema rather than hardcoding the test project name.
- Compare three launch paths using disposable fixtures: (i) Blueprint -> one temporary Unreal C++ class -> open project **without** generating IDE files; (ii) native generated `.code-workspace` baseline; (iii) fresh conventional Unreal C++ project baseline. **Never mix those outputs in the same fixture.**
- Enumerate exactly what Unreal-generated workspace settings, native build tasks, debugger entries, compile databases, response files and generated headers contain; mark ownership and refresh triggers.
- Reproduce first creation / second creation unresponsive behavior in one host session. Record whether command dispatch, QuickPick/InputBox, operation gate, class file creation or UI presentation fails.
- Run no-SkyBox and with-SkyBox tests in **separate isolated VS Code profiles**; record all installed/active extensions and C++ provider/task ownership.
- Characterize P1.1 without risky writes: identify generator-touched paths, the current safe-conflict behavior and known failing acceptance. Record exactly when a user edit may be overwritten in legacy flow.
- Inventory behavior against native API support. Create an `OWNERSHIP_MATRIX.md` with decisions `Keep`, `Delegate`, `Replace`, `Remove`, `Investigate` per existing service/command.

**Outputs:** Current architecture graph, exact bug reproductions, workspace file schema and provenance inventory, conflicting writer list, test fixture definitions, deletion candidates, P1.1 problem statement.

**Acceptance:** A second creation failure is either reproduced with actionable trace or explicitly classified unverified with exact steps and environment; every current command/critical service has an owner and intended future disposition; three baseline modes are distinguishable; no production files modified.

**Checkpoint:** `WF-P1A`; suggested commit message `docs: record workspace-first baseline and ownership map` (user-authorized only).

**Stop/rollback:** If current Phase 4E is incomplete or the checkout is dirty unexpectedly, stop at read-only analysis and report rather than combining unfinished migrations.

## Phase 1B — Choose and prove a thin workspace architecture

**Work:**

- Compare: **A. Minimal extension-owned workspace**; **B. use only native Unreal-generated workspace**; **C. hybrid minimal bootstrap plus deliberate imported/updated Unreal metadata**. Score usability, generator dependency, IntelliSense, data-loss risk, maintenance cost, refreshability and test reproducibility.
- Run an isolated proof-of-concept to open project and engine roots via a minimal `.code-workspace` and establish the project/engine association without calling IDE generation.
- Confirm what must be generated later for cpptools/UHT and what a normal Editor build can supply. Document residual metadata gaps candidly.
- Decide task strategy: native workspace tasks, TaskProvider-backed tasks, or existing managed Build.bat wrapper. Include process-tree containment tradeoff; **do not remove proven Windows Job Object protections solely because a task API exists**.
- Define workspace/project selection rules for project-first, engine-first, renamed roots, missing engine, relocated fixture, several `.uproject` files, multiple projects, and unexpected workspace folders. Unsupported combinations must fail with a helpful message.
- Specify a generation/metadata ownership model with **no automatic restoration of snapshots over user changes**.
- Write `ARCHITECTURE_DECISION.md`, a first iteration of `COMPATIBILITY_MATRIX.md` and `MIGRATION_MAP.md` relating every previous public behavior to the new one.

**Acceptance:** A **real VS Code host** opens a minimal two-root reference workspace; commands identify the correct `.uproject` independent of root order; no engine writes; architecture choice made from evidence; a documented solution path exists for stale compile data and P1.1, with unresolved gaps explicit.

**Checkpoint:** `WF-P1B`; suggested commit `docs: accept workspace-first migration architecture`.

**Go/no-go:** **Do not enter Phase 2** until the file ownership model and process safety strategy are explicit. Avoid a rewrite driven only by aesthetics.

---

# Phase 2 — Workspace kernel and activation migration

**Objective:** Provide a reliable foundation for detecting, opening, reconciling, and managing Unreal projects in native VS Code multi-root workspaces.

## Phase 2A — Project/engine identities and workspace bootstrap

**Work:**

- Extract project/engine/workspace discovery into a small, testable context model that reads `.uproject`, associated engine info, `Source/*.Target.cs`, module rules and workspace folders safely.
- Support a project root and an installed engine root in a **single named `.code-workspace`**, defaulting to minimal settings and explicit ownership. Allow the bootstrap to create a new workspace or open an existing one; don't overwrite an existing workspace silently.
- Use documented VS Code workspace APIs to update scoped settings; do not text-rewrite `.code-workspace` files where a stable API exists. For file creation, preserve comments/ordering where applicable or choose new owned files; report conflicts.
- Handle activation, `workspaceFolders` transitions, folder renaming, Editor focus and reload without stale project/engine references; remember first-root changes may restart the host.
- Read engine root only. Avoid heavy recursive indexing of `Engine`, `Binaries`, `DerivedDataCache`, `Intermediate`, `Saved`, and other high-churn trees.
- Emit one explicit setup state: `Project found`, `Engine found`, `Workspace ready`, `Metadata missing/stale`, `C++ provider ready/missing`; independent statuses, never one ambiguous “Setup OK”.
- Preserve stable command IDs and user settings where possible; add a supported migration path from earlier single-root settings and old generated workspace layouts.

**Acceptance:** Repeated bootstrap is idempotent; opening/closing/reopening a minimal two-root workspace works, including engine path with spaces; engine root is never modified; an existing generated workspace is *recognized* and not destructively rewritten; no unexpected extra VS Code roots.

**Checkpoint:** `WF-P2A`; suggested commit `feat: add safe multi-root Unreal workspace kernel`.

## Phase 2B — Command composition, lifetime and UI reliability

**Work:**

- Refactor activation to create durable services once per host lifecycle; explicitly dispose listeners, operation gates, tasks, diagnostic collections, watchers and async cancellation state at shutdown/reload.
- Register Explorer commands against the **selected folder's owning project module**, not `workspaceFolders[0]`. Reject engine-root or unrelated paths for class creation with clear diagnostics.
- Fix the first-success/second-no-op class/type creation defect at its actual lifecycle boundary. Test same command, different commands, same folder, different folders, cancel/retry and errors before reopening the editor.
- Enforce serial UI operations where necessary but always clear locks in `finally`. Ensure every rejected/stale invocation produces feedback rather than silently returning.
- Trim startup dependencies and avoid auto-activating SkyBox or changing C++ providers without explicit user opt-in.
- Keep UX small: primary Setup / Build / Run / Add Unreal Type / Diagnose actions; advanced commands available in the palette. Avoid recreating VS Code panels that already exist.

**Acceptance:** At least **10 consecutive class/type command invocations** in one session, including cancellations and mixed class kinds, without a VS Code restart or orphaned dialog/lock. Real Extension Host test records pass. Startup/reload/disposal tests pass. Correct root selection and engine-root refusal proven.

**Checkpoint:** `WF-P2B`; suggested commit `refactor: stabilize workspace lifecycle and repeated commands`.

---

# Phase 3 — Native build, debugger and IntelliSense integration

**Objective:** Delegate common IDE capabilities to VS Code and Unreal where appropriate; retain tested safety guarantees and provide a straightforward user workflow.

## Phase 3A — Build/task/debug owner migration

**Work:**

- Inventory all generated task labels/configurations from native example and all existing extension commands. Select a compact canonical `Editor Development` pathway first; support other verified configurations deliberately, not by copying a 24-task matrix blindly.
- Prefer VS Code's task UI and API where possible; the extension may present custom QuickPicks to select target/configuration but should invoke an authoritative native or validated managed task.
- `UnrealBuildTool` task **type is not assumed native**. In SkyBox-off tests, either provide owned task implementation or use documented shell/process tasks that do not require another extension.
- Keep compiler Problems reliable via tested problem matchers/parsing and accurately distinguish target queries from actual compile jobs.
- Reuse generated VS Code `cppvsdbg` launch configurations if present and valid; when absent, use supported dynamic debug APIs or a small owned fallback. Don't modify unrelated launch entries.
- Retain managed process ownership/recovery if native VS Code task execution fails cancellation/full-tree guarantees. Verify real Windows cancellation and detach/re-attach across reload before removing any supervisor code.
- Never start two conflicting UBT jobs for the same canonical project/target; report blocked/unknown process states.

**Acceptance:** Real `Editor Win64 Development` build succeeds on a clean fixture, fails visibly on an intentional compiler error, and can run again; Debug attach/detach/re-attach works; cancellation leaves no orphaned owned compile tree; SkyBox-off build works. No unverified process-safety functionality is deleted.

**Checkpoint:** `WF-P3A`; suggested commit `feat: integrate native Unreal workspace build and debugger flows`.

## Phase 3B — IntelliSense metadata and reflection lifecycle

**Work:**

- Establish a documented metadata path for cpptools on **minimal bootstrap workspaces** (no prior IDE generation) and for **already generated** workspaces. Prefer UBT-generated compiler commands/provider over hand-fabricated flags.
- Detect the difference between a missing compile database, a missing entry for a new `.cpp`, stale response files, missing UHT-generated headers, missing engine headers, and an actual compiler/UHT failure.
- Define triggers for metadata refresh after generating reflected classes, structs/enums and after Build.cs/Target.cs changes. The user-facing sequence should be simple and deterministic; **a normal Build may or may not be sufficient** depending on the verified provider.
- If UBT's `-vscode` generation is truly required, make it an **explicit, bounded action** governed by Phase 4's ownership rules; do not silently invoke legacy generation + snapshot restore.
- Investigate documented VS Code C/C++ configuration provider API as a potential alternative if its maintenance cost is justified. Do not implement a full language server.
- Provide a useful `Diagnose IntelliSense` result indicating the active cpptools provider, compile commands path, exact missing source entry and suggested safe corrective action.
- Test engine include `UObject/Object.h`, a generated `.generated.h` include, `UCLASS`, `USTRUCT`, `UENUM`, a second `cpp` created after first success, and DebugGame/Development metadata selection.

**Acceptance:** In an isolated clean fixture: multiple generated types compile through UBT; cpptools resolves engine and generated includes after the defined safe workflow; no spurious “success” while a new translation unit is absent from its database; manual and automatically *safe* metadata updates behave consistently. Proven by real host and Unreal tests, not only static JSON assertions.

**Checkpoint:** `WF-P3B`; suggested commit `feat: make Unreal IntelliSense metadata diagnosable and repeatable`.

---

# Phase 4 — Destructive-path safety, P1.1 resolution and feature pruning

**Objective:** Eliminate conflicting ownership and prove that integration no longer silently loses user changes. Delete or simplify redundant systems only after their replacements have passed tests.

## Phase 4A — File ownership, regeneration transaction and P1.1

**Work:**

- Define ownership for `.code-workspace`, project `.vscode/settings.json`, `tasks.json`, `launch.json`, `c_cpp_properties.json`, `compileCommands*.json`, `*.rsp`, project `.uproject`, `.Build.cs`, `.Target.cs`, generated intermediates, engine `.vscode` and extension markers.
- Use an *allowlist for writes*; never treat the entire workspace or engine root as mutable just because it is visible. Handle symlink/junction/hardlink and case/drive path equivalence within Windows.
- Audit all regeneration paths (manual command, build-and-run, add class/type/module, file watcher, auto-build, companion extension). Remove **implicit** regeneration where unnecessary.
- Prototype real UBT generation against disposable fixtures and byte-compare inputs/outputs under normal, failure, cancelled and concurrent user-save scenarios. Capture initial, during and after states.
- Prefer **no competing writes**: extension-owned settings separate from UBT-generated metadata; generator updates are deliberate and visible; never blanket-restore a snapshot.
- Where two actors can still edit the same file, choose a safe mechanism with explicit conflict reporting and recovery artifacts, not timestamps/hashes falsely presented as proof of writer identity.
- Verify any alternative output destination or isolation flag from the actual installed UE 5.8 source/help before using it; do not invent undocumented switches.
- Migrate/remove legacy generation-preservation implementation only when the replacement handles every tested case; keep a blocked state when full safety cannot be established.

**Acceptance / P1.1 close criteria:** No silently overwritten user edits in controlled concurrent-save tests; real Unreal generation does not erase extension/user settings without explicit conflict/reporting; failures and cancellation preserve recovery evidence; engine-root config is untouched; an intentional user save during generation is not silently reverted. If any criterion fails, **P1.1 stays OPEN**, even if the old code has been removed. Retain/explain existing failing acceptance until new stronger assertions are demonstrated.

**Checkpoint:** `WF-P4A`; suggested commit `fix: separate Unreal metadata ownership and close P1.1 safely` **only if verified**; otherwise `test: document remaining P1.1 conflict`.

## Phase 4B — Simplify and remove duplicated infrastructure

**Work:**

- For every `Remove`/`Replace` item in Phase 1's migration map, first identify the replacement and tests. Delete redundant setup passes, task JSON generators, unused wrapper code, duplicate watchers, auto-modified SkyBox settings, and unnecessary custom UI *only when evidence supports the removal*.
- Preserve class/type/module/plugin generation, dependency tooling and core diagnostics with a thin command interface. Reorganize into ownership modules where it actually improves maintainability, not as a cosmetic mass move.
- Consolidate configuration parsing and project identity; eliminate duplicated scanning, stale callbacks and hidden singleton state.
- Document deliberate behavior changes and migration aliases; minimize new settings. Keep backward compatibility where practical and explicitly surface breaking changes.
- Avoid “repair by rewrite” for stable Windows Job Object supervisor/cancellation code, unless tests show native replacement equivalence.
- Keep docs, packaging files and release scripts in sync with actual module paths and current feature set.

**Acceptance:** Public command inventory has a mapped result (retained/aliased/removed with reason), unit and native host tests pass, security and cancellation invariants hold, no stale module references, no duplicate setup side-effects. Net code size may shrink; **the metric is fewer competing owners and lower failure rates**, not arbitrary line-count targets.

**Checkpoint:** `WF-P4B`; suggested commit `refactor: remove redundant Unreal workspace integration layers`.

---

# Phase 5 — End-to-end acceptance, packaging and stable development workflow

**Objective:** Establish real-world reliability, ship an easily installable VSIX, and create a maintenance baseline without requiring new disposable-project reconstruction for every minor change.

## Phase 5A — Reproducibility and interference matrix

**Work:**

- Automate creation or deterministic rebuilding of disposable fixture(s); never mix test cases' generated metadata.
- Test three modes: **ours only + Microsoft C/C++**, **ours + SkyBox**, and **SkyBox baseline where meaningful**. Run with isolated user-data/extension directories. Record exact versions and active provider/task owner.
- Run the full scenario from fresh Blueprint project -> temporary Unreal C++ conversion -> no IDE workspace generation -> workspace bootstrap -> 10+ class/type generations -> modules/dependencies -> build -> IntelliSense -> launch/debug -> reload -> repeat.
- Compare against native Unreal-generated `.code-workspace`; test import/recognition without destructive changes.
- Use reproducible fault injection: syntax errors, stale/deleted compile entry, inaccessible engine, bad path with spaces, missing module, cancelled build, task exit failure, VS Code host reload, multiple roots in changed order, user edits during metadata update.
- Test class/type matrix: plain UObject, AActor, ActorComponent, interfaces, USTRUCT/UENUM header-only, folders/Public-Private layouts, duplicate name refusal, generated include placement, repeated use.
- Regression-test companion effects (tasks, config provider, startup events) and ensure no old Phase 4E release-gate misreporting (e.g., one known P1.1 acceptance failure must **not** be buried under a “pass” label).
- Assess expensive engine indexing; ensure no routine whole-engine scan on each save or focus event. Check startup time and memory growth under repeated operations.

**Acceptance:** All mandatory scenarios pass or are explicitly blocked with one actionable failure and no data loss; 10+ consecutive repeated operations work after build/reload; no hidden companion dependency; critical real-UBT tests are reproducible on the user's machine; release gate reflects *all* relevant failures honestly.

**Checkpoint:** `WF-P5A`; suggested commit `test: prove workspace-first Unreal workflows and isolation`.

## Phase 5B — Installer, documentation and release decision

**Work:**

- Clean stale versioned local packaging outputs safely within the extension-owned artifact directory; do not delete source or unrelated files. Produce **one unambiguous current `.vsix`** and any explicitly wanted source archive.
- Keep stable extension ID `local-tools.unreal-project-tools`; choose version according to actual migration and compatibility status, not by optimistic labeling.
- Test VSIX install/update into a clean isolated profile and into the intended manually selected profile without silently modifying unrelated extensions. Verify version shown in VS Code.
- Write a short user guide for: create Blueprint project -> add C++ class -> open/bootstrap workspace -> create types repeatedly -> build -> repair IntelliSense -> debug -> update metadata safely.
- Publish a `KNOWN_LIMITATIONS.md` with UE version evidence, generator behavior, SkyBox coexistence requirements, P1.1 status (closed only with evidence) and process ownership restrictions.
- Refresh README / package commands / prompts index; archive the full migration plan and subphase records without proliferating duplicated copies.
- Provide clean release notes, migration guide from pre-workspace-first versions, rollback to the known-good VSIX, and a test summary from both mock and real host/engine runs.
- Produce a concise **Go / Conditional Go / No-Go** decision for actual game development; if unresolved critical reliability bugs remain, **no-go** even if the installer packages successfully.

**Acceptance:** Downloadable local VSIX exists with verified path/hash and stable extension ID; clean install and repeat workflow pass; documentation matches behavior; no critical unreported failure; approved baseline is suitable for ordinary use (if full reliability criteria are met).

**Checkpoint:** `WF-P5B`; suggested commit `release: workspace-first Unreal Auto Setup validated build`.

---

## 2. Phase dependency / checkpoint register

| Checkpoint | Required proof before accepting | Safe place to resume |
|---|---|---|
| `WF-P1A` | Current repo/4E baseline, exact file ownership and reproduction evidence | Re-read Phase 1A findings |
| `WF-P1B` | Accepted architecture decision + real minimal multi-root proof | Begin Phase 2A |
| `WF-P2A` | Idempotent bootstrap + project/engine association/reopen | Begin Phase 2B |
| `WF-P2B` | Same-session repeated creation and lifecycle tests | Begin Phase 3A |
| `WF-P3A` | Safe real builds, cancel/restart, debugger, without SkyBox | Begin Phase 3B |
| `WF-P3B` | Correct C++/UHT/IntelliSense metadata flow | Begin Phase 4A |
| `WF-P4A` | **P1.1 genuinely closed** or explicit blocking evidence | Begin Phase 4B only with risk acknowledged |
| `WF-P4B` | Redundant ownership removed without regressing safety | Begin Phase 5A |
| `WF-P5A` | Full isolated real integration matrix and accurate gate | Begin Phase 5B |
| `WF-P5B` | Verified VSIX, docs and Go/No-Go outcome | Ordinary development if Go |

### Resume protocol (mandatory after model usage interruption)

1. Read this master plan, `PLAN_STATUS.md`, the most recently accepted subphase record, Git HEAD/status and any in-progress Codex action log.
2. Do **not** assume a command succeeded simply because it appeared in a prior agent response; independently inspect artifacts and results.
3. Resume the **earliest incomplete acceptance criterion** of the current subphase. Do not rerun previous long research or rebuild the same fixtures unless validation integrity requires it.
4. Preserve previously produced migration decisions, reversible changes and known failure evidence. Keep one source of truth for status.
5. On interruption, write a concise `RESUME.md`: exact last successful operation, changed files, uncommitted edits, currently running processes, blocked items, next command and expected result.
6. Never auto-commit/reset/clean to make status look neat. Ask the user before destructive Git actions outside precisely owned throwaway test fixtures.

### Per-subphase execution contract for Codex

```text
Read the master plan and current status first.
Implement ONLY the named subphase, after inspecting the real current checkout.
Prefer official Unreal Engine 5.8 and VS Code APIs/docs over speculative techniques.
Use disposable Unreal fixtures, never a real game project.
All owned test tools/temp artifacts: C:\Dev\Scratch\UnrealAutoSetupTests.
Do not alter installed UE, external extensions, unrelated applications,
Bitdefender, global TEMP/TMP, or user-wide VS Code preferences.
Preserve stable extension ID and backward compatibility where feasible.
No automatic commits, resets, rebases, publishes or broad deletions.
Never hide an existing failing acceptance test or claim P1.1 is solved early.
Leave CHANGE/VALIDATION/STATUS/RESUME information in the established archive.
Stop at this subphase's acceptance boundary; report the next subphase.
```

---

## 3. Validation matrix and minimum measurable outcomes

| Scenario | Unit / contract | VS Code host | Real Unreal | Required phase |
|---|---|---|---|---|
| Detect `.uproject` and engine in either root order | Yes | Yes | Example project | 2A |
| Create/open two-root `.code-workspace` without generation | Yes | Yes | Blueprint-to-C++ fixture | 2A |
| Re-run bootstrap, no duplicate writes | Yes | Yes | Fixture | 2A |
| 10+ class/type creations, no restart | Yes | **Yes** | Fixture | 2B |
| Cancel/retry class wizard (same folder/different folder) | Yes | **Yes** | Fixture | 2B |
| Engine-root create command refused clearly | Yes | Yes | Engine root read-only | 2B |
| Existing native or owned build task works without SkyBox | Yes | Yes | **Yes** | 3A |
| Real failure shows compiler/UHT error, not query-only result | Yes | Yes | **Yes** | 3A |
| Build cancel/full-tree containment/retry | Yes | Yes | **Yes** | 3A |
| Debug attach/detach/re-attach and Editor survival | Yes | Yes | **Yes** | 3A |
| `UObject/Object.h` and `.generated.h` resolution | Yes | Yes | **Yes** | 3B |
| New `.cpp` absent from compile database handled explicitly | Yes | Yes | **Yes** | 3B |
| Concurrent user edit while metadata regeneration runs | Yes | Yes | **Yes** | 4A |
| Metadata failure/cancel has no silent user-file reversion | Yes | Yes | **Yes** | 4A |
| SkyBox off / enabled provider & task comparison | Yes | Yes | **Yes** | 5A |
| Install VSIX in fresh profile; version/commands match | Yes | **Yes** | Smoke | 5B |

**Default conservative behavior:** Until the migration proves otherwise, automation should remain **Watch/off** rather than automatically rebuilding and regenerating a fixture in response to every save. Builds and metadata changes must not run concurrently with each other in unsafe conditions.

---

## 4. Initial workspace strategy sketch (NOT production implementation)

The goal is to begin with an ordinary, manageable `.code-workspace`, not to masquerade as Unreal's generated comprehensive workspace. A simplified conceptual example:

```json
{
  "folders": [
    { "name": "Project", "path": "." },
    { "name": "UE5", "path": "C:\\Program Files\\Epic Games\\UE_5.8" }
  ]
}
```

**Cautions:**

- Do not hardcode `Project`/`UE5`, the user's engine location, or `hex` into runtime logic. Names and locations are resolved from the actual workspace and verified project association.
- This sample alone provides **navigation only**. No compile commands, tasks, debugger configurations, reflection output or correct build invocation are implied.
- A more complete bootstrap may add workspace-scoped tasks and settings **only after** API/provenance ownership analysis. Prefer safe VS Code APIs over rewriting generator-managed JSON.
- A second engine root may significantly increase indexing cost. Hide/limit irrelevant directories and defer broad scans; do not confuse Explorer visibility with full engine indexing.
- For workspace-level tasks and launch configurations, use named root variable scoping as required by VS Code; tasks stored under a particular folder have different variable context.

---

## 5. Documentation to consult during each phase

**Official Epic Games / Unreal Engine sources**

1. [Setting Up Visual Studio Code for Unreal Engine — UE 5.8](https://dev.epicgames.com/documentation/unreal-engine/setting-up-visual-studio-code-for-unreal-engine?application_version=5.8) — generated workspace behavior, setup alternatives, compiler environment.
2. [UnrealBuildTool](https://dev.epicgames.com/documentation/unreal-engine/unreal-build-tool-in-unreal-engine) — build independence from IDE files and module rule ownership.
3. [Compiling Game Projects](https://dev.epicgames.com/documentation/en-us/unreal-engine/compiling-game-projects-in-unreal-engine-using-cplusplus) — Blueprint-to-C++ conversion and build workflow.
4. [Build Configurations Reference](https://dev.epicgames.com/documentation/unreal-engine/build-configurations-reference-for-unreal-engine) — Editor, Game, DebugGame, Development distinctions.
5. [Build Configuration](https://dev.epicgames.com/documentation/en-us/unreal-engine/build-configuration-for-unreal-engine) — UBT configuration paths and scope.

**Official Microsoft VS Code sources**

6. [What Is a VS Code Workspace?](https://code.visualstudio.com/docs/editing/workspaces/workspaces) — saved workspaces and per-folder settings.
7. [Multi-root Workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces) — multi-root tasks, launch, settings, precedence.
8. [VS Code Extension API](https://code.visualstudio.com/api/references/vscode-api) — workspace folders, trust, task and debug interfaces, lifecycle.
9. [Variables Reference](https://code.visualstudio.com/docs/reference/variables-reference) — named-root variable resolution.
10. [C/C++ IntelliSense Configuration](https://code.visualstudio.com/docs/cpp/configure-intellisense) — provider/compile commands precedence, missing-file fallback.
11. [C/C++ Extension Settings](https://code.visualstudio.com/docs/cpp/customize-cpp-settings) — cpptools compile database fields.
12. [Task Provider API](https://code.visualstudio.com/api/extension-guides/task-provider) — Shell/Process/CustomExecution capabilities and costs.
13. [Debugger Extension API](https://code.visualstudio.com/api/extension-guides/debugger-extension) — dynamic debugger configuration and native debug APIs.
14. [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension) — native Extension Development Host and isolated profile tests.
15. [Workspace Trust for Extensions](https://code.visualstudio.com/api/extension-guides/workspace-trust) — trusted execution and per-workspace policy.

**Use policy:** Read official documentation relevant to the current subphase, confirm API behavior against installed versions, and capture docs consulted in its validation record. Public documentation establishes supported contracts; the provided ZIP and actual project experiments establish this specific installation's behavior. Distinguish the two.

---

## 6. Scope guardrails and risks

**Major risks:** accidental writes into installed UE, IDE generator overwriting user settings, stale compilation databases after new class creation, native task cancellation not owning all descendants, SkyBox task/provider collision, multi-root path ambiguity, massive engine index costs, over-aggressive deletion of tested safety code, and a misleading green release gate.

**Mitigations:** explicit write allowlists, read-only engine root, narrow incremental changes, fixture ownership, separate host profiles, real UBT tests, copy/compare snapshots for experiments, strong process identity proof, no auto-regeneration until P1.1 is resolved, and an explicit fail/blocked status rather than a green claim.

**Out of scope unless separately authorized:** game gameplay/ability/subsystem design, Blueprint graph/asset authoring, engine source modification, cross-platform support, engine packaging/cooking, new language servers, massive React/web UI rewrites, wholesale TypeScript conversion, automatic publishing to Marketplace, machine-wide antivirus/Windows configuration changes, or refactoring unrelated repositories.

### Release-ready definition (not negotiable)

A user opens a fresh disposable Blueprint-to-C++ Unreal project in an isolated VS Code workspace with project and engine roots, generates several classes/types without restart, builds cleanly, sees reliable C++/UHT diagnostics, has usable IntelliSense after the defined workflow, can launch/debug/restart safely, can repeat after host reload, and experiences **no silent configuration/data loss**. The extension works without an undocumented dependency on SkyBox; with SkyBox installed it either interoperates or explicitly reports the conflict. Only then should ordinary game development be recommended.

---

## 7. Proposed status template (create once inside repo when implementation begins)

```markdown
# Workspace-first migration status

Overall: PROPOSED
Current subphase: 1A (not started)
Base branch/HEAD: <read from actual Git>
Phase 4E baseline accepted? <yes/no + evidence>
Known critical blocker: P1.1 open until verified
Next action: read real checkout and run Phase 1A read-only audit

| Subphase | State | Checkpoint | Key evidence |
| --- | --- | --- | --- |
| 1A | Not started | WF-P1A | — |
| 1B | Not started | WF-P1B | — |
| 2A | Not started | WF-P2A | — |
| 2B | Not started | WF-P2B | — |
| 3A | Not started | WF-P3A | — |
| 3B | Not started | WF-P3B | — |
| 4A | Not started | WF-P4A | — |
| 4B | Not started | WF-P4B | — |
| 5A | Not started | WF-P5A | — |
| 5B | Not started | WF-P5B | — |
```

### Final instruction to future Codex sessions

**Never implement all five phases in one uncontrolled run.** Keep this complete future-facing plan as context, but execute only the next named, bounded subphase. Revisit architectural choices when real tests contradict them. Preserve working safety contracts and make every regression traceable to a checkpoint. **The objective is a smaller, dependable extension that works in actual VS Code, not a larger extension that passes only isolated mocks.**
