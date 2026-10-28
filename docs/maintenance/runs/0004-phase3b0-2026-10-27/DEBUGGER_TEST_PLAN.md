# 3B.3 — Debugger Detach and Reattach Validation

Status: **test specification ready; live lifecycle remains unverified**. This preparation run did not launch a host, debugger or Editor. Implementation and execution belong to a later authorized 3B.3 session.

## Objective and evidence

Prove two attach/disconnect cycles against the **same test-owned Editor process**, with that process surviving both disconnects, followed by an ordinary owned Editor exit.

Phase 3A proved basic `cppvsdbg` attachment. Its first Editor PID 12320 was absent after the harness called `vscode.debug.stopDebugging()`; that does not establish why the Editor exited. A separate Editor PID 77056 subsequently exited through native Alt+F4. Neither observation proves clean detach/reattach. Current `debugger.js` and its four unit tests cover attachment selection/guards, not this lifecycle. The harness `tools/phase3a/host-tests.cjs` exposes generic `stopDebug`, not an explicit tested detach operation.

Static inspection of installed VS Code 1.143.1's bundled workbench found `workbench.action.debug.disconnect` and a session `disconnect` implementation sending `terminateDebuggee: false`. This is a candidate route, not proof of command routing or C++ adapter behavior. The installed cpptools attach schema does not document a `terminateDebuggee` launch configuration property; do not invent one.

## Required future test-infrastructure changes

- Add bounded, named harness operations for lifecycle observations and explicit disconnect; retain the real VS Code debug service's session cleanup. Do not bypass it using a direct DAP custom request.
- Before live use, verify the installed command's route to disconnect and its behavior with the selected attach session. If unsupported, use the visible native **Disconnect** action after verifying its meaning; do not substitute generic Stop.
- Register a `DebugAdapterTracker` for the owned `cppvsdbg` session and record the outgoing `disconnect` request, including `terminateDebuggee: false`. Record `onDidStartDebugSession` and `onDidTerminateDebugSession`, session ID/type and attach configuration. Dispose observers afterward.
- Guard every action by the expected active session ID and test-owned PID. Record exact request IDs, timestamps and serializable observations. Keep the existing harness fixes for request/result serialization; do not expose arbitrary command execution as a new test API.
- Unit-test observer timeout, unrelated sessions, missing/true disconnect flag, PID replacement and unexpected exit with injected events. These establish harness behavior only.

No production debugger change is required merely to attempt the test. A discovered defect needs a scoped follow-up decision before changing behavior.

## Preconditions and exact future workflow

Use only the retained ignored `.local-test-projects/Phase3AIntegration/` fixture and its ownership marker. Use the isolated trusted test host and installed C++ extension; no installation/update. Check the existing Editor binary and project association read-only. If rebuilding or regeneration is required, stop this test and obtain a separately scoped execution decision. No unrelated active debug session may be targeted.

1. Launch this disposable project's Editor and record launcher/Editor PID, creation time, executable, command line and project association. Establish the actual Editor identity independently of the launcher. If creation time/association cannot be read, stop.
2. Invoke the existing `unrealSetup.attachDebugger` workflow in the real host, selecting that exact Editor if prompted.
3. Within 30 seconds, observe a new active `cppvsdbg` session with attach request and expected process ID. Record start event and session ID; a successful helper return alone is insufficient.
4. Disconnect **that session** using the verified explicit disconnect route. Record outgoing DAP arguments; reject any request permitting debuggee termination. Do not use `vscode.debug.stopDebugging()` as evidence of a detach guarantee.
5. Independently query the Editor identity immediately after disconnect and during a bounded five-second observation period. Require the same PID **and creation time**, executable and project association to remain alive; PID alone is insufficient.
6. Within 30 seconds, observe termination of that debug session, no remaining matching session and cleaned active-session state. A debug-session termination event does not imply process exit; retain both independent observations.
7. Reattach through the same extension workflow to the same still-running Editor identity. Require a new session ID, correct attach configuration and active event within 30 seconds.
8. Disconnect again using the same verified route. Repeat the outgoing `terminateDebuggee: false`, session cleanup and same-Editor survival checks.
9. Close only that Editor's identified native window with ordinary Alt+F4. Resolve an ordinary project save prompt only within this disposable fixture. Do not automate PIE, Live Coding or an unrelated window.
10. Wait up to 60 seconds for the recorded Editor identity to exit and verify test-owned launcher/Editor/debug adapter descendants where ownership is provable. Report cleanup complete only when the owned set is accounted for. Unknown processes remain unknown and must not be killed.

Deadlines are test bounds, not guaranteed product timings. Capture UI prompts or extension-host delays separately from adapter failure. If a stable process handle is available, retain it; otherwise document the limits of repeated OS identity queries.

## Assumptions, acceptance and stop conditions

Unresolved: explicit command routing, adapter support for nonterminating disconnect, tracker visibility, event ordering, and survival of the same Editor across both cycles. These require the future real-host test; source tests cannot settle them. Interactive process selection and modal UI may prevent unattended automation.

Acceptance requires all ten steps, two observed nonterminating disconnect requests, two independently verified Editor survival checks, two clean session removals, successful same-process reattachment and final owned-process cleanup. Archive host events, redacted adapter arguments, OS identity observations, commands and timing. Report each partial result instead of collapsing it to Passed.

Stop on an unexpected Editor exit, ambiguous ownership, mismatched active session, unavailable explicit disconnect route, termination-capable DAP request, timeout or process identity change. Preserve evidence; do not repeatedly restart the Editor to explore destructive behavior. If ownership is uncertain, do not close/kill it. A failed detach is a failed/blocked lifecycle test even if basic attach still works.

Dependencies: this plan is independent of 3B.1/3B.2 because ordinary Editor/debug-session ownership differs from the managed build wrapper. Allowed in the later task: bounded owned Editor launch, native attach/disconnect, observation and normal close. Prohibited: generic Stop as a substitute for detach proof, real UBT orphaning, RPGX modification, engine migration, unrelated process termination, installs/global changes. All live operations are prohibited in the present preparation run.
