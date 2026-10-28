'use strict';

/**
 * Documentation-only service contracts. Consumers use import() in JSDoc, so this
 * module does not participate in runtime initialization or own any resources.
 * Optional services are installed in order by activation/runner, not by a container.
 *
 * @typedef {Object} ProjectContext
 * @property {string} root Absolute workspace root; one local folder only.
 * @property {string} filename Absolute selected .uproject identity.
 * @property {string} name Descriptor basename.
 * @property {Object} folder VS Code workspace folder.
 * @property {Object} config Resource-scoped VS Code configuration.
 * @property {Object} descriptor Validated object; Modules/Plugins, if present, are named entry arrays.
 * @property {Array<{name:string, file:string, type:string}>} targets Conservative inferred types, including Unknown.
 * @property {function():void} [assertCurrent] Setup-only epoch/identity guard; throws on stale work.
 *
 * @typedef {Object} BuildSelection
 * @property {string} target
 * @property {string} platform Win64.
 * @property {string} configuration
 *
 * @typedef {Object} DirtyChange
 * @property {string} file Absolute local filename.
 * @property {'Implementation'|'Header'|'Structure'} kind
 * @property {number} revision Monotonic within the selected project epoch.
 * @property {boolean} [regenerated] Covered structure is retained until build completion.
 *
 * @typedef {Object} CancellationOutcome
 * @property {'Not requested'|'Requested'|'Accepted'|'Exited'|'Failed'|'Unconfirmed'} state
 * @property {string} [reason]
 * @property {number} [pid] Extension-owned child only; not an Editor session.
 *
 * @typedef {Object} OperationResult
 * @property {boolean} success
 * @property {string} status Running/Succeeded/Failed/Cancelled/Blocked/Conflict/RecoveryFailed, or workflow Opened/Reused.
 * @property {string} [reason]
 * @property {number|null} [exitCode]
 * @property {string} [target]
 * @property {string} [platform]
 * @property {string} [configuration]
 * @property {string} [startTime]
 * @property {string} [completionTime]
 * @property {boolean} [regenerationFailed]
 * @property {CancellationOutcome} [cancellation]
 * @property {Object} [execution] Generator result independent from preservation.
 * @property {Object} [preservation] Unchanged/Conflict/RecoveryFailed; recoveryLocation and operationId identify immutable copies. No protected-path writes.
 *
 * @typedef {Object} OperationHooks
 * @property {boolean} [automatic]
 * @property {string} [project] Selected descriptor captured by the coordinator.
 * @property {DirtyChange[]} [changes] Snapshot of changes covered by this operation.
 * @property {string} [mode] Normalized automation mode.
 * @property {function(string):void} [stage] Current-epoch progress only; does not release ownership.
 * @property {function():void} [generated] Marks covered structure as regenerated in the same epoch.
 *
 * @typedef {Object} ProjectSession
 * @property {number} revision Metadata revision, independent of the source dirty tracker.
 * @property {boolean} stale Cleared only by successful generation covering this revision.
 * @property {OperationResult} [lastBuild]
 * @property {OperationResult} [lastGeneration]
 * @property {Object} [automation] Coordinator snapshot for UI/Doctor reporting.
 * @property {number} [launchRequested] Duplicate-launch suppression timestamp.
 *
 * @typedef {Object} RuntimeSnapshot
 * @property {ProjectContext} [project] Missing when inactive or collection failed.
 * @property {BuildSelection} [selected]
 * @property {ProjectSession} [session]
 * @property {Object} [editor] Process state is Stopped/Running/Unknown, with matches and optional error.
 * @property {Object} [engine] Detected files/version-policy result, not certification.
 * @property {Object[]} [modules]
 * @property {Object[]} [plugins]
 * @property {Object[]} [folders]
 * @property {Object} [module] Recent/default local module.
 * @property {Object} [automation] Attached by runtimeView before sidebar projection.
 * @property {Object} [dependencies] Dependency model/index snapshot for UI.
 * @property {string} [error]
 *
 * @typedef {Object} Services
 * @property {ReturnType<typeof import('./runtime').createState>} state Per-descriptor metadata/session owner.
 * @property {ReturnType<typeof import('./processes').createService>} processes Editor discovery/cache; does not launch/terminate Editors.
 * @property {ReturnType<typeof import('./runtimeCoordinator').create>} [coordinator] Debounce, revisions and in-host operation gate.
 * @property {ReturnType<typeof import('./build').createService>} [builds] Child process, current terminal and build diagnostics owner.
 * @property {ReturnType<typeof import('./runtimeWatcher').create>} [watcher] Serialized filesystem reconciliation and scoped watchers.
 * @property {ReturnType<typeof import('./dependencyActions').create>} [dependencies] Parser models, previews, index and dependency UI.
 * @property {function():Promise<void>} [refresh] Installed before watcher creation; safe before it exists.
 * @property {function(string):void} [runtimeLog]
 * @property {boolean} [poll] Test hook; false disables polling, not explicit refresh.
 */
module.exports = {};
