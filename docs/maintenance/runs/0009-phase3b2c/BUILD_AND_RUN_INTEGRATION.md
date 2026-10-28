# Build-and-Run integration

Installed VS Code 1.143.1, installed UE 5.8.4, owned ignored project `.local-test-projects/Phase3AIntegration`, association 5.8. The ownership marker and Git exclusion were verified. No regeneration was needed for this workflow.

Final installed run, host PID 75332, 2026-10-28 UTC:

- Two public `unrealSetup.build` operations succeeded, exit 0, target `Phase3AIntegrationEditor`, Win64 Development; both claims Clear, no diagnostics.
- `unrealSetup.buildAndRun` completed its supervised build at 07:31:44.177; its claim was Clear before independent Editor observation.
- Editor PID **79060** started at **07:31:47.669891 UTC**, executable `C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe`, command associated with the exact disposable descriptor and `-log`.
- Clean public `unrealSetup.run` returned **Reused** with the same Editor PID. Public Build returned **Blocked**, requiring Editor closure before external compilation. The Editor remained alive.
- Retained-handle CloseMainWindow did not complete shutdown within 30 seconds. Computer-use inspection confirmed the loaded Phase3AIntegration Editor (not a modal or crash screen); Alt+F4 closed that window. No unrelated Editor was targeted and no forced process-tree termination was used.
- The same installed profile was resumed. Host **84144** independently queried Editor state **Stopped**, then public Build succeeded at **07:36:03.920**, exit 0, claim Clear, diagnostics empty. The profile then closed and its scratch tree passed process-absence cleanup.

Evidence: [installed-host.jsonl](installed-host.jsonl), [resume.txt](resume.txt). Failed preliminary attempts remain labeled errors in the event log. Manual window closure is part of the recorded qualification; the one-shot automated close harness is not claimed fully unattended.

Editor independence during owned-job cancellation is unchanged and covered by the previous phase's actual Editor survival experiment; current tests revalidate native private-job cancellation. This phase did not perform debugger detach/reattach or resolve P1.1.
