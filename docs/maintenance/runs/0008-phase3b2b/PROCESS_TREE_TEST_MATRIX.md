# Process-tree test matrix

| Scenario | Evidence and result |
| --- | --- |
| Root exits, child remains | Real compiled fixture exits its root, child waits at a file barrier; proof absent and claim Running; overlapping claim rejected. |
| Child finishes | Barrier released, job count reaches zero, proof accepted, claim removed; subsequent success/failure/retry complete. |
| Cancellation | Private job request repeated; cancelled proof and zero members required, then retry succeeds. |
| Corrupt or mismatched proof | Eight identity/result mutations and corrupt JSON refused; restored valid proof releases. |
| Legacy root close | No full-tree proof; release refused, Unknown retained. |
| Explicit child breakaway | Real CREATE_BREAKAWAY_FROM_JOB denied inside the private job; escaped-child sentinel absent. |
| Worker crash | Exact fixture worker handle is opened and identity checked before forced termination; contained root absent, completion absent, recovery Unknown. |
| Cancel while launch pending | Controlled promise regression retains service gate until supervisor attaches and proves completion. |
| Real host reload | Surviving fixture child blocks next host; real UBT completes across another host reload and is safely released. |
| Two windows | Same injected store/descriptor excludes overlap; different descriptor runs; original descriptor retries after release. |
| Independent Editor | Actual separately spawned project Editor remains alive after test job cancellation; only that test-spawned Editor handle is subsequently closed. |

Six native tests pass both standalone and in the final suite. Host, cross-window and Editor scenarios have separate archived JSON evidence. No universal crash-injection, distributed executor, different-user coordination, fresh VSIX installation or new debugger attachment qualification is claimed.
