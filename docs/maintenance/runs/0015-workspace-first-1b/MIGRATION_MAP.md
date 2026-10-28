# Public behavior migration map

Derived from Phase 1A OWNERSHIP_MATRIX.md and the unchanged current manifest. This is a planned mapping, not an implementation or removal. All 35 public command IDs remain represented. Runtime behavior is unchanged today.

| Command | Decision | Intended behavior | Later implementing phase |
|---|---|---|---|
| `unrealSetup.setup` | Replace implementation, retain ID | Create/open minimal named workspace; import existing configuration without generation | 2A |
| `unrealSetup.build` | Retain adapters | Shared project identity/admission; UBT build and Editor lifecycle, no implicit IDE regeneration | 2A / 3A |
| `unrealSetup.buildAndRun` | Retain adapters | Shared project identity/admission; UBT build and Editor lifecycle, no implicit IDE regeneration | 2A / 3A |
| `unrealSetup.installExtensions` | Retain explicit command; remove automatic dependency | Offer optional companion selection; core setup works independently of SkyBox | 2B / 4B |
| `unrealSetup.openEditor` | Retain adapters | Shared project identity/admission; UBT build and Editor lifecycle, no implicit IDE regeneration | 2A / 3A |
| `unrealSetup.selectTarget` | Retain, simplify | One project-scoped selection; Unreal owns validity; avoid duplicate provider selection | 2A / 3A |
| `unrealSetup.selectPlatform` | Retain, simplify | One project-scoped selection; Unreal owns validity; avoid duplicate provider selection | 2A / 3A |
| `unrealSetup.selectConfiguration` | Retain, simplify | One project-scoped selection; Unreal owns validity; avoid duplicate provider selection | 2A / 3A |
| `unrealSetup.selectBuild` | Retain, simplify | One project-scoped selection; Unreal owns validity; avoid duplicate provider selection | 2A / 3A |
| `unrealSetup.diagnose` | Retain, extend | Separate project/engine/workspace/build/metadata/provider status | 2A / 3B |
| `unrealSetup.openLatestLog` | Retain | Open selected project logs through native editor | 2A |
| `unrealSetup.attachDebugger` | Retain native adapter | cppvsdbg with matching-project PID safety and scoped detach | 3A |
| `unrealSetup.regenerate` | Retain ID with explicit migration behavior | Show metadata ownership/unsafe legacy warning; execute only proven bounded refresh, no hidden -vscode fallback | 3B / 4A |
| `unrealSetup.newClass` | Retain, correct lifecycle | Resolve resource owner; preserve templates and exclusive file writes; release UI admission reliably | 2B |
| `unrealSetup.openModuleRules` | Retain | Navigate chosen project/module with native editor APIs | 2A / 2B |
| `unrealSetup.openProjectDescriptor` | Retain | Navigate chosen project/module with native editor APIs | 2A / 2B |
| `unrealSetup.openTargetRules` | Retain | Navigate chosen project/module with native editor APIs | 2A / 2B |
| `unrealSetup.newModule` | Retain | Project-owned scaffolding/descriptor edits; mark metadata stale without hidden generator | 2B / 3B |
| `unrealSetup.newPlugin` | Retain | Project-owned scaffolding/descriptor edits; mark metadata stale without hidden generator | 2B / 3B |
| `unrealSetup.openPluginDescriptor` | Retain | Navigate chosen project/module with native editor APIs | 2A / 2B |
| `unrealSetup.run` | Retain adapters | Shared project identity/admission; UBT build and Editor lifecycle, no implicit IDE regeneration | 2A / 3A |
| `unrealSetup.refresh` | Retain, simplify | Reconcile selected identities/state without build or generation | 2A |
| `unrealSetup.createClassHere` | Retain, correct lifecycle | Resolve resource owner; preserve templates and exclusive file writes; release UI admission reliably | 2B |
| `unrealSetup.inspectDependencies` | Retain | Keep bounded advice, explicit indexing and WorkspaceEdit; no engine rule edits | 2A / 4B |
| `unrealSetup.addDependency` | Retain | Keep bounded advice, explicit indexing and WorkspaceEdit; no engine rule edits | 2A / 4B |
| `unrealSetup.removeDependency` | Retain | Keep bounded advice, explicit indexing and WorkspaceEdit; no engine rule edits | 2A / 4B |
| `unrealSetup.changeDependencyVisibility` | Retain | Keep bounded advice, explicit indexing and WorkspaceEdit; no engine rule edits | 2A / 4B |
| `unrealSetup.findModuleForInclude` | Retain | Keep bounded advice, explicit indexing and WorkspaceEdit; no engine rule edits | 2A / 4B |
| `unrealSetup.refreshDependencyIndex` | Retain | Keep bounded advice, explicit indexing and WorkspaceEdit; no engine rule edits | 2A / 4B |
| `unrealSetup.manageDependencies` | Retain | Keep bounded advice, explicit indexing and WorkspaceEdit; no engine rule edits | 2A / 4B |
| `unrealSetup.automationMode` | Retain compatibility, narrow policy | Watch/off default; scoped state; autoBuildAndRegenerate requires migration notice and disabled unsafe path | 3B / 4A |
| `unrealSetup.autoBuildDelay` | Retain compatibility, narrow policy | Watch/off default; scoped state; autoBuildAndRegenerate requires migration notice and disabled unsafe path | 3B / 4A |
| `unrealSetup.runtimeInterval` | Retain compatibility, narrow policy | Watch/off default; scoped state; autoBuildAndRegenerate requires migration notice and disabled unsafe path | 3B / 4A |
| `unrealSetup.cancelPendingAutomaticBuild` | Retain safety | Cancel only owned work; wait for verified job tree completion; keep uncertain claims | 3A |
| `unrealSetup.cancelBuild` | Retain safety | Cancel only owned work; wait for verified job tree completion; keep uncertain claims | 3A |

