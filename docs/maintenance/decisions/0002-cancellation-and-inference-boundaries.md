# 0002 — Cancellation ownership and conservative inference

Status: implemented within one service lifetime; reload safety remains open. Date: 2026-10-27. See [execution result](../runs/0001-phase1-2026-10-27/RESULT.md).

Cancellation acknowledgement has a deadline; actual process completion does not acquire a fictional deadline. A successful taskkill request means Accepted, not Exited. Failed or Unconfirmed acknowledgement reports a blocked state, retaining operation completion and the coordinator gate. A later child close confirms exit, completes cleanup and allows recovery. This avoids generation restoration or a new build racing a process still writing. A single service owns the current terminal; per-operation listeners and emitters are disposed after completion. History remains in the existing bounded state model.

Rejected: resolving operation completion/releasing its gate on timeout; suppressing termination errors; repeated taskkill on every cancel; keeping all completed terminals in extension subscriptions. No unrelated process or Editor session is a termination target.

VS Code does not await asynchronous subscription disposal, and a new host does not inherit this in-memory gate. A persistent quarantine/ownership mechanism with safe PID identity validation and explicit recovery has not been implemented or validated. Writing a PID marker alone would be insufficient because PID reuse and stale ownership need resolution. P1.2 therefore remains Partially complete. Reload must not be presented as safe recovery from uncertain termination.

Target inference is bounded lexical recognition, not arbitrary C# execution. Unsupported interpolation/control flow, multiple assignments/classes/constructors and helper-only assignments yield Unknown. Conventional single constructor assignments and existing simple fixtures are recognized. This intentionally trades automatic classification of complex files for conservative behavior; users can still build an Unknown target through UBT, while Build and Open Editor requires a known Editor target.

Workspace guards protect subsequent mutations after observed identity changes. Already submitted native writes cannot be cancelled transactionally. Stale setup reports a retry instruction; no new setup scheduling architecture was introduced. All reproduced barrier cases are covered, while real VS Code host switching/reload remains an integration validation item.
