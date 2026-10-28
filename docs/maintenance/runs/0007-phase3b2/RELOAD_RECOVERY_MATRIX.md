# Reload and recovery matrix

| Boundary | Result/evidence |
|---|---|
| Before claim | No process may launch |
| Claim directory created; intent absent/partial | Unknown, blocked (test) |
| Intent before spawn; host lost | Unknown, blocked (test) |
| Same owner knows spawn never attempted | Release allowed (test) |
| Spawn intent persisted; process metadata absent | Unknown, blocked |
| Full PID/creation/executable/command match | Observed active only; blocked, no termination (test and real before reload) |
| Wrong/missing identity field, inaccessible query, exited/reused PID | Unknown, blocked (test) |
| Actual reload | Host changed; Unknown; real Build and UI blocked (integration) |
| Cancellation/old age/root close | No full-tree proof; claim retained (test); same-host cancellation tests unchanged |
| Lost close / surviving descendant | Quarantine retained; actual descendant escape not experimentally tested |
| Corrupt/unsupported/missing intent inside claim | Unknown, blocked (test) |
| Workspace switch | Canonical descriptor lookup; unrelated descriptor clear (test) |
| Simultaneous same-project windows/store | Exclusive mkdir, one winner (eight contenders test); two actual windows not tested |
| Repeated unspawned work | Twenty-five claims released without retained history (test) |
| Normal spawned work ends | Root result recorded, claim retained; ordinary retry acceptance unmet |
| Editor/external builds | Not adopted or recovered/killed; actual live Editor survival unverified |

No stale timestamp transitions to Clear. Multiple unfinished projects are independent; shared engine generation is not serialized. Missing entire storage history cannot be reconstructed; deletion/loss of the registry is outside this accidental-host-reload contract.