## Settings, services and compatibility

| Existing surface | Planned treatment |
|---|---|
| Stable ID local-tools.unreal-project-tools | Retain; no renaming or forced reinstall |
| unrealSetup.autoSetup | Retain key; limit automatic behavior to detection/offering bootstrap, not installing companions or generating metadata |
| unrealSetup.automationMode | Retain key/watch default; preserve saved values but surface legacy unsafe regeneration mode for explicit migration |
| unrealSetup.autoBuildDelay / runtimeRefreshInterval / verboseRuntimeLogging | Retain keys and documented ranges; scope runtime to selected canonical project |
| unrealEngine.enginePath / defaultProject | Read legacy values as migration hints; validate against descriptor/roots; do not keep writing optional companion-owned settings as core state |
| .clang-format and formatting/exclusion defaults | Keep existing files/settings; stop imposing unrelated editor preferences during new bootstrap |
| Native snippets/templates/class/module/plugin generation | Keep; port context/lifetime contracts without speculative rewrite |
| Dependency parsing/index/diagnostics/WorkspaceEdit | Keep; UBT remains authority for arbitrary C# semantics; engine index explicit and read-only |
| Runtime sidebar/status/Doctor | Keep useful native UI; simplify duplicate state and report separate readiness |
| Windows supervisor, operation claims, cancellation, Live Coding awareness | Keep safety contracts and binary/source verification; adapter reuse, no rewrite |
| Generation recovery | Keep diagnostic/conflict evidence and no-replay rule; retire competing writer paths only after stronger Phase 4A proof |
| Generated workspace/task/launch data | Recognize/import read-only; never replace user edits or copy entire task matrix blindly |
| SkyBox task/provider/commands | Optional external ownership; no silent auto-install/activation; coexistence validation still required |
| Packaging, test tools and CI | Keep strict failure semantics and scratch policy; version naming cleanup only in a separately authorized implementation/release phase |

No command removal is selected for Phase 1B. Conditional removal targets are duplicated implementations and side effects, not established IDs: mandatory companion installation during setup, generator-owned JSON rewriting, duplicate configuration state and implicit IDE regeneration. Add aliases/deprecation guidance if a later phase changes semantics; do not silently reinterpret a command as an unrelated operation.
