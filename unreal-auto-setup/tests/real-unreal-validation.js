// Opt-in disposable fixture; never operates on an existing project. Run with a UE installation path.
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const creation=require('../creation'),modules=require('../modules'),templates=require('../moduleTemplates'),classes=require('../classTemplates'),classFiles=require('../classFiles');
async function run(exe,args,cwd,log) {
  return new Promise(resolve=>{const child=spawn(exe,args,{cwd,windowsHide:true});let output='';child.stdout.on('data',b=>{output+=b;process.stdout.write(b);});child.stderr.on('data',b=>{output+=b;process.stderr.write(b);});child.on('error',e=>{output+=e.message;});child.on('close',async code=>{await fs.writeFile(log,output);resolve(code);});});
}
(async()=>{
  const engine=process.argv[2];if(!engine) throw new Error('Pass the UE installation directory.');
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'UnrealAutoSetup-v06-'));
  const filename=path.join(root,'AutoSetupValidation.uproject');
  console.log('Disposable project: '+root);
  await fs.writeFile(filename,JSON.stringify({FileVersion:3,EngineAssociation:'5.8',Modules:[{Name:'AutoSetupValidation',Type:'Runtime',LoadingPhase:'Default'}]},null,2));
  const base=templates.render(path.join(root,'Source','AutoSetupValidation'),'AutoSetupValidation');
  base.files[2].text='#include "AutoSetupValidation.h"\n#include "Modules/ModuleManager.h"\nIMPLEMENT_PRIMARY_GAME_MODULE(FDefaultGameModuleImpl, AutoSetupValidation, "AutoSetupValidation");\n';
  for(const f of base.files) {await fs.mkdir(path.dirname(f.path),{recursive:true});await fs.writeFile(f.path,f.text);}
  for(const type of ['Editor','Game']) {
    const target='AutoSetupValidation'+(type==='Editor'?'Editor':'');
    await fs.writeFile(path.join(root,'Source',target+'.Target.cs'),'using UnrealBuildTool;\npublic class '+target+'Target : TargetRules { public '+target+'Target(TargetInfo Target) : base(Target) { Type = TargetType.'+type+'; DefaultBuildSettings = BuildSettingsVersion.V7; IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_8; ExtraModuleNames.Add("AutoSetupValidation"); } }\n');
  }
  const project={root,filename,name:'AutoSetupValidation.uproject',descriptor:JSON.parse(await fs.readFile(filename,'utf8'))};
  const vscode={workspace:{isTrusted:true,workspaceFolders:[{uri:{fsPath:root}}],textDocuments:[]}};
  await creation.commit(await creation.plan(project,{name:'ValidationRuntime'}),vscode);
  const module=(await modules.discover(root)).find(m=>m.name==='ValidationRuntime');
  for(const type of classes.registry) await classFiles.create(classes.plan(project,module,type.id,'Validation'+type.label.replace(/ /g,''),'',type.exposures.includes('blueprintable')?'blueprintable':'type'),vscode);
  const ubt=path.join(engine,'Engine','Binaries','DotNET','UnrealBuildTool','UnrealBuildTool.exe');
  const results={root,engine,classes:classes.registry.map(t=>t.label)};
  results.generation=await run(ubt,['-projectfiles','-project='+filename,'-game','-progress','-vscode'],root,path.join(root,'generation.log'));
  const args=['AutoSetupValidationEditor','Win64','Development','-Project='+filename,'-WaitMutex','-NoHotReloadFromIDE'];
  results.moduleBuild=await run(ubt,args,root,path.join(root,'module-build.log'));
  await creation.commit(await creation.plan(project,{kind:'plugin',name:'ValidationPlugin',layout:'Flat'}),vscode);
  results.pluginBuild=await run(ubt,args,root,path.join(root,'plugin-build.log'));
  await fs.writeFile(path.join(root,'validation-results.json'),JSON.stringify(results,null,2));
  console.log('VALIDATION_RESULTS '+JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1;});
