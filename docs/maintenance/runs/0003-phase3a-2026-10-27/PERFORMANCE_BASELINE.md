# Performance baseline — observed, not optimized

Environment and scope are in [RESULT.md](RESULT.md) and [inventory](environment-inventory.json). All timings use Node performance.now in the real extension host unless explicitly labeled UBT/launcher time. No continuous engine benchmark, cache change, watcher rewrite or activation policy change was made. [Raw timing observations](timings.json), [host events](host-events.jsonl), [size](project-size.json).

## Reproducible low-impact samples

The interactive local driver wraps current project.readProject, modules.discover/plugins and dirtyTracker.files with performance.now, then times the active extension's public refresh function. These are real filesystem/process calls inside a real VS Code host; they are not native UI end-to-end latency or mocked unit timings. Each measurement request runs one sample per operation, serially. Counts refer to the fixture at that stage.

| Operation | Initial one-module fixture | Completed fixture sample | Final fixture sample | Meaning/limits |
| --- | ---: | ---: | ---: | --- |
| Project discovery | 1.338 ms | 1.435 ms | 2.018 ms | One selected local .uproject, two conventional targets. |
| Module discovery | 1.118 ms / 1 module | 5.842 ms / 3 modules | 3.488 ms / 3 modules | Primary, ProbeRuntime, ProbePlugin after creation. |
| Plugin discovery | 0.051 ms / 0 plugins | 0.528 ms / 1 plugin | 0.541 ms / 1 plugin | Local fixture only. |
| Saved-file disk reconciliation | 0.914 ms / 6 tracked files | 4.045 ms / 21 files | 9.415 ms / 21 files | Calls dirtyTracker.files; native save-event-to-publication latency not separately instrumented. |
| Runtime refresh | 579.919 ms | 573.421 ms | 902.981 ms | Includes fresh Editor process discovery and dependency/view reconciliation; no claim that filesystem work alone costs this much. |

A separate real activation wait measured **3468.986 ms**, with `alreadyActive=false`, in the interactive Development Host at 18:21:41–18:21:45 UTC. This includes extension activation/initial refresh, in a host where companion startup also occurs. It is one observation, not a distribution or whole VS Code launch measurement. The earlier **0.034 ms** post-trust wait was on an already activated extension and is invalid as cold-activation evidence; retained in raw records, excluded from the baseline claim.

`unrealSetup.refreshDependencyIndex` was explicitly invoked **once** for engine indexing: **5474.250 ms** for combined project refresh plus engine module/header scan/index construction, reaching Ready with **69,946 combined project/engine headers**. The fixture has seven local headers. Engine-only elapsed time was not instrumented independently; no subtraction-based engine-only timing claim. Later host restart discarded this in-memory index by design; it was not repeatedly rebuilt for benchmarking. Normal local dependency sync occurred during creation/refresh. No profiler was attached and no extension-host blocking duration was isolated.

## Build/launch observations

| Operation | Wall/driver time | Tool-reported time |
| --- | ---: | ---: |
| Initial template Development Editor build | 39.091 s launcher | 38.67 s UBT; 7 actions |
| Ordinary extension regeneration | 6.564 s | Exit 0, preservation step included in driver time |
| All generated code/module/plugin build | 40.485 s driver | 39.28 s UBT; 20 actions |
| Controlled compile failure | 2.386 s driver | Failed/6; expected C1189 |
| First repair build | 2.865 s driver | Succeeded/0 |
| Diagnostic recheck failure | 2.925 s driver | Failed/6; real Problems entry verified |
| Diagnostic repair build | 2.987 s driver | Succeeded/0 |
| Stable build before clean reuse | 36.429 s driver | Succeeded/0; 18 actions after intervening companion target work |
| First/second Editor launch request | 1.997 s / 1.063 s driver | Measures request/launch guard, not Editor readiness |
| Clean Run reuse | 1.146 s driver | Reused, no new build/launch |
| Basic debugger attach request | 2.385 s driver | cppvsdbg session verified afterward; not symbol-load/stepping benchmark |

Compiler/SDK selection, full UBT output and process ledgers are retained in the validation evidence. Warm incremental builds and a later larger rebuild are separate observations; no unsupported causal explanation or universal speed claim.

## Size/count and resource caveats

At 18:39:29 UTC: **563 files, 222 directories, 2,959,975,806 bytes (~2.96 GB decimal)** in the whole ignored fixture, including binaries, PCH/intermediates, Editor asset registry/cache and private VS Code profile. The Source/plugin non-generated subset had **20 files / 4577 bytes** at that measurement. Final generated-source evidence includes 23 files when two configs and the plugin descriptor are included. Count methods differ intentionally and are recorded in [size JSON](project-size.json) and [source manifest](generated-source-checks.json).

The native Editor displayed a **Memory Pressure Warning** on a host with approximately 16 GB physical RAM, while browser/VS Code/Editor/tooling were running. This limits timing comparisons and is not evidence of an extension leak. No other user app was terminated. Engine directory counts and complete RPG asset size were not rescanned merely to populate a table. The engine index's own header count is used instead.

There are three comparable discovery/reconciliation samples, plus one additional post-restart driver-ready sample in the raw timing file. Runtime watchers also performed normal refreshes during creation/build/diagnostics; their total scan count was not instrumented. No p95, asymptotic/scalability, CPU-blocking or representative RPG workload conclusion follows from these samples. Phase 3B measurement work should use a defined larger disposable workload and native event/host profiling before considering optimizations.
