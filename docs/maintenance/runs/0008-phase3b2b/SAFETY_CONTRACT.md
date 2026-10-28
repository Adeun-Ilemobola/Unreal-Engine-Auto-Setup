# Safety contract

- A root exit, missing PID, timeout, accepted cancellation, reload or closed terminal does not prove tree completion.
- Only matching durable native proof of root exit and job active count zero releases a spawned claim.
- Never adopt or terminate a recovered process by PID, name, project string or parent chain. Cancellation uses the running worker's private job handle.
- Existing Editors remain outside managed jobs. Only explicitly spawned fixture handles are used for test cleanup.
- Unknown legacy/corrupt/missing-helper/supervisor-loss claims remain blocked. There is no age-based expiry, forced unlock or recovered cancellation command.
- Same-store canonical-project exclusion is the coordination boundary. External jobs, different stores/users and shared-engine activity are not coordinated.
- Trusted local process creation is the containment boundary. Known distributed executors are disabled; arbitrary broker/service/WMI work is not claimed contained.
- The metadata protocol is not a security boundary against malicious same-user filesystem mutation. Regular bounded files and identity checks reject accidental corruption and mismatches.
- The existing entry scan is bounded at 256; concurrent distinct-project admissions do not have an atomic global quota. Retained uncertain evidence may require administrative review. Do not delete it merely to free quota.
- Test scratch is `C:\Dev\Scratch\UnrealAutoSetupTests`; child-only environment, unique per-run directories and targeted cleanup apply. Successful host runs are removed only after completion barriers and a bounded absence check. Failed/uncertain runs remain for review.
- P1.1 preservation remains explicitly failed. No regeneration restore behavior or test assertion was weakened.

No global TEMP/TMP change, antivirus change, installed engine-source modification, unrelated graphical application access or Phase 3B.3 work is part of this change.
