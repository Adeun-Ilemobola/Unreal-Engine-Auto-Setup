'use strict';
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const core = require('./core');
const runner = require('./runner');
const projectsApi = require('./project');
const engines = require('./engine');
const diagnostics = require('./diagnostics');
const buildApi = require('./build');
const runtime = require('./runtime');
const processes = require('./processes');
const classWizard = require('./classWizard');
const structureWizard = require('./structureWizard');
const requiredExtensions = ['ms-vscode.cpptools', 'skyboxlabs.unrealengine-tools'];
const provider = 'skyboxlabs.unrealengine-tools';
let running = false;

function activate(context) {
  const output = vscode.window.createOutputChannel('Unreal Engine Auto Setup');
  context.subscriptions.push(output);
  const report = message => output.appendLine(new Date().toISOString() + ' ' + message);

  async function installExtensions() {
    for (const id of requiredExtensions) {
      if (!vscode.extensions.getExtension(id)) {
        report('Installing ' + id + '...');
        await vscode.commands.executeCommand('workbench.extensions.installExtension', id);
      }
    }
    const missing = requiredExtensions.filter(id=>!vscode.extensions.getExtension(id));
    if (missing.length) {
      vscode.window.showInformationMessage('Enable the required extensions and reload VS Code, then run Unreal: Set Up This Project.');
      return false;
    }
    return true;
  }
  context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.installExtensions',async()=>{
    try { if (await installExtensions()) vscode.window.showInformationMessage('Required Unreal extensions are installed.'); }
    catch (error) { report(String(error)); vscode.window.showErrorMessage('Extension installation failed: ' + error.message); }
  }));
  const services={state:runtime.createState(),processes:processes.createService()};
  services.dependencies=require('./dependencyActions').create(vscode,context,services);
  const runtimeReady=runner.register(vscode, context, report,services).catch(error=>report(String(error)));
  diagnostics.register(vscode,context,output,services);
  classWizard.register(vscode,context,services,report);
  structureWizard.register(vscode,context,services,report);

  async function setup(manual = false) {
    if (running || !vscode.workspace.isTrusted) return;
    if (!manual && !vscode.workspace.getConfiguration('unrealSetup').get('autoSetup', true)) return;
    const folders = vscode.workspace.workspaceFolders || [];
    if (folders.length !== 1 || folders[0].uri.scheme !== 'file') {
      if (manual) vscode.window.showInformationMessage('Open one local Unreal project root folder. Multi-root workspaces are not supported.');
      return;
    }
    if (process.platform !== 'win32') {
      if (manual) vscode.window.showInformationMessage('Unreal Engine Auto Setup targets Windows / Win64.');
      return;
    }
    running = true;
    try {
      const folder = folders[0];
      const root = folder.uri.fsPath;
      const entries = await fs.readdir(root);
      const projects = entries.filter(name => name.endsWith('.uproject'));
      if (!projects.length) return;
      if (!await installExtensions()) return;
      const config = vscode.workspace.getConfiguration(undefined, folder.uri);
      let project = config.get('unrealEngine.defaultProject');
      if (!projects.includes(project)) project = projects.length === 1 ? projects[0] : await vscode.window.showQuickPick(projects, {placeHolder:'Choose the Unreal project to configure'});
      if (!project) return;
      const descriptor = JSON.parse((await fs.readFile(path.join(root, project),'utf8')).replace(/^\uFEFF/,''));
      const association = String(descriptor.EngineAssociation || '');
      const numeric = /^(\d+)\.(\d+)(?:\.\d+)?$/.exec(association);
      if (numeric && !core.supportedVersion(Number(numeric[1]),Number(numeric[2]))) { report('Skipped: this project targets Unreal older than 5.8.'); return; }
      const engineProject={root,config,descriptor};
      const resolved=await engines.resolve(engineProject,{
        requireBuild:false,requireEditor:false,
        pick:!numeric ? async()=>{
          const picked=await vscode.window.showOpenDialog({canSelectFiles:false,canSelectFolders:true,canSelectMany:false,openLabel:'Use Unreal Engine',title:'Select the source/custom engine installation'});
          return picked?.[0]?.fsPath;
        } : undefined
      });
      if (!numeric && !resolved) {report('Setup cancelled: custom/source engine has not been selected.');return;}
      await engines.remember(vscode,engineProject,resolved);
      const key = 'configured:' + folder.uri.toString() + '/' + project;
      if (!manual && context.workspaceState.get(key)) return;
      // Do not overwrite unsaved settings, or write through project symlinks.
      for (const relative of ['.vscode','.vscode/settings.json','.vscode/c_cpp_properties.json','.vscode/tasks.json','.clang-format']) {
        const filename = path.join(root,relative);
        try { if ((await fs.lstat(filename)).isSymbolicLink()) throw new Error('Setup skipped: '+relative+' is a symbolic link.'); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (vscode.workspace.textDocuments.some(doc => doc.uri.fsPath === filename && doc.isDirty)) throw new Error('Save '+relative+' before running setup.');
      }
      // Workspace scope supports window-level settings such as files.associations.
      // In an opened folder this writes .vscode/settings.json, retaining JSONC comments.
      const defaults = {...core.settings, 'unrealEngine.defaultProject':project};
      for (const [setting, value] of Object.entries(defaults)) {
        const inspected = config.inspect(setting);
        const existing = inspected?.workspaceFolderValue ?? inspected?.workspaceValue;
        const merged = core.mergeMissing(existing,value);
        if (JSON.stringify(existing) !== JSON.stringify(merged)) await config.update(setting,merged,vscode.ConfigurationTarget.Workspace);
      }
      const properties = path.join(root,'.vscode','c_cpp_properties.json');
      const created = await core.writeNew(properties, JSON.stringify({configurations:[{name:'UnrealBuildTool',configurationProvider:provider}],version:4},null,2)+'\n');
      if (!created) report('Preserved existing c_cpp_properties.json; existing provider/configuration choices remain authoritative.');
      const formatted = await core.writeNew(path.join(root,'.clang-format'),core.formatting);
      report(formatted ? 'Created .clang-format.' : 'Preserved existing .clang-format.');
      const activeProject={root,name:project,filename:path.join(root,project),targets:await projectsApi.discoverTargets(root)};
      let selected=projectsApi.selection(context,activeProject);
      if (!selected.target && activeProject.targets.length) selected=await projectsApi.select(vscode,context,activeProject,'target');
      await projectsApi.saveSelection(context,activeProject,selected);
      const target=selected.target;
      let validSelection=false;
      try {projectsApi.validateSelection(activeProject,selected);validSelection=true;}
      catch(error) {report('Build task skipped: '+error.message);}
      if (validSelection) {
        const taskConfig = vscode.workspace.getConfiguration('tasks',folder.uri);
        const inspectedTasks = taskConfig.inspect('tasks');
        const original = inspectedTasks?.workspaceFolderValue ?? inspectedTasks?.workspaceValue ?? [];
        if (!Array.isArray(original)) throw new Error('Existing tasks.tasks must be an array.');
        const label = 'Unreal: '+target+' '+selected.platform+' '+selected.configuration;
        if (!original.some(task=>task.label === label || (task.type === 'UnrealBuildTool' && task.args?.mode === 'Build' && task.args?.target === target && task.args?.platform === selected.platform && task.args?.configuration === selected.configuration))) {
          const hasDefault = original.some(task=>task.group && typeof task.group === 'object' && task.group.kind === 'build' && task.group.isDefault);
          const task = {label,type:'UnrealBuildTool',args:buildApi.skyboxArguments(selected),group:hasDefault?'build':{kind:'build',isDefault:true}};
          const version = taskConfig.inspect('version');
          if (!(version?.workspaceFolderValue ?? version?.workspaceValue)) await taskConfig.update('version','2.0.0',vscode.ConfigurationTarget.Workspace);
          await taskConfig.update('tasks',[...original,task],vscode.ConfigurationTarget.Workspace);
        }
        report('Prepared build task: '+label+'. No build was started.');
      } else report('No selected standard target found; no build task created. Use Select Target for ambiguous targets.');
      const skybox = vscode.extensions.getExtension(provider);
      if (!skybox) throw new Error('Install/enable Skybox Labs Unreal Engine Integrations.');
      await skybox.activate();
      await context.workspaceState.update(key,true);
      const commands = skybox.packageJSON.contributes?.commands || [];
      const command = commands.find(item => typeof item.title === 'string' && /Select Build Configuration/i.test(item.title));
      report('Setup complete. Skybox requires its own interactive IntelliSense target selection.');
      if (command) {
        vscode.window.showInformationMessage('Project defaults ready. Choose your IntelliSense configuration in Skybox. Build selections are managed separately in the Unreal sidebar.');
        await vscode.commands.executeCommand(command.command);
      } else {
        vscode.window.showInformationMessage('Project defaults ready. Run Unreal (C++): Select Build Configuration... for IntelliSense. Build selections are managed separately in the Unreal sidebar.');
      }
    } catch (error) {
      report(error.stack || String(error));
      vscode.window.showErrorMessage('Unreal setup: '+error.message);
    } finally { running = false; }
  }
  context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.setup',()=>setup(true)));
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(()=>setup()));
  context.subscriptions.push(vscode.workspace.onDidGrantWorkspaceTrust(()=>setup()));
  const watcher = vscode.workspace.createFileSystemWatcher('*.uproject');
  context.subscriptions.push(watcher,watcher.onDidCreate(()=>setup()));
  return Promise.all([setup(),runtimeReady]).then(()=>({refresh:services.refresh,snapshot:()=>services.watcher?.snapshot()}));
}
module.exports = {activate};
