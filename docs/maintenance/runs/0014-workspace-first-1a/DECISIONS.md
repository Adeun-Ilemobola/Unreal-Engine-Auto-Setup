# Phase 1A findings, risks and recommendations

This is an audit recommendation record, not acceptance of a Phase 1B architecture or permission to implement it.

| Finding | Evidence | Risk / recommendation |
|---|---|---|
| F1 — Current model is single-root throughout | project.js:readProject; extension.js:setup; classFiles.validate; creation.validate; dependencyEditor.validate; generation.run; runtimeWatcher.watch | Replace the identity boundary coherently. Removing only setup's folder-count check would leave creation, dependencies and recovery inconsistent. |
| F2 — Repeated creation has a reproducible silent gate mechanism | classWizard.js:register active return; wizard final awaited notification; wizard-contract-result.json | Release mutation/UI admission before optional post-success actions in a later fix; provide busy feedback. Verify with native UI first; also inspect structureWizard's analogous pattern. |
| F3 — Setup imposes optional companion ownership | extension.js requiredExtensions/provider/activate; package extensionPack; installed SkyBox task/provider registration | Investigate an independent workflow. Preserve command compatibility while replacing automatic install/provider selection with explicit choices. |
| F4 — Three build entry paths can diverge | hex workspace shell tasks; project custom SkyBox task; runner/build managed supervisor | Native and companion tasks do not use our operation claims. Task delegation must preserve shared admission and full-tree cancellation, not merely expose a task label. |
| F5 — Metadata readiness is not measured per source file | diagnostics.collect; runtime.stale; classWizard leaves source-only creation non-stale; reference DB contains only two current cpp entries | Add a distinct metadata/IntelliSense model later. Build success and no observed structure change do not mean a new source file has compiler arguments. |
| F6 — Installed generator can write engine configuration | UE VSCodeProjectFileGenerator.cs:301–306 | Generation must not run implicitly under a no-engine-write design. Current read-only recovery snapshot does not contain the external writer. |
| F7 — P1.1 remains a demonstrated failure | generation.test.js:10/21, focused-tests-unsandboxed.log | Preserve assertion; prefer eliminating conflicting writers. No automatic restore of saved copies. |
| F8 — Reference Generate Project Files launch references an absent captured preLaunchTask | hex-facts.json tasks/launch | Inspect actual task resolution before reusing generated debug entries. Generated does not imply runnable in every profile. |
| F9 — Existing safety code has distinct value | processSupervisor.outcome; operationOwnership.inspect/release; native AssignProcessToJobObject/TerminateJobObject | Retain it until native-task equivalent completion/cancel/reload behavior is actually proven. |
| F10 — Tooling/qualification gaps | historical versus current manifest; absent old VSIX; VS Code update mutex | Keep exact current hashes and candid evidence limits; do not assert a green Alpha release. |

## Compact Phase 1B recommendation

Compare three ownership strategies before coding: minimal extension-owned workspace, native-generated-only workspace, and hybrid minimal workspace plus explicitly owned/imported metadata. The hybrid is the leading hypothesis because it separates project/engine navigation from editor metadata generation, but is not selected or proven here. Native-generated-only retains known generator collision/engine-write concerns; provider-based metadata may avoid database rewrites but introduces target-query freshness and maintenance costs.

The next separately authorized phase should prove a minimal project+engine workspace, identify the project independent of root order, define one target/configuration owner, compare native tasks against retained supervision, and select a documented metadata source. Establish separate ProjectIdentity, EngineIdentity, WorkspaceIdentity, MetadataStatus, BuildStatus and IntelliSenseStatus. Specify settings provenance and an engine-write deny boundary including junction/case aliases. Preserve user-facing command IDs through adapters.

Do not start that proof while claiming the remaining host matrix passed. No selected architecture, new workspace kernel, TaskProvider, configuration provider, process rewrite, class fix or automatic regeneration was implemented in Phase 1A. Do not use the report to justify deleting tested safety code.
