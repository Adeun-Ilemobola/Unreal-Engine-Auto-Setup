# Initial Phase 1B compatibility matrix

Legend: **Contract pass** means the scratch prototype with real filesystem reads and a mocked VS Code command registry. **Blocked** means a real host did not start. **Specified** means a design requirement only. None certify the existing Alpha extension as multi-root capable.

| Scenario | Proposed rule | Current evidence |
|---|---|---|
| Project root first / actual UE5 second | Resolve descriptor and compatible engine independently of index | Contract pass; native project-first launch Blocked by updater |
| Engine first, renamed roots | Identity derives from canonical path/descriptor, not display names | Contract pass; native case prepared, not launched after first failure |
| Relocated project fixture | Resolve fresh descriptor; invalidate old metadata paths | Contract pass for fresh resolution; native case prepared, not launched; persisted relocation migration Specified |
| Project resource URI | Select owning root/project/module | Contract pass; native getWorkspaceFolder proof prepared but not executed |
| Engine URI used for project action | Refuse with project-owned destination message | Contract pass; no write attempted |
| Missing engine root | Diagnosis allowed; execution blocked until engine selection | Contract pass for block; UI recovery Specified |
| Mismatched numeric engine | Reject; do not substitute first installed engine | Contract pass with scratch Build.version 5.7 vs descriptor 5.8 |
| Several .uproject files in one root | Require explicit descriptor selection | Contract pass for ambiguity and explicit Two.uproject selection |
| Several project roots | Require URI or explicit project selection | Contract pass; one project per operation; multi-project build orchestration out of scope |
| Extra unrelated root | Ignore discovery unless it supplies a project; refuse its URI for mutation | Contract pass |
| Remote/virtual root | Initial version rejects unsupported context | Contract pass |
| Missing/invalid descriptor | Actionable diagnostic and no execution | Specified; malformed-schema/path-disappearance cases not tested |
| Duplicate aliases/junctions/case variants | Canonicalize, deduplicate identities, retain write safety checks | Prototype uses realpath/lowercase but duplicate alias behavior not qualified; production contract Specified |
| GUID/source engine association or multiple compatible engines | Explicit validated association; never guess | Specified; prototype numeric-association-only |
| Nested engine/project roots | Reject ambiguous ownership initially | Specified; not qualified |
| Trust denied / root change / host reload | No unsafe work; reconstruct state and preserve operation claims | Specified, no native proof |
| Existing generated hex workspace | Preserve/read owners and scopes; no implicit rewrite | Phase 1A static observation only; not reopened by this proof |
| No cpptools metadata yet | Navigation can be ready; IntelliSense explicitly missing | Scratch projects have no .vscode; native navigation not observed |
| SkyBox absent / present | Optional; detect provider/task ownership and avoid automatic activation | Proof profile is configured with no external extensions, but did not activate; coexistence remains unverified |
| Native task cancellation vs managed Job Object | Keep managed proof until equivalence established | Design decision, not tested this phase |

Environment: Windows; source Alpha 1.0.0; actual installed engine Build.version 5.8.4. Microsoft Code executable launches the 1.143.1 app path but refuses startup while update mutex is held; no active-host version claim. Node contract harness v24.19.0. No cross-platform, alternate engine version or VS Code minimum-version qualification.

The minimal workspaces contain only a folders array. Scratch projects are copies of hex descriptor/Source without IDE metadata, not newly created Blueprint-conversion or conventional C++ baselines. Those outstanding Phase 1A fixture-provenance experiments remain explicitly unverified.
