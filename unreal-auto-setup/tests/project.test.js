const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const projects=require('../project');
const {buildScript}=require('../runner');

test('discovers all targets, defaults to Editor and preserves project-specific selections across contexts',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'unreal-selection-'));
  try {
    await fs.mkdir(path.join(root,'Source'));
    for(const [name,code] of [['Game','Type=TargetType.Game;'],['GameEditor','Type=TargetType.Editor;'],['GameServer','Type=TargetType.Server;'],['Ambiguous','if(foo) Type=TargetType.Editor; else Type=TargetType.Game;'],['Unknown','// Type=TargetType.Editor;']]) {
      await fs.writeFile(path.join(root,'Source',name+'.Target.cs'),code);
    }
    const targets=await projects.discoverTargets(root);
    assert.equal(targets.length,5);
    assert.equal(targets.find(item=>item.name==='Ambiguous').type,'Unknown');
    assert.equal(targets.find(item=>item.name==='Unknown').type,'Unknown');
    const project={root,name:'Game.uproject',filename:path.join(root,'Game.uproject'),targets};
    const store=new Map();
    const context=()=>({workspaceState:{get:key=>store.get(key),update:async(key,value)=>store.set(key,structuredClone(value))}});
    assert.deepEqual(projects.selection(context(),project),{target:'GameEditor',platform:'Win64',configuration:'Development'});
    const queue=[{label:'Game'},'Shipping','Win64'];
    const vscode={window:{showQuickPick:async()=>queue.shift()}};
    for(const field of ['target','configuration','platform']) await projects.select(vscode,context(),project,field);
    const selected=projects.selection(context(),project);
    assert.deepEqual(selected,{target:'Game',platform:'Win64',configuration:'Shipping'});
    assert.match(buildScript(root,project.filename,selected.target,false,selected.platform,selected.configuration),/'Game' Win64 Shipping/);
    assert.equal(projects.selection(context(),{...project,filename:path.join(root,'Second.uproject')}).configuration,'Development');
    await projects.select(vscode,context(),project,'configuration'); // cancellation preserves choice
    assert.deepEqual(projects.selection(context(),project),selected);
    projects.validateSelection(project,selected);
    assert.throws(()=>projects.validateSelection(project,selected,true),/requires a known Editor/);
    assert.throws(()=>projects.validateSelection(project,{...selected,target:'GameEditor'}),/Shipping\/Test/);
    assert.throws(()=>projects.validateSelection({...project,targets:[]},selected),/missing or ambiguous/);
    assert.equal(projects.selection(context(),{...project,filename:'ambiguous',targets:targets.filter(item=>item.type!=='Editor')}).target,undefined);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('build script supports all five configurations without falling back to Development',()=>{
  for(const configuration of projects.configurations) assert.ok(buildScript('C:\\UE','C:\\Game.uproject','Game',false,'Win64',configuration).includes('Win64 '+configuration));
});

test('engine settings protection rejects dirty settings before writing',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'unreal-dirty-'));
  try {await assert.rejects(projects.protectSettings(root,{workspace:{textDocuments:[{uri:{fsPath:path.join(root,'.vscode','settings.json')},isDirty:true}]}}),/Save/);}
  finally {await fs.rm(root,{recursive:true,force:true});}
});
