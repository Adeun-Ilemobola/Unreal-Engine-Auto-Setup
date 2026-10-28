# Unreal Engine Auto Setup — audit summary

Completed 2026-10-27 against source version 0.8.0. The initial working tree was clean. Only the requested audit Markdown documents were added; production behavior, manifests, dependencies and existing artifacts were preserved. No roadmap implementation was started.

## What exists

The extension provides Windows/Win64 project setup, managed UBT builds and project-file generation, Editor detection/launch and C++ debugger attach, class/module/plugin creation, conservative module-dependency editing/indexing, and opt-in saved-change build automation. It delegates IntelliSense to Skybox and Microsoft C/C++. It does not edit Blueprint assets, control PIE, cook/package games or trigger Live Coding externally.

There are 32 production CommonJS modules, 35 contributed commands, five settings, a native sidebar and two status actions. No npm dependencies or webviews are present. The architecture already separates many pure helpers, transactions, UI and process concerns; a rewrite is not warranted.

## Most important findings

| Priority | Finding | Confidence |
| --- | --- | --- |
| P1 | F01: regeneration can restore old configuration/descriptor bytes over a concurrent saved edit (`generation.js:18–62`) | Confirmed by source and disposable probe |
| P1/P2 | F02: taskkill errors are ignored; cancellation remains pending unless child close arrives (`build.js:29–31,93`) | Source-confirmed; stalled promise reproduced with an injected no-op terminator, not a real taskkill failure |
| P2 | F03: completed runs retain terminal/emitter subscription references (`build.js:94–96`) | Ten mocked completed builds added 30 subscriptions; host heap impact not profiled |
| P2 | F04: discovered engines always need both executables, even when flags request neither (`engine.js:54`) | Confirmed by source and disposable probe |
| P2 | F05: quoted C# text can be mistaken for an Editor target assignment (`project.js:13–16`) | Confirmed by source and disposable probe |
| P2 | F06/F07: broad repeated scans, uncancellable indexing, implicit async state contracts and incomplete background error handling | Source-confirmed paths; performance and stale-workspace outcomes need targeted tests |

No confirmed critical code-injection vulnerability or UE 5.8 API-level incompatibility was established. Trust gating, argument validation, exclusive file writes, conservative dependency parsing, owned-file rollback, process Unknown handling and revision-based build coordination are strengths to preserve. Remaining race/TOCTOU concerns are not presented as proven exploits.

## Architecture and naming

Activation composes mutable services; runner orchestrates commands; a coordinator owns debounce and the in-extension build/regeneration gate; watcher collection updates source/metadata state, sidebar/context keys and dependency models. Static literal local-require analysis found no cycles. Runtime callbacks still couple watcher → dependency sync → refresh, and two state systems require coordinated updates.

Dense one-line functions hide complexity. `core`, `runner` and `runtime` have broad names, service shapes are implicit, and version/path rules are duplicated. Recommend formatting, JSDoc contracts, centralized policy helpers and incremental separation of VS Code adapters, Unreal models, workflow coordination and process/file adapters. Folder moves and TypeScript are optional; stable public IDs should remain unchanged.

## Validation and compatibility

* **301/301 existing tests passed**, with zero failures/skips, after an approved rerun outside the sandbox. The initial sandbox run failed on temporary-fixture permission operations.
* JS syntax and whitespace checks passed. Existing 0.8.0 VSIX ZIP/XML integrity and packaged non-test source equality passed. Root/extension documentation copies match.
* Five targeted source/probe findings are recorded with reproducible commands in [testing and tooling](05-testing-and-tooling.md).
* Real Unreal builds, live VS Code smoke suites, debugger attachment and package rebuild were not run. Historical UE 5.8.1 success is documented in the repository; it is not fresh validation from this audit.
* Minimum policy accepts UE 5.8 and every later major/minor. This does not establish future compatibility. Source engines without UBT.exe, unconventional targets/modules, other platforms and multi-root workspaces remain unsupported or unverified.

The official documentation review supports using native lifecycle/trust APIs, reproducible extension-host testing and deliberate activation scope; no framework migration is needed. See [VS Code testing guidance](https://code.visualstudio.com/api/working-with-extensions/testing-extension) and [Epic VS Code setup](https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-visual-studio-code-for-unreal-engine). Detailed source comparisons and current documentation links are in the reports below.

## Recommended next decision

Approve a narrowly scoped first phase: conflict-safe regeneration, acknowledged cancellation and resource cleanup, then capability-consistent engine discovery and literal-aware target parsing. Add the corresponding regressions before changing implementation. Investigate workspace-switch setup/collector races with controlled tests. Defer architecture moves and optional enhancements until these behaviors are protected.

Unanswered questions for a later implementation/release phase:

1. Which exact engine patches, installed/source-engine layouts, VS Code versions and companion versions must be supported?
2. Are multiple VS Code windows, external/Skybox build tasks or simultaneous creation/regeneration common in the user's workflow?
3. How large are real project/plugin trees, and is indexing latency currently a problem?
4. Is distribution intended to remain local VSIX, or is Marketplace publishing planned?
5. Are multi-root/platform breadth and nonstandard source extensions actually needed?

These questions do not block the confirmed defect fixes. Actual UE build/Editor behavior, native resource lifetime and race incidence cannot be settled by source inspection and mocked tests alone.

## Deliverables

* [00 — Repository inventory](00-repository-inventory.md)
* [01 — Current architecture](01-current-architecture.md)
* [02 — Code quality](02-code-quality.md)
* [03 — Unreal integration](03-unreal-integration.md)
* [04 — Reliability, security and performance](04-reliability-security.md)
* [05 — Testing, tooling and exact validation commands](05-testing-and-tooling.md)
* [06 — Proposed architecture](06-proposed-architecture.md)
* [07 — Phased roadmap with evidence, risk, dependencies and verification](07-improvement-roadmap.md)
