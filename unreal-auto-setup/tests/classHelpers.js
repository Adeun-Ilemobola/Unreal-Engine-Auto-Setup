const fs=require('node:fs/promises');
const path=require('node:path');
const {fixture}=require('./helpers');
const modules=require('../modules');
const projects=require('../project');
function rules(name,dependencies=['Core','CoreUObject','Engine']) {
  return 'using UnrealBuildTool;\npublic class '+name+' : ModuleRules { public '+name+'(ReadOnlyTargetRules Target) : base(Target) { PublicDependencyModuleNames.AddRange(new string[] { '+dependencies.map(item=>'"'+item+'"').join(', ')+' }); } }\n';
}
async function addModule(root,name,{split=false,prefix='Source',dependencies}={}) {
  const moduleRoot=path.join(root,prefix,name);await fs.mkdir(moduleRoot,{recursive:true});
  await fs.writeFile(path.join(moduleRoot,name+'.Build.cs'),rules(name,dependencies));
  if(split) for(const folder of ['Public','Private']) await fs.mkdir(path.join(moduleRoot,folder));
  return moduleRoot;
}
async function classFixture(options={}) {
  const f=await fixture();await addModule(f.root,'Gameplay',options);
  f.project=await projects.readProject(f.vscode);
  f.module=(await modules.discover(f.root))[0];
  return f;
}
module.exports={rules,addModule,classFixture};
