# Testing, tooling and validation record

Executed 2026-10-27 on Windows. Initial and post-validation working tree were clean. No dependency installation, upgrades, manifest/lockfile changes, production edits, real Unreal builds, Editor launches or package rebuilds were performed. Tests created and cleaned disposable temporary fixtures; no production project was used. The sandboxed attempt may have left temporary fixture remnants where cleanup was denied; no broad cleanup was attempted.

## Existing infrastructure

`unreal-auto-setup/package.json:284–286` has one script: `test: node --test tests/*.test.js`. There is no compilation step: production JS is loaded directly. No lint/type-check/format scripts, coverage thresholds, CI workflow, checked-in extension-host runner configuration or npm dependencies are present. A missing lockfile is appropriate while there are no npm dependencies; it is not currently a reproducibility defect.

| Tests under `unreal-auto-setup/tests/` | Scope |
| --- | --- |
| `core.test.js`, `workflow.test.js` | Merge defaults, minimum version, exclusive create, setup idempotency/settings preservation, trust and companion installation with mocks |
| `project.test.js`, `engine.test.js`, `modules.test.js` | Descriptor/target/selection behavior, discovery, engine policy and module layouts |
| `runner.test.js`, `build.test.js`, `problemParser.test.js` | Build argument/quoting behavior, orchestration, managed subprocess output/results, Problems; one real PowerShell child fixture |
| `processes.test.js`, `debugger.test.js` | Command-line association, Unknown states/cache, PID selection and mocked debugger launch |
| `generation.test.js`, `diagnostics.test.js` | Configuration restore, dirty/link refusal, metadata revisions, Doctor and log selection |
| `classTemplates.test.js`, `classFiles.test.js`, `classWizard.test.js` | Template output, names/exposure, file transactions/collisions/rollback, wizard cancellation/navigation |
| `structure.test.js`, `structureWizard.test.js` | Module/plugin templates, descriptor preservation, transactional failures, wizard input/confirmation |
| `dependencies.test.js`, `dependencyUI.test.js` | Restricted C# parsing, edit plans, graph/header ownership, minimal WorkspaceEdit and Quick Fix/preview behavior |
| `ux.test.js`, `automation.test.js` | Native view models, watcher scheduler, context menus, modes/debounce, revision snapshots, failure suppression, operation gate/cancellation |

Fixture helpers are `helpers.js` and `classHelpers.js`. Most UI interactions use injected fake VS Code objects, not a running extension host. The suite is substantial; a passing total does not establish native UI lifecycle, all event-order interleavings or real UBT compatibility.

## Commands and results

Commands below ran from `C:\Dev\VSCodeTools\unreal-auto-setup` unless a different working directory is stated. PowerShell was run without loading the profile after initial discovery, because the user's profile emitted an unrelated oh-my-posh executable access error. That did not indicate an extension defect.

| Exact command | Result / side effects |
| --- | --- |
| `git status --porcelain=v1` | Empty before audit; no pre-existing edits to preserve |
| `node --version` | v24.19.0 |
| `npm --version` | 11.17.0 |
| `python --version` | Python 3.14.7 |
| `npm test` in `…\unreal-auto-setup\unreal-auto-setup` | First, sandboxed: exit 1, EPERM failures included fixture rename and symlink operations. Output was truncated, so no exact failure total is asserted |
| `npm test` in the same directory, approved outside sandbox | Exit 0: **301 tests, 301 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo**, reported test duration 2728.7397 ms. Temporary fixtures and short PowerShell test children only |
| `Get-ChildItem unreal-auto-setup -Recurse -Filter *.js \| ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { throw "Syntax failure: $($_.FullName)" } }` | Passed for all production/test JS; no output files |
| `git diff --check` | Passed before documentation creation; repeated at final documentation review |

The approved rerun resolves the initial environment failure; it does not fix or change source. No `npm install`, `npx`, bundler or dependency audit service was run.

### Disposable behavioral probe: F01, F04, F05

The following exact PowerShell/Node command ran successfully. It creates one unique temp directory, invokes existing source helpers, and removes that directory in finally. It writes no repository file and launches no Unreal tool.

