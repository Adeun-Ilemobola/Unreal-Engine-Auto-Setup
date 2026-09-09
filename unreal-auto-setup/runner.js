'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const projects = require('./project');
const engines = require('./engine');

function quote(value) {
  // Build.bat passes through cmd.exe as well as PowerShell.
  if (/[\r\n\0"%!]/.test(value)) throw new Error('Build paths cannot contain quotes, %, ! or control characters.');
  return "'" + value.replace(/'/g, "''") + "'";
}

function buildScript(engine, project, target, run, platform='Win64', configuration='Development') {
  if (platform !== 'Win64' || !projects.configurations.includes(configuration)) throw new Error('Unsupported build platform/configuration.');
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(target)) throw new Error('Unsupported Editor target name.');
  const build = quote(path.join(engine, 'Engine', 'Build', 'BatchFiles', 'Build.bat'));
  const editor = quote(path.join(engine, 'Engine', 'Binaries', 'Win64', 'UnrealEditor.exe'));
  const projectArg = quote('-Project=' + project);
  return "$ErrorActionPreference = 'Stop'; & " + build + ' ' + quote(target) + ' ' + platform + ' ' + configuration + ' ' + projectArg +
    " -WaitMutex -NoHotReloadFromIDE; if ($LASTEXITCODE -ne 0) { Write-Host ('Build failed (exit ' + $LASTEXITCODE + ').'); exit $LASTEXITCODE }; Write-Host 'Build succeeded.'; " +
    (run ? '& ' + editor + ' ' + quote(project) + ' -log; exit $LASTEXITCODE' : 'exit 0');
}

function editorScript(engine,project) {
  return "$ErrorActionPreference = 'Stop'; & " + quote(path.join(engine,'Engine','Binaries','Win64','UnrealEditor.exe')) + ' ' + quote(project) + ' -log; exit $LASTEXITCODE';
}
async function editorTargets(root) {
  return (await projects.discoverTargets(root)).filter(item=>item.type==='Editor').map(item=>item.file);
}

function register(vscode, context, report) {
  let preparing = false;
  let activeTerminal;
  async function build(mode) {
    const run = mode !== 'build';
    if (!vscode.workspace.isTrusted) return;
    if (preparing || activeTerminal) {
      activeTerminal?.show();
      vscode.window.showInformationMessage('A build/run is already active. Close its terminal to stop it before starting another.');
      return;
    }
    preparing = true;
    try {
      if (process.platform !== 'win32') throw new Error('Unreal builds require Windows.');
      const project = await projects.readProject(vscode);
      if (!project) return;
      const {root} = project;
      let selected = projects.selection(context,project);
      if (mode !== 'open') {
        if (!selected.target) selected = await projects.select(vscode,context,project,'target');
        if (!selected.target) return;
        projects.validateSelection(project,selected,mode==='buildAndOpen');
        await projects.saveSelection(context,project,selected);
      }
      const engine = await engines.resolve(project,{
        requireBuild:mode !== 'open',requireEditor:run,
        pick:async()=>{
          const picked=await vscode.window.showOpenDialog({canSelectFiles:false,canSelectFolders:true,canSelectMany:false,openLabel:'Use Unreal Engine',title:'Select the installation folder containing Engine'});
          return picked?.[0]?.fsPath;
        }
      });
      if (!engine) return;
      const script = mode === 'open' ? editorScript(engine.path,project.filename) : buildScript(engine.path,project.filename,selected.target,run,selected.platform,selected.configuration);
      if (mode !== 'open' && !await vscode.workspace.saveAll(false)) throw new Error('Save project files before building.');
      if (!vscode.workspace.isTrusted) return;
      await engines.remember(vscode,project,engine);
      const terminal = vscode.window.createTerminal({
        name:mode === 'open' ? 'Unreal: Editor' : run ? 'Unreal: Build & Open Editor' : 'Unreal: Build', cwd:root,
        shellPath:path.join(process.env.SystemRoot || 'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),
        shellArgs:['-NoLogo','-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],
        isTransient:true,
        message:mode === 'open' ? 'Opening Unreal Editor.' : 'Building ' + selected.target + ' / ' + selected.platform + ' / ' + selected.configuration + (run ? ', then opening Unreal Editor.' : '.')
      });
      activeTerminal = terminal;
      context.subscriptions.push(terminal);
      terminal.show();
      report('Started ' + mode + ': ' + project.name + '.');
      await refresh();
    } catch (error) { report(error.stack || String(error)); vscode.window.showErrorMessage('Unreal: ' + error.message); }
    finally { preparing = false; }
  }
  context.subscriptions.push(vscode.window.onDidCloseTerminal(terminal=>{if (terminal === activeTerminal) activeTerminal=undefined;}));
  for (const [command,mode] of [['unrealSetup.build','build'],['unrealSetup.buildAndRun','buildAndOpen'],['unrealSetup.openEditor','open']]) {
    context.subscriptions.push(vscode.commands.registerCommand(command,()=>build(mode)));
  }
  const buttons = [['unrealSetup.build','$(tools) Build','Build selected Unreal target'],['unrealSetup.openEditor','$(window) Editor','Open Unreal Editor without building'],['unrealSetup.selectBuild','Unreal configuration','Select target, platform or configuration']].map(([command,text,tooltip],index)=>{
    const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 20-index);
    Object.assign(button,{command,text,tooltip});
    context.subscriptions.push(button);
    return button;
  });
  async function refresh() {
    const folders = vscode.workspace.workspaceFolders || [];
    let visible = false;
    let active;
    if (vscode.workspace.isTrusted && process.platform === 'win32' && folders.length === 1 && folders[0].uri.scheme === 'file') {
      try { visible = (await fs.readdir(folders[0].uri.fsPath)).some(name=>name.endsWith('.uproject'));
        active = await projects.readProject(vscode,{interactive:false});
      } catch {}
    }
    if(active) {const value=projects.selection(context,active);buttons[2].text=(value.target || 'Select target')+' | '+value.platform+' | '+value.configuration;}
    else buttons[2].text='Select Unreal project';
    for (const button of buttons) visible ? button.show() : button.hide();
  }
  for (const field of ['target','platform','configuration']) {
    context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.select'+field[0].toUpperCase()+field.slice(1),async()=>{
      if(!vscode.workspace.isTrusted) return;
      try {const project=await projects.readProject(vscode);if(project) await projects.select(vscode,context,project,field);await refresh();}
      catch(error) {vscode.window.showErrorMessage('Unreal: '+error.message);}
    }));
  }
  context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.selectBuild',async()=>{
    const choice=await vscode.window.showQuickPick(['Target','Platform','Configuration'],{placeHolder:'Change build selection'});
    if(choice) await vscode.commands.executeCommand('unrealSetup.select'+choice);
  }));
  const watcher = vscode.workspace.createFileSystemWatcher('{*.uproject,Source/*.Target.cs}');
  context.subscriptions.push(watcher,watcher.onDidCreate(refresh),watcher.onDidDelete(refresh),...(watcher.onDidChange ? [watcher.onDidChange(refresh)] : []),...(vscode.workspace.onDidChangeConfiguration ? [vscode.workspace.onDidChangeConfiguration(refresh)] : []),vscode.workspace.onDidChangeWorkspaceFolders(refresh),vscode.workspace.onDidGrantWorkspaceTrust(refresh));
  return refresh();
}
module.exports = {register, buildScript, editorScript, editorTargets};
