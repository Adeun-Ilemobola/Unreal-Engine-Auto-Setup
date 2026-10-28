const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {EventEmitter:NodeEvents}=require('node:events');
class Emitter {
  constructor(){this.listeners=new Set();this.event=fn=>{this.listeners.add(fn);return {dispose:()=>this.listeners.delete(fn)};};}
  fire(value){for(const listener of this.listeners) listener(value);}
  dispose(){this.listeners.clear();}
}
function fakeVSCode(root) {
  const commands=new Map(),terminals=[],buttons=[],errors=[],infos=[],warnings=[],picks=[],diagnostics=new Map(),events={};
  const values={'unrealEngine.enginePath':root};let saves=0;
  const event=name=>{const emitter=new Emitter();events[name]=emitter;return emitter.event;};
  const vscode={EventEmitter:Emitter,StatusBarAlignment:{Left:1},ConfigurationTarget:{Workspace:2},Uri:{file:fsPath=>({fsPath})},DiagnosticSeverity:{Error:0,Warning:1},
    Range:class {constructor(line,character,endLine,endCharacter){this.start={line,character};this.end={line:endLine,character:endCharacter};}},
    Diagnostic:class {constructor(range,message,severity){Object.assign(this,{range,message,severity});}},
    languages:{createDiagnosticCollection:()=>({set:(uri,items)=>diagnostics.set(uri.fsPath,items),delete:uri=>diagnostics.delete(uri.fsPath),dispose(){},clear:()=>diagnostics.clear()})},
    workspace:{isTrusted:true,workspaceFolders:[{uri:{scheme:'file',fsPath:root,toString:()=>root}}],textDocuments:[],saveAll:async()=>{saves++;return true;},
      getConfiguration:()=>({get:key=>values[key],inspect:key=>({workspaceValue:values[key]}),update:async(key,value)=>{values[key]=value;}}),
      onDidChangeConfiguration:event('configuration'),onDidChangeWorkspaceFolders:event('folders'),onDidGrantWorkspaceTrust:event('trust'),
      createFileSystemWatcher:()=>({dispose(){},onDidCreate:event('create'),onDidChange:event('change'),onDidDelete:event('delete')})},
    extensions:{getExtension:()=>({activate:async()=>{}})},
    debug:{startDebugging:async()=>true,onDidStartDebugSession:event('debugStart'),onDidTerminateDebugSession:event('debugEnd')},
    commands:{registerCommand:(key,fn)=>{commands.set(key,fn);return {dispose(){}};},executeCommand:async key=>commands.get(key)?.()},
    window:{state:{focused:true},onDidChangeWindowState:event('focus'),showQuickPick:async()=>picks.shift(),showOpenDialog:async()=>undefined,
      showErrorMessage:text=>errors.push(text),showInformationMessage:text=>infos.push(text),showWarningMessage:text=>warnings.push(text),
      createStatusBarItem:()=>{const item={show(){this.visible=true;},hide(){this.visible=false;},dispose(){}};buttons.push(item);return item;},
      createTerminal:options=>{const terminal={options,output:'',show(){if(options.pty && !this.started){this.started=true;options.pty.onDidWrite(text=>{this.output+=text;});options.pty.open();}},dispose(){options.pty?.close();}};terminals.push(terminal);return terminal;}}
  };
  const state=new Map();const context={subscriptions:[],globalStorageUri:{fsPath:path.join(root,'.test-extension-storage')},workspaceState:{get:key=>state.get(key),update:async(key,value)=>state.set(key,value)}};
  return {vscode,context,commands,terminals,buttons,errors,infos,warnings,picks,diagnostics,events,values,saves:()=>saves};
}
async function fixture() {
  const root=await fs.mkdtemp(path.join(require('./testTemp').root(),'unreal-v04-'));
  for(const dir of ['Source','Engine/Build/BatchFiles','Engine/Binaries/Win64','Engine/Binaries/DotNET/UnrealBuildTool']) await fs.mkdir(path.join(root,dir),{recursive:true});
  await fs.writeFile(path.join(root,'Game.uproject'),'{"EngineAssociation":"5.8"}');
  await fs.writeFile(path.join(root,'Source','GameEditor.Target.cs'),'Type=TargetType.Editor;');
  await fs.writeFile(path.join(root,'Source','Game.Target.cs'),'Type=TargetType.Game;');
  await fs.writeFile(path.join(root,'Engine','Build','Build.version'),'{"MajorVersion":5,"MinorVersion":8}');
  for(const file of ['Engine/Build/BatchFiles/Build.bat','Engine/Binaries/Win64/UnrealEditor.exe','Engine/Binaries/DotNET/UnrealBuildTool/UnrealBuildTool.exe']) await fs.writeFile(path.join(root,file),'');
  return {root,...fakeVSCode(root),cleanup:()=>fs.rm(root,{recursive:true,force:true})};
}
function child() {const result=new NodeEvents();result.pid=123;result.stdout=new NodeEvents();result.stderr=new NodeEvents();result.stdout.setEncoding=result.stderr.setEncoding=()=>{};return result;}
module.exports={Emitter,fakeVSCode,fixture,child};