```powershell
@'
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'unreal-audit-'));
 try {
  const gen=require('./unreal-auto-setup/generation'),engine=require('./unreal-auto-setup/engine');
  const file=path.join(root,'Game.uproject');await fs.writeFile(file,'{"before":true}');
  const saved=await gen.snapshot({root,filename:file},{workspace:{textDocuments:[]}});
  await fs.writeFile(file,'{"userEditDuringGeneration":true}');await gen.restore(saved);
  console.log('restore after concurrent edit:',await fs.readFile(file,'utf8'));
  await fs.mkdir(path.join(root,'Engine','Build'),{recursive:true});await fs.writeFile(path.join(root,'Engine','Build','Build.version'),'{"MajorVersion":5,"MinorVersion":8}');
  const project={descriptor:{EngineAssociation:'5.8'},config:{get:()=>undefined}};
  const result=await engine.resolve(project,{discover:async()=>[root],requireBuild:false,requireEditor:false});
  console.log('discovered version-only engine:',result);
  project.config.get=()=>root;
  console.log('configured version-only engine:',(await engine.resolve(project,{requireBuild:false,requireEditor:false})).compatible);
  const rules=path.join(root,'Source');await fs.mkdir(rules);await fs.writeFile(path.join(rules,'GameEditor.Target.cs'),'public class GameEditorTarget { string Note = "Type = TargetType.Editor"; }');
  console.log('target type from a string:',(await require('./unreal-auto-setup/project').discoverTargets(root))[0].type);
 }finally{await fs.rm(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
'@ | node
```

Observed:

```text
restore after concurrent edit: {"before":true}
discovered version-only engine: undefined
configured version-only engine: true
target type from a string: Editor
```

### Mocked lifecycle probe: F02 and F03

Exact command; no actual processes or files were created. The no-op terminator models a cancellation request that fails to produce process exit. It proves the pending-promise path, not an observed Windows taskkill failure.

```powershell
@'
const {fakeVSCode,child}=require('./unreal-auto-setup/tests/helpers');
const build=require('./unreal-auto-setup/build'),state=require('./unreal-auto-setup/runtime').createState();
(async()=>{
 const f=fakeVSCode('C:\\Audit');let current;
 const service=build.createService(f.vscode,f.context,state,{spawnProcess:()=>current=child(),stopProcess:()=>{}});
 const spec=build.specification('C:\\UE','C:\\Audit\\Game.uproject',{target:'GameEditor',platform:'Win64',configuration:'Development'});
 const before=f.context.subscriptions.length;
 for(let i=0;i<10;i++){const op=service.run(spec);current.emit('close',0);await op.done;}
 console.log('subscriptions added by ten completed builds:',f.context.subscriptions.length-before);
 const op=service.run(spec);let settled=false;op.done.then(()=>settled=true);op.cancel();await new Promise(r=>setTimeout(r,25));
 console.log('cancel settled without child close:',settled);current.emit('close',null);await op.done;
})();
'@ | node
```

Output: `subscriptions added by ten completed builds: 30`; `cancel settled without child close: false`.

### Read-only artifact/document integrity check

Exact command; existing installer read only. It does not test installation or execute the packaged extension.

```powershell
@'
import pathlib,zipfile,json,xml.etree.ElementTree as ET
root=pathlib.Path.cwd(); source=root/'unreal-auto-setup'
with zipfile.ZipFile(root/'unreal-project-tools-0.8.0.vsix') as z:
 assert z.testzip() is None
 ET.fromstring(z.read('extension.vsixmanifest'));ET.fromstring(z.read('[Content_Types].xml'))
 mismatches=[str(f.relative_to(source)) for f in source.rglob('*') if f.is_file() and 'tests' not in f.parts and ('extension/'+f.relative_to(source).as_posix() not in z.namelist() or z.read('extension/'+f.relative_to(source).as_posix())!=f.read_bytes())]
 print('VSIX integrity/XML passed; source mismatches:',mismatches)
for n in ['README.md','CAPABILITIES.md','VALIDATION.md']:
 print(n,'root/extension identical:',(root/n).read_bytes()==(source/n).read_bytes())
print('production JS:',len(list(source.glob('*.js'))),'test files:',len(list((source/'tests').glob('*.test.js'))))
'@ | python -
```

Passed: no source mismatches; all three document pairs identical; 32 production JS modules and 21 test files. Historical installers/bundles were inventoried, not individually validated.

### Static local-import and manifest inventory

Exact command:

```powershell
@'
const fs=require('node:fs'),path=require('node:path');const root='unreal-auto-setup';const files=fs.readdirSync(root).filter(f=>f.endsWith('.js'));const graph=new Map(files.map(f=>[f,[...fs.readFileSync(path.join(root,f),'utf8').matchAll(/require\(['"]\.\/([^'"]+)['"]\)/g)].map(m=>m[1]+'.js')]));const visited=new Set(),stack=[];let cycles=0;function walk(n){if(stack.includes(n)){console.log('cycle',stack.slice(stack.indexOf(n)).concat(n).join(' -> '));cycles++;return;}if(visited.has(n))return;stack.push(n);for(const next of graph.get(n)||[])walk(next);stack.pop();visited.add(n);}files.forEach(walk);console.log('Static local require cycles:',cycles);const p=require('./unreal-auto-setup/package.json');console.log('commands:',p.contributes.commands.length,'settings:',Object.keys(p.contributes.configuration.properties).length);
'@ | node
```

