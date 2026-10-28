'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const projects = require('../../unreal-auto-setup/project');
const modules = require('../../unreal-auto-setup/modules');
const core = require('../../unreal-auto-setup/core');
const engine = require('../../unreal-auto-setup/engine');
const root = 'C:\\Dev\\Unreal\\RPGX';
const evidence = path.resolve(__dirname, '../../docs/maintenance/runs/0003-phase3a-2026-10-27');
async function main() {
  const names = ['RPGX.uproject', '.vscode/settings.json', '.vscode/tasks.json', '.vscode/c_cpp_properties.json', '.clang-format'];
  const protectedFiles = {};
  for (const relative of names) {
    try { protectedFiles[relative] = crypto.createHash('sha256').update(await fs.readFile(path.join(root, relative))).digest('hex'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; protectedFiles[relative] = null; }
  }
  // This observed settings file has a trailing object comma, but no comments.
  const settings = JSON.parse((await fs.readFile(path.join(root, '.vscode/settings.json'), 'utf8')).replace(/,\s*}/g, '}'));
  const vscode = { workspace: { workspaceFolders: [{ uri: { scheme: 'file', fsPath: root } }], getConfiguration: () => ({ get: key => settings[key] }) } };
  const project = await projects.readProject(vscode, { interactive: false });
  const list = await modules.discover(root), plugins = await modules.plugins(root);
  const rules = {};
  for (const item of list) rules[item.buildFile] = crypto.createHash('sha256').update(await fs.readFile(item.buildFile)).digest('hex');
  const tasks = JSON.parse(await fs.readFile(path.join(root, '.vscode/tasks.json'), 'utf8'));
  const report = {
    inspection: 'Read-only internal-module compatibility review, not a VS Code host activation or build',
    root, protectedFiles, rules, descriptor: project.descriptor, targets: project.targets,
    engine: await engine.inspect(settings['unrealEngine.enginePath'], project.descriptor.EngineAssociation),
    moduleList: list.map(({ ruleText, ...item }) => item), plugins: plugins.map(p => ({ name: p.name, filename: p.filename })),
    taskArgumentsRecognized: tasks.tasks.some(t => t.type === 'UnrealBuildTool' && t.args?.target === 'RPGXEditor' && t.args?.platform === 'Win64' && t.args?.configuration === 'Development'),
    missingDefaultKeys: Object.keys(core.settings).filter(key => settings[key] === undefined),
    mergePreservesExistingValues: Object.keys(settings).every(key => JSON.stringify(core.mergeMissing(settings, core.settings)[key]) === JSON.stringify(settings[key]))
  };
  for (const [relative, before] of Object.entries(protectedFiles)) if (before) {
    const after = crypto.createHash('sha256').update(await fs.readFile(path.join(root, relative))).digest('hex');
    if (after !== before) throw new Error('RPG configuration changed during inspection');
  }
  await fs.writeFile(path.join(evidence, 'rpg-readonly.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
