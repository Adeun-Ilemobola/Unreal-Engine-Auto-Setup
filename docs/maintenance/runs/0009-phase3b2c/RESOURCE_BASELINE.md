# Focused resource baseline

Six native supervised PowerShell operations each slept 1800 ms, with bounded startup barriers, one live process sample, durable completion, release and supervisor-absence verification. Measurements are emitted as `Lifecycle measurements` in [node-final.txt](node-final.txt). This is a small local sample during the full concurrent suite, not an isolated benchmark or an engine stress test.

| Measurement | Observed range |
| --- | --- |
| Claim acquisition | 3.95–141.76 ms (first operation warm-up/contention; subsequent 3.95–5.85 ms) |
| Acquisition to supervisor-started receipt | 240.95–1037.41 ms |
| Total to completion, including 1800 ms workload and observation | 2942.53–4515.21 ms |
| Verified release | 5.88–30.78 ms (first includes injected interrupted-release check) |
| Worker handles while active | 265 in all six samples |
| Worker working set | 30,126,080–30,277,632 bytes |
| Worker private bytes | 20,762,624–20,877,312 bytes |
| Worker accumulated CPU at sample | 93.75–281.25 ms |

Every worker was independently observed absent after completion; every released store was empty. Test-owned completion listeners were disposed. Existing build-service tests cover listener/gate behavior and repeated operations. One initial measurement harness incorrectly expected its own unused error listener to self-remove after success; the harness now explicitly removes that listener, and the final test passes.

The prior phase measured end-to-end real build commands around 3.8–6.9 s and active-recovery observation around 1.2 s. Those are different workloads and do not support a claimed percentage performance improvement. Current bounded polling and native resource behavior show no monotonic accumulation in this sample; longer-term load or power-loss behavior is not certified.

Crash boundaries: existing tests cover pre-spawn intent retention, corrupt/missing completion and worker loss; new tests cover interrupted admission and release. The real reload rerun checks active worker recovery and worker completion while its host is absent. No timeout substitutes for full-tree proof.
