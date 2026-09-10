'use strict';
const projects=require('./project');
const engines=require('./engine');
const buildApi=require('./build');
const processApi=require('./processes');
const debuggerApi=require('./debugger');
const generation=require('./generation');
const runtime=require('./runtime');
const watcherApi=require('./runtimeWatcher');
const sidebarApi=require('./sidebar');

// Compatibility helpers retain the existing tested command-construction surface.
function buildScript(engine,project,target,open,platform='Win64',configuration='Development') {
  const spec=buildApi.specification(engine,project,{target,platform,configuration});
  const command=buildApi.script(spec).replace(/; exit \$LASTEXITCODE$/, '');
  return command+"; if ($LASTEXITCODE -ne 0) { Write-Host ('Build failed (exit ' + $LASTEXITCODE + ').'); exit $LASTEXITCODE }; Write-Host 'Build succeeded.'; "+(open?buildApi.editorScript(engine,project):'exit 0');
}
const editorScript=buildApi.editorScript;
async function editorTargets(root) {return (await projects.discoverTargets(root)).filter(item=>item.type==='Editor').map(item=>item.file);}

async function register(vscode,context,report,services={}) {
  const state=services.state ||= runtime.createState();
  const processes=services.processes ||= processApi.createService();
  let preparing=false;
  const buttons=[['unrealSetup.build','$(tools) Build'],['unrealSetup.run','$(play) Run']].map(([command,text],index)=>{
    const button=vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,20-index);
    Object.assign(button,{command,text});context.subscriptions.push(button);return button;
  });
  const sidebar=sidebarApi.create(vscode,context);
  const refresh=()=>services.watcher?.refresh() || Promise.resolve();
  services.refresh=refresh;
  const builds=services.builds ||= buildApi.createService(vscode,context,state,{changed:()=>{void refresh();}});
  services.watcher=watcherApi.create(vscode,context,services,snapshot=>{
    sidebar.update(snapshot);
    if(!snapshot.project) {buttons.forEach(button=>button.hide());return;}
    const {selected,session,editor}=snapshot,last=session.lastBuild;
    buttons[0].text=(last?.status==='Running'?'$(sync~spin)':last?.success===false?'$(error)':last?.success?'$(check)':'$(tools)')+' Build';
    buttons[1].text=(editor.state==='Running'?'$(check)':'$(play)')+' Run';
    buttons[0].tooltip='Build '+(selected.target || '(select target)')+' | '+selected.platform+' | '+selected.configuration+(last?'\nLast build: '+last.status:'');
    buttons[1].tooltip='Build an Editor target and open it for testing. An existing project Editor is reused without rebuilding.\nEditor: '+editor.state;
    buttons.forEach(button=>button.show());
  });
  context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.refresh',()=>refresh()));
  async function mayLaunch(project) {
    const result=await processes.get(project.filename,{fresh:true});
    if(result.matches.length) {
      state.get(project.filename).launchRequested=undefined;
      vscode.window.showInformationMessage('Unreal Editor is already running for this project (PID '+result.matches.map(item=>item.pid).join(', ')+'). Use Unreal: Attach Debugger to Editor to debug it.');
      return false;
    }
    if(result.state==='Unknown') throw new Error('Editor process detection is unavailable; launch skipped to avoid a duplicate. '+(result.error || 'Some Editor command lines could not be read.'));
    if(Date.now()-(state.get(project.filename).launchRequested || 0)<15000) {
      vscode.window.showInformationMessage('Unreal Editor launch was just requested. Wait for it to start before trying again.');return false;
    }
    return true;
  }
  async function openEditor(project,engine) {
    if(!vscode.workspace.isTrusted || !await mayLaunch(project)) return;
    state.get(project.filename).launchRequested=Date.now();
    const terminal=vscode.window.createTerminal({name:'Unreal: Editor',cwd:project.root,shellPath:processApi.powershell(),shellArgs:['-NoLogo','-NoProfile','-EncodedCommand',Buffer.from(editorScript(engine.path,project.filename),'utf16le').toString('base64')],isTransient:true});
    context.subscriptions.push(terminal);terminal.show();report('Opened Unreal Editor: '+project.name);
  }
  async function operate(mode) {
    if(!vscode.workspace.isTrusted) return;
    if(preparing) {builds.reveal?.();vscode.window.showInformationMessage('An Unreal operation is already active. Wait for it or close its build terminal to cancel.');return;}
    preparing=true;
    try {
      if(process.platform!=='win32') throw new Error('Unreal controls require Windows.');
      const project=await projects.readProject(vscode);if(!project) return;
      if((mode==='open' || mode==='run') && !await mayLaunch(project)) return;
      let selected=projects.selection(context,project);
      if(mode==='run') {
        const editors=project.targets.filter(item=>item.type==='Editor');
        if(!editors.some(item=>item.name===selected.target)) {
          const target=editors.length===1?editors[0]:editors.length?(await vscode.window.showQuickPick(editors.map(item=>({label:item.name,target:item})),{placeHolder:'Choose Editor target for Run'}))?.target:undefined;
          if(!target) {if(!editors.length) throw new Error('Run requires an Editor target. Use Open Editor for a Blueprint-only project.');return;}
          selected={...selected,target:target.name};
        }
        if(['Shipping','Test'].includes(selected.configuration)) {
          const configuration=await vscode.window.showQuickPick(['Development','DebugGame','Debug'],{placeHolder:'Choose an Editor configuration for Run'});
          if(!configuration) return;selected={...selected,configuration};
        }
        mode='buildAndOpen';
      }
      if(mode==='build' || mode==='buildAndOpen') {
        if(!selected.target) selected=await projects.select(vscode,context,project,'target');
        if(!selected.target) return;
        projects.validateSelection(project,selected,mode==='buildAndOpen');
        await projects.saveSelection(context,project,selected);
      }
      const engine=await engines.resolve(project,{requireBuild:mode==='build' || mode==='buildAndOpen',requireEditor:mode==='open' || mode==='buildAndOpen',pick:async()=>{
        const picked=await vscode.window.showOpenDialog({canSelectFiles:false,canSelectFolders:true,canSelectMany:false,openLabel:'Use Unreal Engine',title:'Select the installation folder containing Engine'});return picked?.[0]?.fsPath;
      }});
      if(!engine) return;
      if(mode==='build' || mode==='buildAndOpen') if(!await vscode.workspace.saveAll(false)) throw new Error('Save project files before building.');
      if(!vscode.workspace.isTrusted) return;
      await engines.remember(vscode,project,engine);
      if(mode==='open') await openEditor(project,engine);
      else if(mode==='generate') {
        const result=await generation.run(project,engine.path,vscode,state,builds);
        report('Project generation '+result.status+': '+project.name);
      } else {
        const spec=buildApi.specification(engine.path,project.filename,selected);
        const result=await builds.run(spec).done;
        report('Build '+result.status+': '+project.name+' ('+selected.target+' / '+selected.platform+' / '+selected.configuration+').');
        if(result.success && mode==='buildAndOpen') await openEditor(project,engine);
      }
    } catch(error) {report(error.stack || String(error));vscode.window.showErrorMessage('Unreal: '+error.message);}
    finally {preparing=false;await refresh();}
  }
  for(const [command,mode] of [['run','run'],['build','build'],['buildAndRun','buildAndOpen'],['openEditor','open'],['regenerate','generate']]) context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.'+command,()=>operate(mode)));
  for(const field of ['target','platform','configuration']) {
    context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.select'+field[0].toUpperCase()+field.slice(1),async()=>{
      if(!vscode.workspace.isTrusted) return;
      try {const project=await projects.readProject(vscode);if(project) await projects.select(vscode,context,project,field);await refresh();}
      catch(error) {vscode.window.showErrorMessage('Unreal: '+error.message);}
    }));
  }
  const actions={'New Module':'newModule','New Plugin':'newPlugin','Open Plugin Descriptor':'openPluginDescriptor','New C++ Class':'newClass','Open Module Build.cs':'openModuleRules','Open Project Descriptor':'openProjectDescriptor','Open Target Rules':'openTargetRules','Target':'selectTarget','Platform':'selectPlatform','Configuration':'selectConfiguration','Open Editor':'openEditor','Build and Open Editor':'buildAndRun','Attach Debugger to Editor':'attachDebugger','Regenerate Project Files':'regenerate','Diagnose Project':'diagnose','Open Latest Project Log':'openLatestLog'};
  context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.selectBuild',async()=>{
    if(!vscode.workspace.isTrusted) return;
    const choice=await vscode.window.showQuickPick(Object.keys(actions),{placeHolder:'Unreal build settings and runtime controls'});
    if(choice) await vscode.commands.executeCommand('unrealSetup.'+actions[choice]);
  }));
  debuggerApi.register(vscode,context,processes,()=>{void refresh();});
  await refresh();return services;
}
module.exports={register,buildScript,editorScript,editorTargets};
