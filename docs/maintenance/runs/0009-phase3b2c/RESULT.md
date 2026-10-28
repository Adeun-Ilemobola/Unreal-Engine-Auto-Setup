# Phase 3B.2c — Complete within the requested qualification scope

Starting state: clean `main` at `cf3dad3592b9873b8c366ca8ed98b613256c90b3`. Final changes are uncommitted. The native supervisor design, source and distribution binary are unchanged.

Fresh VSIX 0.8.0 installed in an isolated scratch profile, activated and used its installed native helper. Two managed Builds and public Build-and-Run succeeded with full-tree completion and Clear claims. UE 5.8.4 Editor PID 79060 launched for the disposable project; clean Run reused it and Build correctly refused while it was open. The test's automatic close timed out, so the verified Editor window was closed through the computer-use skill; the same installed profile then independently verified Stopped and completed another Build. No personal extension installation changed.

Atomic admission now serializes only capacity inspection and claim creation. Boundary concurrency admits at most one of eight contenders into a store with 255 existing entries. Interrupted admission locks and partial claims stay blocked and retain evidence. Same-project exclusion, different-project concurrency, verified release and retry pass, including two real VS Code hosts sharing one store.

The current code also passes the established real host reload and actual UBT recovery scenarios. Six measured synthetic lifecycles had stable 265 active worker handles, roughly 30.1 MB working sets, zero retained journal entries after release and no surviving worker. Warm startup measurements were roughly 241–334 ms; the first was 1037 ms under concurrent suite load. These are bounded observations, not an exhaustive performance certification.

Validation: **449 Node tests, 448 pass, one unchanged P1.1 failure**; **four Python tests pass**; packaging preflight **50 inputs / 41 modules / three mirrors**. Syntax/interface/native-integrity checks pass. Exact evidence and command results are in [VALIDATION.md](VALIDATION.md).

Reports: [changes](CHANGES.md), [fresh VSIX](VSIX_QUALIFICATION.md), [Build-and-Run](BUILD_AND_RUN_INTEGRATION.md), [admission concurrency](ADMISSION_CONCURRENCY.md), [resource baseline](RESOURCE_BASELINE.md). The exact request is archived at [0009-phase3b2c-v1.md](../../prompts/0009-phase3b2c-v1.md).

Known limits: interrupted admission locks deliberately require verified manual recovery; all cooperating writers must use the updated protocol. Independent stores/profiles/users, external builds and distributed brokers are not coordinated. Failed preliminary run directories are retained. UI-assisted Editor shutdown was required. P1.1 automatic regeneration preservation remains unresolved and prevents claiming a completely green extension suite or unrestricted release readiness.

The process-lifecycle qualification prerequisites for Phase 3B.3 are satisfied within the tested local Windows scope. Phase 3B.3 was **not started**; it remains a separate user task. No commit, publication, version bump, engine-source change, RPGX change, antivirus modification or system-wide TEMP/TMP change was performed.
