# Reproduction matrix

Environment observed: Windows host; Node v24.19.0; source/installed extension 1.0.0 Alpha; UE Build.version 5.8.4. Installed directories include cpptools 1.34.4 and 1.35.5 and SkyBox 0.1.2; active profile versions were not inferred from directory presence. VS Code isolated host failed before activation because an update mutex remained held. Historical 1.143.1 host results are not a fresh current-host version measurement.

Evidence root: `C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1a-20261028T172121Z`.

| Scenario | Steps / evidence | Actual result and limit |
|---|---|---|
| First/second Explorer class command | wizard-contract.cjs invokes actual classWizard.register callbacks with fake VS Code UI, actual disposable module filesystem; first call creates files then leaves post-create Promise pending; second same-folder call; settle first notification; third call | Mechanism reproduced: second returns without a picker/error; first remains pending; third succeeds after release. Two names/two picker dispatches. Simulated UI, not native end-user reproduction. |
| Native notification confirmation | wizard-host.cjs uses isolated VS Code host with scripted picker/input/modal answers, actual notification API and command registration alias; runner creates LightweightHost fixture | Blocked before tests: VS Code update in progress. No assertion or UI interaction ran; no “native reproduced” claim. Profile retained at scratch/host-kzaJKz. |
| Root ordering | Controlled readProject calls with project/engine and engine/project folder arrays | Both reject “Open one local Unreal project root folder.” Not a native workspace-opening proof. |
| Existing P1.1 preservation | Run unchanged generation.test.js with stub generator overwriting settings | FAIL, exact original assertion. No change/waiver. |
| Junction safety + class creation suite | Four focused existing files through run-tests.cjs | Sandbox: 28/31 pass, two EPERM junction failures + P1.1. Authorized rerun: 30/31 pass; only P1.1 fails. |
| Existing hex metadata | Read-only archive/disk/database comparison | Both DBs cover current two cpp files. ModObject.cpp is absent from source and both DBs; missing-new-file symptom not reproduced by this static snapshot. |
| UObject/Object.h and generated headers | Plan below; no cpptools host launched | Unverified. Response includes CoreUObject/Public, but active provider/base fallback and generated-header readiness remain unknown. |
| No-SkyBox / SkyBox-only / coexistence | Separate profile design below | Not executed. Static task/provider ownership established; interference is not attributed as the cause of repeated creation. |
| Baselines A/B/C | See REFERENCE_WORKSPACE_FACTS.md | B observed existing capture; A/C defined but not newly created. No real UBT build, target Query or IDE generation executed in this phase. |

## Exact manual reproduction when host launch is available

1. Use a new profile and a disposable copy under the scratch root. Record Code/extension/cpptools versions, active extensions, trust, automation mode (Watch/off), workspace folder order and active C++ configuration. Disable autoSetup in the profile for isolation, because it installs SkyBox.
2. Start with one project root to isolate the wizard independently of the known multi-root rejection. Right-click an existing module Public folder; invoke Create Class Here; choose UObject or Actor Component, unique name FirstProbe, confirm creation. Record command dispatch, picker/input/modal, file writes, refresh completion, editor opening and notification timestamps.
3. Leave the Created notification unanswered, then invoke Create Class Here in the same folder. Expected current mechanism: no second form. Inspect notification center even if the toast has disappeared. Dismiss the prior notification and retry with SecondProbe without restarting VS Code.
4. Repeat in another module folder, via New C++ Class, after cancelling each input stage, after duplicate-name error, and after host reload. Distinguish the shared class-wizard lock from hidden Explorer context, runtime refresh stalls and unregistered commands. Native 10+ repeat validation belongs to the later lifecycle phase; no current pass is asserted.
5. Separately inspect opening the existing two-root reference copy. Current readProject/setup reject it; do not remove one of its roots and claim two-root success.

## IntelliSense reproduction and generator isolation

On a disposable generated baseline, record hashes of workspace, c_cpp_properties, both databases and response files. Record source files, effective C_Cpp configuration/provider, compile entry for the exact new file, include arguments and generated-header paths. Create a reflected type, open its new cpp/header, and capture C/C++ diagnostics/logs for UObject/Object.h and generated.h. Compare before and after a real Editor-target build and separately after an explicitly controlled metadata refresh; never label UBT Query as a build. If a normal build leaves the compile database unchanged, record that separately from UHT/build success. Do not invoke installed-engine generator while the engine-root output hazard is uncontained.

Three distinct scratch profiles: (1) ours + cpptools, SkyBox absent, autoSetup false; (2) SkyBox + cpptools, ours absent; (3) ours + SkyBox + cpptools. Record both installed and activated extension IDs/versions, task resolutions, active configuration provider, queried target and every tool invocation/output path. No personal-profile extension installs/removals. Use separate fixture copies to prevent provider settings or query caches carrying between modes. Current setup's mandatory companion behavior means no-SkyBox setup itself is expected to fail/install; do not bypass that and call it working bootstrap.

## Interpretation

The lock mechanism is actionable source/contract evidence: classWizard.js awaits its final information-message promise inside the active-flag lifetime, and active re-entry returns silently. VS Code documents that message promises resolve on action/dismissal. This is a strong candidate for the reported symptom, not proof that every observed user no-op has this cause. structureWizard.js has an analogous lock/notification pattern. No fix was made in this audit.
