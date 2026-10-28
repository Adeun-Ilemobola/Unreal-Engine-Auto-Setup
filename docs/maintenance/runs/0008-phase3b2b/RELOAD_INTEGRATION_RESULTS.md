# Real integration results

Environment: installed UE 5.8.4, VS Code 1.143.1, development host Node v24.21.0, Win64 Development `Phase3AIntegrationEditor`. Only the explicitly owned disposable project was used.

Final run `integration-jAiaCo`, 2026-10-28 07:08:48–07:09:32 UTC, uses final helper SHA-256 `9fe009a9132cb40c8f8dbba6b9078520995087862951ff51e2920ef2528d1de7`. See [host-events.jsonl](host-events.jsonl).

1. Hosts 53076: two public managed builds succeeded and each claim became Clear. End-to-end command times were 4.690 s and 3.945 s.
2. A fixture root exited while its child waited. Completion proof was absent at reload. New host 36340 recognized the supervisor as Running; a public build was blocked. Recovery observation took 1.215 s, including CIM identity query.
3. Releasing the fixture barrier produced verified zero-process completion; reconciliation released the claim. Another public build succeeded in 3.839 s.
4. An exclusively created owned source file induced real compiler failure exit 6. The driver removed its exact unchanged test file in finally. Retry succeeded, Clear, in 6.923 s.
5. Another actual public UBT build was active with no completion proof at reload. Host 75176 read matching durable exit-0/zero-process proof, released it and successfully built again in 6.476 s. Final store entries: empty.
6. The launcher confirmed no process referenced that run directory and removed it; [integration-final.txt](integration-final.txt) records cleanup.

The earlier direct-child supervisor experiment lost its worker on reload and correctly retained uncertainty. The independent bootstrap design resolved that reproduced failure. Earlier failed journals were retained rather than manually declared complete.

Two actual development windows separately exercised same-store exclusion, other-project independence and post-completion retry; the store was deliberately shared through dependency injection. This does not demonstrate automatic coordination of arbitrary independent VS Code profiles. See [cross-window.jsonl](cross-window.jsonl).

[editor-safety.json](editor-safety.json) records actual Editor PID 41556, exact project command line, completed private-job cancellation, and Editor survival. Cleanup targeted the Node handle from this test's own Editor spawn. This proves independence from cancellation, not a fresh full public Build-and-Run or debugger qualification.

Times above include command refresh/UBT work and are not isolated supervision overhead. Native polling is 50 ms; no comparative CPU/memory/handle benchmark was performed. The final Node suite took 13.047 s. Output/Problems behavior is covered by existing service tests; the real compile failure result is archived, but a separate real Problems-panel assertion was not added.
