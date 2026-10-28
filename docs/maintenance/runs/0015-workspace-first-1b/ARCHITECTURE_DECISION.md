# Phase 1B architecture decision — provisional pending native proof

Date: 2026-10-28 UTC. Scope: architectural selection and scratch proof only. WF-P1B is **Blocked**, not accepted: Microsoft VS Code refused the required isolated host launch because its update mutex remained held. The ten prototype contract checks are not a substitute for native acceptance. No Phase 2 production implementation is authorized or included.

## Foundation and carried limitations

This decision builds on Phase 1A's [OWNERSHIP_MATRIX](../0014-workspace-first-1a/OWNERSHIP_MATRIX.md), [DECISIONS](../0014-workspace-first-1a/DECISIONS.md), [BASELINE](../0014-workspace-first-1a/BASELINE.md) and [RESUME](../0014-workspace-first-1a/RESUME.md). Those reports remain unchanged. The user's new Phase 1B instruction authorizes progressing with their documented gaps; it does not retroactively complete native class, IntelliSense, SkyBox or fresh Blueprint/C++ fixture validation.

Current source remains 1.0.0 Alpha on main, HEAD `1d13b3a7e8e3da41af9f7270b097c239641aaf9a`. A newly present root master-plan copy is byte-identical to docs/architecture/workspace-first/MASTER_PLAN.md and was preserved. Architecture copy remains the referenced specification. Current runtime/test source matches the Phase 1A snapshot. P1.1 remains OPEN.

## Alternatives and decision

Scores below are qualitative design judgments, 1 least suitable to 5 most suitable for the stated goal, not measured performance or passed tests. For risk/cost columns, higher means safer/lower maintenance. C's higher metadata scores are conditional on later validation; no weighted total hides that uncertainty.

| Strategy | Usability | Independence from generator | IntelliSense path | Data-loss avoidance | Maintenance | Refreshability | Reproducibility |
|---|---:|---:|---:|---:|---:|---:|---:|
| A: minimal workspace only | 3 | 5 | 1 | 5 | 5 | 1 | 4 |
| B: native generated workspace only | 3 | 1 | 4 | 2 | 4 | 3 | 3 |
| C: minimal bootstrap + explicit authoritative metadata | 4 | 5 for bootstrap | 3 conditional | 4 conditional | 3 | 4 conditional | 4 conditional |

**Select C provisionally.** Opening a project/engine workspace must not depend on IDE generation. Build/UHT remain Unreal-owned; native VS Code owns workspace/task/debug presentation. Metadata is a separate explicit capability, not a side effect of setup or Build-and-Run. Existing native-generated workspaces remain readable/importable, without rewriting their settings or absorbing their generated task matrix. This is a responsibility decision, not a mandated directory reorganization.

A is a useful first bootstrap but incomplete as an ordinary C++ workflow. B has an established metadata path, yet it retains generator/user-file collisions and potential engine-root writes confirmed in installed UE source. C allows initial navigation and managed builds while metadata can be absent or stale honestly. If separate authoritative metadata cannot be refreshed safely, C remains limited; do not fall back silently to regeneration.

## Identity and lifecycle contract

Maintain distinct ProjectIdentity, EngineIdentity, WorkspaceIdentity, MetadataStatus, BuildStatus and IntelliSenseStatus. A valid workspace does not imply a build, generated reflection files or usable IntelliSense.

- Enumerate local workspace roots at depth one for project descriptors; identify engine roots by Engine/Build/Build.version and validated tool paths, not root names or index zero. Do not recurse through the whole engine on activation.
- Canonicalize paths for identity and containment; retain display paths/names for UI. Numeric association must match engine major/minor. GUID/custom associations need explicit engine selection and persistent canonical mapping; never interpret a GUID as a version or choose the first engine.
- Resolve resource commands through getWorkspaceFolder(uri), then canonical project containment and module ownership. An engine/unrelated URI must be refused for mutations even if a default project exists. Commands without a resource use a unique project or an explicit selection; ambiguity must show a picker/error rather than guessing.
- Multiple descriptors in one root require a descriptor choice. Multiple project roots require a URI or explicit current project. Operations are always per canonical project. Missing/ambiguous engines allow read-only diagnosis but block build/metadata actions. Unexpected unrelated roots are ignored for discovery and never writable targets. Nonlocal/virtual roots are unsupported initially with an actionable message.
- Root reordering/renaming must not change identity; moved projects invalidate stored absolute paths/metadata fingerprints. Reject missing saved selections and prompt again. Aliases must be canonicalized/deduplicated before acquisition; write paths require existing safety checks. Nested engine/project roots and ambiguous ownership are refused initially.
- A first-root change may restart the host. Reconstruct services/selection from descriptors and durable state; do not depend on receiving a workspace change event first. Dispose old listeners, pending UI and watchers; preserve operation claims across reload. No engine-root filesystem watcher for source automation.

The scratch probe proves only the bounded resolver cases in COMPATIBILITY_MATRIX.md with a mocked command registry. Custom associations, alias/link handling, actual lifecycle and full selection UI are specified, not implemented or certified.

## Task and debugger strategy

Keep the existing managed Build.bat execution, canonical admission claims, Windows Job Object supervision, parser and cancellation proof as the execution core. Default verified target path to investigate is Editor / Win64 / Development; target rules remain UBT's authority.