Output: zero static local require cycles, 35 contributed commands, five contributed settings. This detects literal local requires, not runtime callback cycles or arbitrary dynamic imports.

## Tests deliberately not run

* `python build_bundle.py`: overwrites the current version VSIX and distribution ZIP (`build_bundle.py:13,24`); unnecessary for audit-only validation.
* `node tests/real-unreal-validation.js <engine>`: writes a disposable Unreal project and invokes real UBT/cache/toolchain operations; no engine/toolchain validation run was authorized as part of this documentation-only audit. Source review also found it records nonzero UBT codes but does not make them fail the overall process (`:34–41`); future automation must assert each stage.
* `tests/vscode-smoke.js`, `vscode-dependency-smoke.js`, `vscode-automation-smoke.js`: export `run` for a real Extension Development Host, not standalone Node tests. They require prepared fixtures/companions and write workspace files. Dependency smoke leaves SmokeInclude.h; automation smoke changes settings, compiles, launches Editor and closes the owned PID. These are unsuitable for an arbitrary user project. The first two lack the explicit disposable-root assertion used by automation smoke.
* Real Debug/DebugGame/Shipping/Test or alternative host-type compilation, real cancellation failure, reload during build, Windows host-memory profiling and UE patch-version matrix: not executed.

Historical live results in VALIDATION.md/RELEASE-0.8.0.md are separately identified in [03](03-unreal-integration.md). They were not relabeled as current measurements.

## Coverage priorities and modern practice

Add regression coverage first for concurrent saved edits during generation, failed process termination, completed-operation disposal, capability-specific discovery and literal-aware targets. Then test setup/workspace switching and stale collector side effects using controlled async barriers. Native host tests should cover actual event sequences, terminal disposal/reload, dirty/Undo behavior and Restricted Mode; mocks alone cannot establish these contracts.

Official VS Code tooling supports reproducible extension-host runs through `@vscode/test-cli`/`@vscode/test-electron`, with separate trusted/untrusted configurations. Evaluate adoption in a later approved tooling change; none was installed here. [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension).

The handwritten packager currently works and current bytes match; replacing it is optional. At minimum add a read-only completeness/metadata check and controlled source bundle contents. If Marketplace publishing becomes a goal, evaluate the official `vsce package` workflow rather than growing a homemade publishing system. [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

## Final documentation verification

These read-only commands passed: nine expected documents, valid local Markdown links, paired code fences, no trailing whitespace, and no nonexistent/out-of-range explicit source references. `git status --short` reported only `?? docs/`; `git diff --stat` was empty (no tracked-source modifications). Reference validation checks existence/line bounds, not the semantic correctness of a citation; that was reviewed separately.

```powershell
@'
from pathlib import Path
import re
root=Path.cwd(); folder=root/'docs'/'audit'
expected={'00-repository-inventory.md','01-current-architecture.md','02-code-quality.md','03-unreal-integration.md','04-reliability-security.md','05-testing-and-tooling.md','06-proposed-architecture.md','07-improvement-roadmap.md','AUDIT_SUMMARY.md'}
assert {p.name for p in folder.iterdir()}==expected
for p in sorted(folder.glob('*.md')):
 text=p.read_text(encoding='utf-8')
 assert text.count('```')%2==0,p
 assert not any(line.rstrip()!=line for line in text.splitlines()),p
 for target in re.findall(r'\]\(([^)]+)\)',text):
  if '://' not in target: assert (p.parent/target.split('#')[0]).exists(),(p,target)
 print(p.name,len(text.split()),'words')
print('Nine documents; local links, code fences and whitespace passed')
'@ | python -
git diff --check
git status --short
git diff --stat
```

```powershell
@'
from pathlib import Path
import re
root=Path.cwd(); issues=[]
for doc in (root/'docs/audit').glob('*.md'):
 for name,start,end in re.findall(r'([\w./-]+\.(?:js|json|py|md)):(\d+)(?:[–-](\d+))?',doc.read_text(encoding='utf-8')):
  candidates=[root/name,root/'unreal-auto-setup'/name]
  file=next((p for p in candidates if p.is_file()),None)
  if file is None or max(int(start),int(end or start))>len(file.read_text(encoding='utf-8').splitlines()):issues.append((doc.name,name,start,end))
print('Source-reference issues:',issues)
assert not issues
'@ | python -
```
