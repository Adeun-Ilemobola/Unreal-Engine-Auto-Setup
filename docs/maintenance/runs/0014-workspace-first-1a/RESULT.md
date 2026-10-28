# Phase 1A result: Incomplete

The 1.0.0 Alpha working tree is the accepted baseline. Source/ownership investigation, reference inspection and required documentation are complete; native validation is blocked and remains explicit. No Phase 1B or implementation work was started.

Key findings:

1. The actual extension rejects two-root workspaces across discovery, setup, creation, dependency editing and regeneration context checks.
2. The class wizard's post-success notification keeps its active lock pending; a second invocation returns silently. The mechanism was reproduced under simulated UI and releases on dismissal. Native user symptom remains unverified.
3. SkyBox owns the captured UnrealBuildTool task and a C++ configuration provider. Our setup installs/activates it and duplicates build selection/task surfaces.
4. hex/.zip matches the extracted reference: 24 shell tasks, nine launch configurations, two databases each covering only hex.cpp and MyClass.cpp. No ModObject.cpp exists in this capture.
5. Installed UE generator source can write engine .vscode metadata. Recovery reports conflicts; it cannot enforce a no-engine-write boundary.
6. P1.1 remains failing and unchanged. Focused tests: **30 passed / 1 failed**, exit 1 after resolving two sandbox-only junction failures.
7. Native host launch was refused by the existing VS Code updater; no native or SkyBox isolation pass is claimed. New Blueprint-conversion and fresh-C++ baseline runs remain outstanding.

Recommend retaining creation/dependency tools, diagnostic value and verified process supervision; replacing single-root identity/setup, simplifying state/selection, and investigating explicit metadata ownership before delegating managed builds to native tasks. Detailed per-command and per-service decisions are in [OWNERSHIP_MATRIX.md](OWNERSHIP_MATRIX.md); the compact next-phase recommendation is in [DECISIONS.md](DECISIONS.md).

The recoverable baseline is documented in [BASELINE.md](BASELINE.md). All raw evidence and test artifacts are under the authorized scratch root. [VALIDATION.md](VALIDATION.md) distinguishes current observations, failed attempts and historical claims. [PLAN_STATUS.md](PLAN_STATUS.md) is the authoritative migration status; [RESUME.md](RESUME.md) gives the exact next step.
