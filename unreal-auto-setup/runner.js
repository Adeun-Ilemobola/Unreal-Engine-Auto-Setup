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
  services.runtimeLog=report;
  const state=services.state ||= runtime.createState();
  const processes=services.processes ||= processApi.createService();
  const coordinator=services.coordinator=require('./runtimeCoordinator').create({execute:operate,changed:()=>{void services.refresh?.();},log:report});
  context.subscriptions.push(coordinator);
  const buttons=[['unrealSetup.build','$(tools) Build'],['unrealSetup.run','$(play) Run']].map(([command,text],index)=>{
    const button=vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,20-index);
    Object.assign(button,{command,text});context.subscriptions.push(button);return button;
  });
  const sidebar=sidebarApi.create(vscode,context);
  const refresh=()=>services.watcher?.refresh() || Promise.resolve();
  services.refresh=refresh;
  const builds=services.builds ||= buildApi.createService(vscode,context,state,{changed:()=>{void refresh();}});
  services.watcher=watcherApi.create(vscode,context,services,snapshot=>{
    snapshot.automation=coordinator.snapshot();
    snapshot.session && (snapshot.session.automation=snapshot.automation);
    snapshot.dependencies=services.dependencies?.snapshot(snapshot.module);
    sidebar.update(snapshot);
    void services.dependencies?.sync(snapshot).catch(error=>report('Dependency state: '+error.message));
    if(!snapshot.project) {buttons.forEach(button=>button.hide());return;}
    const {selected,session,editor}=snapshot,last=session.lastBuild;
    buttons[0].text=(last?.status==='Running'?'$(sync~spin)':last?.success===false?'$(error)':last?.success?'$(check)':'$(tools)')+' Build';
    buttons[1].text=(editor.state==='Running'?'$(check)':'$(play)')+' Run';
    buttons[0].tooltip='Build '+(selected.target || '(select target)')+' | '+selected.platform+' | '+selected.configuration+(last?'\nLast build: '+last.status:'')+'\nPending: '+snapshot.automation.dirty.length+' files | '+snapshot.automation.state+(snapshot.automation.blocked?' | '+snapshot.automation.blocked:'');
    buttons[1].tooltip='Build an Editor target and open it for testing. Pending changes are compiled before opening; close a running Editor before an external rebuild.\nEditor: '+editor.state;
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
  async function operate(mode,operation={}) {
    const automatic=operation.automatic;
    if(mode==='auto') mode='build';
    if(!vscode.workspace.isTrusted) return;
    try {
      if(process.platform!=='win32') throw new Error('Unreal controls require Windows.');
      const project=await projects.readProject(vscode,{interactive:!automatic});if(!project) return;
      if(operation.project && project.filename!==operation.project) throw new Error('Project changed; operation cancelled.');
      if(mode==='open' && !await mayLaunch(project)) return {success:true,status:'Reused'};
      if(mode==='run' && !operation.changes?.length && !state.get(project.filename).stale && (await processes.get(project.filename,{fresh:true})).state==='Running') {await mayLaunch(project);return {success:true,status:'Reused'};}
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
        if(!selected.target && automatic) throw new Error('Select a build target before enabling automation.');
        if(!selected.target) selected=await projects.select(vscode,context,project,'target');
        if(!selected.target) return;
        projects.validateSelection(project,selected,mode==='buildAndOpen');
        await projects.saveSelection(context,project,selected);
      }
      const engine=await engines.resolve(project,{requireBuild:mode==='build' || mode==='buildAndOpen',requireEditor:mode==='open' || mode==='buildAndOpen',pick:automatic?undefined:async()=>{
        const picked=await vscode.window.showOpenDialog({canSelectFiles:false,canSelectFolders:true,canSelectMany:false,openLabel:'Use Unreal Engine',title:'Select the installation folder containing Engine'});return picked?.[0]?.fsPath;
      }});
      if(!engine) {if(automatic) throw new Error('Resolve an Unreal engine before automation.');return;}
      const localModules=automatic?await require('./modules').discover(project.root):[];
      if(automatic && (vscode.workspace.textDocuments || []).some(d=>d.isDirty && require('./dirtyTracker').classify(project,localModules,d.uri.fsPath))) throw new Error('Save project documents before automatic work.');
      if(!automatic && (mode==='build' || mode==='buildAndOpen')) if(!await vscode.workspace.saveAll(false)) throw new Error('Save project files before building.');
      const current=await projects.readProject(vscode,{interactive:false});
      if(current?.filename!==project.filename) throw new Error('Project changed; operation cancelled.');
      if(mode==='build' || mode==='buildAndOpen') {
        const editor=await processes.get(project.filename,{fresh:true});
        const strategy=require('./liveCoding').resolve(editor,operation.changes);
        strategy.liveCoding=await require('./liveCoding').inspect(editor);
        state.get(project.filename).strategy=strategy;
        if(!strategy.allowed) throw new Error(strategy.reason);
        if(state.get(project.filename).stale || operation.changes?.some(c=>c.kind==='Structure' && !c.regenerated)) {
          if(automatic && operation.mode!=='autoBuildAndRegenerate') throw new Error('Project metadata stale — regeneration required.');
          if(mode==='buildAndOpen' || automatic) {
            operation.stage?.('Regenerating');
            const generated=await generation.run(project,engine.path,vscode,state,builds,{automatic});
            if(!generated.success) {vscode.window.showErrorMessage('Unreal regeneration '+generated.status+'. Build skipped; change structure or retry manually.');return {...generated,regenerationFailed:true};}
            if(state.get(project.filename).stale) return {success:false,status:'Blocked',reason:'Structure changed during regeneration; retry required.',regenerationFailed:true};
            operation.generated?.();
          }
        }
      }
      if(!vscode.workspace.isTrusted) return;
      await engines.remember(vscode,project,engine);
      if(mode==='open') {await openEditor(project,engine);return {success:true,status:'Opened'};}
      else if(mode==='generate') {
        operation.stage?.('Regenerating');
        const result=await generation.run(project,engine.path,vscode,state,builds,{automatic});
        report('Project generation '+result.status+': '+project.name);
        if(result.success) operation.generated?.();return result;
      } else {
        if((await projects.readProject(vscode,{interactive:false}))?.filename!==project.filename || !vscode.workspace.isTrusted) throw new Error('Project or trust changed; build cancelled.');
        if(automatic && (vscode.workspace.textDocuments || []).some(d=>d.isDirty && require('./dirtyTracker').classify(project,localModules,d.uri.fsPath))) throw new Error('Save project documents before automatic build.');
        const spec=buildApi.specification(engine.path,project.filename,selected);
        operation.stage?.('Building');
        const result=await builds.run({...spec,automatic}).done;
        report('Build '+result.status+': '+project.name+' ('+selected.target+' / '+selected.platform+' / '+selected.configuration+').');
        if(result.success && mode==='buildAndOpen') await openEditor(project,engine);
        if(automatic && !result.success) vscode.window.showErrorMessage('Unreal automatic build '+result.status+': '+(result.reason || 'See build output and Problems.'));
        return {...result,target:selected.target,configuration:selected.configuration};
      }
    } catch(error) {report(error.stack || String(error));vscode.window.showErrorMessage('Unreal: '+error.message);return {success:false,status:'Blocked',reason:error.message};}
  }
  for(const [command,mode] of [['run','run'],['build','build'],['buildAndRun','buildAndOpen'],['openEditor','open'],['regenerate','generate']]) context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.'+command,async()=>{if(coordinator.busy){builds.reveal?.();return;}return coordinator.run(mode);}));
  context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.cancelPendingAutomaticBuild',()=>coordinator.cancelPending()),vscode.commands.registerCommand('unrealSetup.cancelBuild',()=>builds.cancel?.()));
  for(const [id,key,values] of [['automationMode','automationMode',['watch','off','autoBuild','autoBuildAndRegenerate']],['autoBuildDelay','autoBuildDelay'],['runtimeInterval','runtimeRefreshInterval']]) context.subscriptions.push(vscode.commands.registerCommand('unrealSetup.'+id,async()=>{
    const choice=values?await vscode.window.showQuickPick(values,{placeHolder:'Project automation mode'}):await vscode.window.showInputBox({prompt:key==='autoBuildDelay'?'Auto build delay: 5–300 seconds':'Reconciliation: 0 or 10–3600 seconds',validateInput:text=>{const n=Number(text);return /^\d+$/.test(text) && (key==='autoBuildDelay'?n>=5 && n<=300:n===0 || n>=10 && n<=3600)?undefined:'Enter a supported number of seconds';}});
    if(choice!==undefined) await vscode.workspace.getConfiguration().update('unrealSetup.'+key,values?choice:Number(choice),vscode.ConfigurationTarget.Workspace);
  }));
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