For later Phase 3A, select a thin native TaskProvider/CustomExecution adapter that routes into this same coordinator and supervisor rather than creating a second process runner. This exposes native task UX while retaining containment. Task close/cancel must request the owned job cancellation and keep the project blocked until verified full-tree completion; a terminal closing or root PID exit is not sufficient. Concurrent commands and tasks must share one admission boundary. Preserve existing build commands as adapters. Do not introduce 24 generated tasks when a small set of verified choices suffices.

Shell/ProcessExecution directly invoking UBT is the simpler alternative, but native full-tree cancellation/reload equivalence has not been proved. It therefore cannot yet replace the supervisor. Existing generated/SkyBox tasks remain externally owned and can bypass our admission; display that limitation instead of claiming we control them. No deletion or silent disabling of user tasks. Preventing interference across unrelated providers still requires testing and explicit policy.

Use VS Code debugging with Microsoft cppvsdbg; retain project PID identity, duplicate-attach prevention and scoped detach. Reuse a generated launch only after validating program, target and preLaunchTask resolution. The captured Generate Project Files launch has an unresolved captured preLaunchTask and must not be copied blindly. No debugger adapter rewrite.

## Metadata and UHT lifecycle

1. Minimal bootstrap creates no compiler arguments. A regular Editor-target build executes UBT's build graph and runs UHT when necessary, producing reflection headers/build outputs. It does not establish that a VS Code compile database was refreshed. Missing generated.h, missing engine include configuration and a compiler failure are separate findings.
2. For a pre-generated project, read existing compile databases/response files and inspect exact source-entry coverage, engine/toolchain/target identity and referenced paths. Preserve existing provider selection. Mark stale or missing inputs explicitly; do not rewrite generated arguments by hand.
3. For refresh, investigate authoritative UE 5.8 metadata exports independently of VS Code project-file generation. Installed QueryMode supports OutputPath/LogDirectory and target compile settings; GenerateClangDatabase supports OutputDir/OutputFilename. Those are source-confirmed mode-specific options, not safe-output guarantees or flags to pass to the VS Code generator.
4. Write any future extension-owned metadata into a dedicated immutable operation/fingerprint directory under project-owned generated storage or extension storage. Record engine/version, descriptor/target/configuration, source inventory, toolchain, invocation and response dependencies. Publish a pointer only after validation and explicit scoped configuration choice. Missing or incompatible data never becomes “ready.” Relocation requires revalidation, not blind path substitution.
5. Cpptools provider selection and compileCommands have precedence rules. Choose one documented integration path per project; do not silently replace an existing provider. A supported provider adapter over authoritative query results is a candidate if raw database export is inadequate; it is not committed as a second build system or a new language server. SkyBox remains optional and separately tested.

### New source evidence and limits

Installed `UE_5.8/Engine/Source/Programs/UnrealBuildTool/Modes/QueryMode.cs`: lines 95–99 expose LogDirectory/OutputPath; 131–151 choose a default log location and add a writer; 188–197 write results; 402–418 create a makefile/save caches and describe the compile-environment gathering path; 462–500 export include paths, defines, compiler, arguments, standards, directory/module and launch data. This is more than a pure read operation. Its compile-info gathering comment is not proof that all helpers avoid UHT/cache writes.

`Modes/GenerateClangDatabase.cs`: lines 48–55 expose output filename/directory (default Unreal.RootDirectory), line 85 enables generated-code include paths, lines 98–100 use a dedicated intermediate environment, and lines 174–175 choose output location. Code generation is enabled by default (lines 39–43). A relocated final database does not confine other outputs.

`Configuration/UEBuildTarget.cs:3032` invokes ExecuteHeaderToolIfNecessary in the build path. This supports separating reflected generated files from IDE metadata; it is not a new successful build observation. No UBT, UHT or Editor executable was run in Phase 1B. Full metadata correctness and no-engine-write behavior remain gated on controlled tracing.

## Ownership / write policy

| Artifact | Authoritative owner | Planned extension boundary |
|---|---|---|
| New minimal .code-workspace | User-facing workspace, created on explicit bootstrap | Write-new with actual named roots; no generator takeover. Recognize existing workspace read-only before proposing scoped edits. |
| Existing workspace/settings/tasks/launch JSONC | User, VS Code and identified generator/provider | No wholesale text replacement. Explicit targeted settings changes via native APIs only; conflicting ownership blocks migration. |
| Class/module/plugin source and descriptors | User authoring; extension assists | Retain validation, exclusive creation, module boundaries and editor-aware edits. No engine destination. |
| Build graph/generated headers/intermediates | UBT/UHT | Invoke validated project build; do not synthesize headers or equate compile success with metadata freshness. |
| Generated compile database / response files | UBT/exporting provider | Read/import as versioned metadata; do not restore old copies or silently overwrite manual data. |
| Installed engine, including .vscode | Installed engine owner | Read-only integration surface. Any command with possible engine output is blocked pending verified containment; visible root is not write consent. |
| Durable process/recovery evidence | Extension | Preserve identity/hash/proof semantics and bounded recovery; no stale-claim theft. |

For existing mixed-owner files, the migration choice must be explicit. Never restore a saved snapshot over later edits, even on failure/cancel. No automatic legacy -projectfiles -vscode invocation during setup, source creation, ordinary build or run in the proposed design. Current Alpha still has these behaviors; this phase does not remove them. P1.1's existing failing test stays unchanged until stronger real preservation evidence supports a future resolution.

## Exit criteria

WF-P1B requires the real two-root host proof, command resolution in both root orders, confirmed no engine changes, this ownership/task decision, and explicit metadata gaps. The real-host criterion is currently unsatisfied. Phase 2 remains no-go until that proof passes and this decision is accepted; passing the scratch contract harness is insufficient.
