// Opt-in disposable fixture; never operates on an existing project. Run with a UE installation path.
'use strict';
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const creation = require('../creation');
const modules = require('../modules');
const templates = require('../moduleTemplates');
const classes = require('../classTemplates');
const classFiles = require('../classFiles');

/**
 * Execute a command with bounded timeout, logging, and explicit status tracking.
 */
const {runStage}=require('./supervisedStage');
async function validate(options = {}) {
  const engine = options.engine || process.argv[2];
  if (!engine) throw new Error('Pass the UE installation directory.');

  const timeoutMs = options.timeoutMs || 300000;
  const base='C:\\Dev\\Scratch\\UnrealAutoSetupTests';await fs.mkdir(base,{recursive:true});
  const root = options.root || await fs.mkdtemp(path.join(base, 'UnrealAutoSetup-v06-'));
  const filename = path.join(root, 'AutoSetupValidation.uproject');
  console.log('Disposable project: ' + root);

  // Validate disposable project root
  const relative=path.relative(base,path.resolve(root));
  if (!path.basename(root).startsWith('UnrealAutoSetup-v06-') || !relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Refusing to run real Unreal validation outside disposable test directory.');
  }
  await classFiles.safeAncestors(root);
  if((await fs.readdir(root)).some(name=>/\.uproject$/i.test(name)||name.toLowerCase()==='source'))throw new Error('Refusing to overwrite an existing project');

  const stages = [];
  const report = {
    root,
    engine,
    classes: classes.registry.map(t => t.label),
    stages,
    success: false
  };

  try {
    await fs.writeFile(filename, JSON.stringify({
      FileVersion: 3,
      EngineAssociation: '5.8',
      Modules: [{ Name: 'AutoSetupValidation', Type: 'Runtime', LoadingPhase: 'Default' }]
    }, null, 2));

    const base = templates.render(path.join(root, 'Source', 'AutoSetupValidation'), 'AutoSetupValidation');
    base.files[2].text = '#include "AutoSetupValidation.h"\n#include "Modules/ModuleManager.h"\nIMPLEMENT_PRIMARY_GAME_MODULE(FDefaultGameModuleImpl, AutoSetupValidation, "AutoSetupValidation");\n';
    for (const f of base.files) {
      await fs.mkdir(path.dirname(f.path), { recursive: true });
      await fs.writeFile(f.path, f.text);
    }

    for (const type of ['Editor', 'Game']) {
      const target = 'AutoSetupValidation' + (type === 'Editor' ? 'Editor' : '');
      await fs.writeFile(
        path.join(root, 'Source', target + '.Target.cs'),
        'using UnrealBuildTool;\npublic class ' + target + 'Target : TargetRules { public ' + target + 'Target(TargetInfo Target) : base(Target) { Type = TargetType.' + type + '; DefaultBuildSettings = BuildSettingsVersion.V7; IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_8; ExtraModuleNames.Add("AutoSetupValidation"); } }\n'
      );
    }

    const project = { root, filename, name: 'AutoSetupValidation.uproject', descriptor: JSON.parse(await fs.readFile(filename, 'utf8')) };
    const vscode = { workspace: { isTrusted: true, workspaceFolders: [{ uri: { fsPath: root } }], textDocuments: [] } };

    await creation.commit(await creation.plan(project, { name: 'ValidationRuntime' }), vscode);
    const module = (await modules.discover(root)).find(m => m.name === 'ValidationRuntime');

    if (options.dependencies || process.argv[3] === 'dependencies') {
      const editor = require('../dependencyEditor');
      let text = await fs.readFile(module.buildFile, 'utf8');
      for (const [name, visibility] of [['Projects', 'Private'], ['SlateCore', 'Public']]) {
        text = editor.mutate(text, module.name, { name, visibility }).proposed;
      }
      await fs.writeFile(module.buildFile, text);
      module.ruleText = text;
      await fs.appendFile(path.join(module.root, 'Private', 'ValidationRuntime.cpp'), '\n#include "Interfaces/IPluginManager.h"\n#include "Widgets/SWidget.h"\n');
      console.log('v0.7 dependency engine added Projects (Private) and SlateCore (Public) in the fresh fixture.');
    }

    for (const type of classes.registry) {
      await classFiles.create(classes.plan(project, module, type.id, 'Validation' + type.label.replace(/ /g, ''), '', type.exposures.includes('blueprintable') ? 'blueprintable' : 'type'), vscode);
    }

    const ubt = options.ubtPath || path.join(engine, 'Engine', 'Binaries', 'DotNET', 'UnrealBuildTool', 'UnrealBuildTool.exe');
    if (!fsSync.existsSync(ubt) && !options.mockUbt) {
      const missingStage = { name: 'generation', command: ubt, exitCode: -1, status: 'Failed', error: 'UnrealBuildTool executable not found: ' + ubt };
      stages.push(missingStage);
      throw new Error(missingStage.error);
    }

    // Stage 1: Generation
    const genStage = await runStage('generation', ubt, ['-projectfiles', '-project=' + filename, '-game', '-progress', '-vscode'], root, path.join(root, 'generation.log'), timeoutMs);
    stages.push(genStage);
    if (genStage.status !== 'Passed') {
      stages.push({ name: 'moduleBuild', status: 'Skipped', reason: 'Dependent on generation stage' });
      stages.push({ name: 'pluginBuild', status: 'Skipped', reason: 'Dependent on generation stage' });
      throw new Error(`Generation stage failed with exit code ${genStage.exitCode}`);
    }

    // Stage 2: Module Build
    const args = ['AutoSetupValidationEditor', 'Win64', 'Development', '-Project=' + filename, '-WaitMutex', '-NoHotReloadFromIDE','-NoUBA','-NoXGE','-NoFASTBuild','-NoSNDBS'];
    const moduleStage = await runStage('moduleBuild', ubt, args, root, path.join(root, 'module-build.log'), timeoutMs);
    stages.push(moduleStage);
    if (moduleStage.status !== 'Passed') {
      stages.push({ name: 'pluginBuild', status: 'Skipped', reason: 'Dependent on moduleBuild stage' });
      throw new Error(`Module build stage failed with exit code ${moduleStage.exitCode}`);
    }

    // Stage 3: Plugin Build
    await creation.commit(await creation.plan(project, { kind: 'plugin', name: 'ValidationPlugin', layout: 'Flat' }), vscode);
    const pluginStage = await runStage('pluginBuild', ubt, args, root, path.join(root, 'plugin-build.log'), timeoutMs);
    stages.push(pluginStage);
    if (pluginStage.status !== 'Passed') {
      throw new Error(`Plugin build stage failed with exit code ${pluginStage.exitCode}`);
    }

    report.success = stages.length===3 && stages.every(s => s.status === 'Passed');
  } catch (error) {
    report.success = false;
    report.error = error.message;
    for(const name of ['generation','moduleBuild','pluginBuild'])if(!stages.some(stage=>stage.name===name))stages.push({name,status:'Skipped',reason:'Validation interrupted: '+error.message});
  } finally {
    try {
      await fs.writeFile(path.join(root, 'validation-results.json'), JSON.stringify(report, null, 2));
    } catch(error) {report.success=false;report.error='Could not persist validation report: '+error.message;}
  }

  console.log('VALIDATION_RESULTS ' + JSON.stringify(report));
  return report;
}

if (require.main === module) {
  validate().then(report => {
    if (!report.success) process.exitCode = 1;
  }).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { runStage, validate };
