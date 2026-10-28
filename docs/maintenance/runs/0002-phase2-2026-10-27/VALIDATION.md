# Phase 2 validation — 2026-10-27

Repository root: `C:\Dev\VSCodeTools\unreal-auto-setup`. Node test commands ran in its `unreal-auto-setup` directory; other commands ran at root. PowerShell profiles disabled. No packaging/publish/reinstall command executed. [Full final Node output](node-suite.txt).

## Test commands and observed results

| Exact command | Result |
| --- | --- |
| `npm test` (baseline) | 358 tests: 357 passed, 0 ordinary failures/cancelled/skipped, 1 TODO; exit 0 |
| `node --test tests/automation.test.js tests/ux.test.js tests/dependencyUI.test.js tests/workflow.test.js tests/workspace-safety.test.js` | 119/119 passed after formatting, after extraction, and after final runtime readability/contracts changes; exit 0 each |
| `node --test tests/policy.test.js` (initial containment regression) | 2 tests: 1 passed, 1 failed; immediate parent incorrectly accepted; exit 1 |
| `node --test tests/policy.test.js` (after containment fix, before encoding fix) | 4 tests: 3 passed, 1 failed; Doctor separator mojibake; exit 1 |
| `node --test tests/policy.test.js tests/core.test.js tests/detection-regressions.test.js tests/diagnostics.test.js tests/classWizard.test.js tests/dependencies.test.js tests/structure.test.js` | 143/143 passed; exit 0 |
| `node --test tests/maintenance.test.js` | Final 1/1 passed; exit 0. Earlier attempts failed because the fixture lacked createOutputChannel and omitted the existing internal Quick Fix command from its expected inventory; fixture corrected, production unchanged. |
| `python -B -m unittest discover -s tests -p 'test_*.py' -v` | Final 4/4 passed outside sandbox; exit 0. First sandboxed attempt had 8 setup/cleanup errors across 4 tests due to WinError 5 in temporary fixture directories; no assertion result established there. |
| `npm test` (final; runs `node --test tests/*.test.js`) | **363 tests: 362 passed, 0 ordinary failures, 0 cancelled, 0 skipped, 1 TODO; exit 0** |
| `python -B bundle_sources.py` | Passed: **43 inputs, 37 runtime modules, 3 document mirrors**; exit 0; read-only |

The full Node suite gained five passing tests over the Phase 1 baseline. The one TODO is the unchanged P1.1 regression: it executes and fails the desired assertion that a newer descriptor edit survives regeneration. Node excludes it from the ordinary failure count. This is unresolved data-loss evidence, not a passing preservation test. P1.1 remains Blocked, P1.2 Partially complete.

Focused suites that need linked-filesystem fixtures and the full Node suite ran outside the sandbox with approval. Policy and mocked activation fixture commands succeeded in the sandbox. The Python permission failure was rerun using the exact command with escalation; production logic was not weakened to accommodate permissions. The initial combined Python command also ran the independent read-only preflight, which passed; its final shell exit code did not erase the test failure recorded above.

## Formatting and syntax

