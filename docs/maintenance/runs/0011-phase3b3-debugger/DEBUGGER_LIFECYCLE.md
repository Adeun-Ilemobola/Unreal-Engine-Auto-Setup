# Debugger Lifecycle Matrix & Contract

## Lifecycle Sequence

```text
[ Unreal Editor: Running (PID X) ]
             |
             v  unrealSetup.attachDebugger
[ Verify Trust, C/C++ Extension & Editor State ]
             |
             v  vscode.debug.startDebugging (cppvsdbg, attach, PID X)
[ Debug Session: Active ]
             |
             |-- Attempt duplicate attach -> Rejected (Already attached)
             |
             v  vscode.debug.stopDebugging(session) / detach
[ Debug Session: Cleared ]
             |
             v  Editor Process Alive & Verified Running
[ Unreal Editor: Running (PID X) ]
             |
             v  unrealSetup.attachDebugger (Second Attach)
[ Debug Session: Active ]
             |
             v  vscode.debug.stopDebugging(session) / detach
[ Debug Session: Cleared ]
             |
             v  Editor Still Running
```

## Contracts & Invariants Verified
1. **Target Architecture & Adapter**: `type: cppvsdbg`, `request: attach`, `processId: String(pid)`.
2. **Duplicate Attach Safety**: Attempting to attach to an Editor PID that is already the target of an active session is rejected before invoking VS Code debug APIs.
3. **Process Independence**: Unreal Editor is never a descendant of the debug session or build process; detaching does not kill or corrupt the Editor process.
4. **Clean Session State**: Detaching clears `vscode.debug.activeDebugSession` and triggers `onDidTerminateDebugSession`, restoring the UI/sidebar to the detached state.
5. **Reattachment Capability**: Re-attaching to the same Editor PID succeeds with a completely clean new session.
6. **Scoped Process Cleanup**: Only the test-spawned Editor PID is terminated at the conclusion of testing.