Used the existing VS Code Prettier installation, not a downloaded dependency. Final formatting command (exit 0; each file's parsed syntax tree unchanged by formatting):

```powershell
node tools/format-js.cjs 'C:\Users\Owner\.vscode\extensions\esbenp.prettier-vscode-12.4.0\node_modules\prettier' unreal-auto-setup/runtimeCoordinator.js unreal-auto-setup/runtimeWatcher.js unreal-auto-setup/runner.js unreal-auto-setup/runtimeView.js unreal-auto-setup/runtimeCommands.js unreal-auto-setup/sidebar.js unreal-auto-setup/dependencyActions.js unreal-auto-setup/extension.js unreal-auto-setup/runtime.js unreal-auto-setup/core.js unreal-auto-setup/contracts.js unreal-auto-setup/enginePolicy.js unreal-auto-setup/paths.js tools/format-js.cjs unreal-auto-setup/tests/maintenance.test.js unreal-auto-setup/tests/policy.test.js
```

Earlier invocations formatted only the affected subset. The first attempt stopped before writing runner because quote normalization changed the AST key representation. `.prettierrc.json` gained `quoteProps: preserve`; rerun passed. AST checks compare formatting input/output, not pre-refactor versus post-refactor behavior; extractions and policy corrections require the separate tests/diff review.

JavaScript syntax command, **71 files passed**, exit 0:

```powershell
$phaseFiles = @(Get-ChildItem unreal-auto-setup -Recurse -Filter *.js) + @(Get-ChildItem tools -Filter *.cjs); foreach ($phaseFile in $phaseFiles) { node --check $phaseFile.FullName; if ($LASTEXITCODE -ne 0) { throw $phaseFile.FullName } }; Write-Output ('Syntax passed: ' + $phaseFiles.Count + ' JavaScript/CommonJS files')
```

Python syntax command, **3 files passed**, without importing/executing build_bundle:

```powershell
@'
import ast
from pathlib import Path
for filename in ('build_bundle.py', 'bundle_sources.py', 'tests/test_bundle_sources.py'):
    ast.parse(Path(filename).read_text(encoding='utf-8'), filename=filename)
print('Python syntax passed: 3 files; no packaging script executed')
'@ | python -B -
```

## Compatibility and preserved evidence

Manifest inventory command:

```powershell
node -e "const p=require('./unreal-auto-setup/package.json'); console.log(p.publisher+'.'+p.name+' '+p.version); console.log(p.contributes.commands.length+' public commands, '+Object.keys(p.contributes.configuration.properties).length+' settings'); console.log(Object.keys(p.contributes.configuration.properties).join('\n'));"
```

Returned `local-tools.unreal-project-tools 0.8.0`, **35 public commands**, and these **5 settings**: unrealSetup.autoSetup, unrealSetup.runtimeRefreshInterval, unrealSetup.automationMode, unrealSetup.autoBuildDelay, unrealSetup.verboseRuntimeLogging. package.json hash is identical to the Phase 2 baseline, so command IDs, setting schemas/defaults, activation declarations and dependencies are unchanged. The new activation regression registers all 35 plus the existing internal applyDependency command with real service composition and mocked VS Code APIs.

Export compatibility check (exit 0: original names retained in all **32 original modules**). HEAD contains the original source; Phase 1's additive validateDescriptor export is also retained in current source.

```powershell
@'
const fs = require('node:fs'), cp = require('node:child_process');
const prettier = require('C:/Users/Owner/.vscode/extensions/esbenp.prettier-vscode-12.4.0/node_modules/prettier');
async function exportsOf(text) {
  const { ast } = await prettier.__debug.parse(text, { parser: 'babel' });
  const assignment = ast.program.body.find(n => n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression' && n.expression.left.type === 'MemberExpression' && n.expression.left.object.name === 'module' && n.expression.left.property.name === 'exports');
  if (!assignment || assignment.expression.right.type !== 'ObjectExpression') throw new Error('Unsupported export shape');
  return assignment.expression.right.properties.map(p => p.key.name || p.key.value);
}
(async () => {
  let checked = 0;
  for (const file of fs.readdirSync('unreal-auto-setup').filter(f => f.endsWith('.js'))) {
    const relative = 'unreal-auto-setup/' + file;
    const prior = cp.spawnSync('git', ['show', 'HEAD:' + relative], { encoding: 'utf8' });
    if (prior.status !== 0) continue;
    const before = await exportsOf(prior.stdout), after = await exportsOf(fs.readFileSync(relative, 'utf8'));
    for (const name of before) if (!after.includes(name)) throw new Error(relative + ' removed export ' + name);
    checked++;
  }
  console.log('Existing export names retained in ' + checked + ' original modules');
})().catch(error => { console.error(error); process.exitCode = 1; });
'@ | node
```

Hash/prompt preservation command (exit 0: **47 protected baseline files verified**, prompt byte-identical):

```powershell
$phaseInitial = Get-Content docs/maintenance/runs/0002-phase2-2026-10-27/initial-hashes.json -Raw | ConvertFrom-Json; $phasePreserved = 0; foreach ($phaseEntry in $phaseInitial.PSObject.Properties) { if ($phaseEntry.Name.StartsWith('docs\') -or $phaseEntry.Name.Contains('\tests\') -or $phaseEntry.Name -eq 'unreal-auto-setup\package.json') { if ((Get-FileHash -LiteralPath $phaseEntry.Name -Algorithm SHA256).Hash.ToLowerInvariant() -ne $phaseEntry.Value) { throw ('Changed preserved file: ' + $phaseEntry.Name) }; $phasePreserved++ } }; if ((Get-FileHash -LiteralPath docs/maintenance/prompts/0002-phase2-maintainability-v1.md).Hash -ne (Get-FileHash -LiteralPath 'C:\Users\Owner\.codex\attachments\9a7b5b09-de68-4606-a13a-3cdb9a468cf0\Pasted text.txt').Hash) { throw 'Prompt mismatch' }; Write-Output ('Preserved baseline files verified: ' + $phasePreserved + '; Phase 2 prompt byte-identical')
```

Reviewed `git status --short`, `git diff --stat`, `git diff --numstat`, per-file diffs, extracted blocks and compatibility boundaries. `git diff --check` passes. Initial/final branch is main and HEAD is `dc91401b7e9eed159de80cc96713e58dfdd0a3e1`; no commits. [Initial status](initial-status.txt), [final status](final-status.txt), [initial hashes](initial-hashes.json) and [19 existing files changed in this phase](phase2-changed-files.txt) preserve the distinction from inherited Phase 1 work. Maintenance/developer Markdown links were checked for existing local targets. Historical Phase 1/audit bytes preserved.

Final link check passed **45 local links**, and the read-only packaging preflight was repeated after completing documentation with the same 43-input/37-module/3-mirror result. Branch/HEAD and whitespace checks remained unchanged.

## Integration limits

Three full-suite tests exercise real disposable PowerShell execution: owned-tree cancellation, managed output/error exit code, and quoting/launch gating. Filesystem tests use disposable temp fixtures. All VS Code UI/activation/workspace interleavings are mocked. No live extension-host reload, native UI, debugger attachment, real UBT build/generation, Editor session or companion integration run. Existing historical UE 5.8.1 evidence remains historical.

No installed extension was replaced, no archive was rebuilt/overwritten, and no Unreal project was modified or migrated. Unit/formatting/preflight checks do not certify Unreal compatibility. P1.1 preservation and P1.2 reload ownership remain explicit limitations; no Phase 3 task was started.
