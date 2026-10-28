const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const engine=require('../engine'),project=require('../project');
for(const source of ['configured','discovered','picked']) for(const requireBuild of [false,true]) for(const requireEditor of [false,true]) {
  test(source+' capability requirements '+requireBuild+'/'+requireEditor,async()=>{
    const root=await fs.mkdtemp(path.join(require('./testTemp').root(),'unreal-capabilities-'));
    try {
      const build=path.join(root,'Engine/Build/BatchFiles/Build.bat'),editor=path.join(root,'Engine/Binaries/Win64/UnrealEditor.exe');
      await fs.mkdir(path.dirname(build),{recursive:true});await fs.mkdir(path.dirname(editor),{recursive:true});
      await fs.writeFile(path.join(root,'Engine/Build/Build.version'),'{"MajorVersion":5,"MinorVersion":8}');
      for(const hasBuild of [false,true]) for(const hasEditor of [false,true]) {
        for(const [file,exists] of [[build,hasBuild],[editor,hasEditor]]) if(exists)await fs.writeFile(file,'');else await fs.unlink(file).catch(e=>{if(e.code!=='ENOENT')throw e;});
        const p={descriptor:{EngineAssociation:'5.8'},config:{get:()=>source==='configured'?root:undefined}};
        const options={requireBuild,requireEditor,discover:async()=>source==='discovered'?[root]:[],pick:source==='picked'?async()=>root:undefined};
        const allowed=(!requireBuild || hasBuild) && (!requireEditor || hasEditor);
        if(allowed)assert.equal((await engine.resolve(p,options)).path,root);
        else if(source==='discovered')assert.equal(await engine.resolve(p,options),undefined);
        else await assert.rejects(engine.resolve(p,options),/missing/);
      }
      const p={descriptor:{EngineAssociation:'5.9'},config:{get:()=>source==='configured'?root:undefined}};
      const options={requireBuild,requireEditor,discover:async()=>source==='discovered'?[root]:[],pick:source==='picked'?async()=>root:undefined};
      if(source==='discovered')assert.equal(await engine.resolve(p,options),undefined);else await assert.rejects(engine.resolve(p,options),/match/);
    } finally {await fs.rm(root,{recursive:true,force:true});}
  });
}
const cases=[
  ...['Editor','Game','Client','Server','Program'].map(t=>['Type = TargetType.'+t+';',t]),
  ['this.Type = TargetType.Editor;','Editor'],
  ['Type\n= TargetType\n. Editor\n;','Editor'],
  ['/* Type=TargetType.Game; */ Type=TargetType.Editor; // Type=TargetType.Client;','Editor'],
  ['string Note="Type = TargetType.Editor;";','Unknown'],
  ['string Note=@"Type = TargetType.Editor;";','Unknown'],
  ['string Note="""Type = TargetType.Editor;""";','Unknown'],
  ["char c='\\\''; Type=TargetType.Game;",'Game'],
  ['string Note="escaped \\"; Type=TargetType.Editor;','Unknown'],
  ['string Note=$"{Get(\"Type=TargetType.Editor;\")}";','Unknown'],
  ['if (b) Type=TargetType.Editor;','Unknown'],
  ['#if EDITOR\nType=TargetType.Editor;\n#endif','Unknown'],
  ['Type=TargetType.Editor; Type=TargetType.Game;','Unknown'],
  ['other . Type=TargetType.Editor;','Unknown'],
  ['Type=GetType();','Unknown'],['Type=TargetType.Future;','Unknown'],['/* unfinished','Unknown']
  ,['public class GameTarget : TargetRules { public GameTarget(TargetInfo Target) : base(Target) { Type = TargetType.Game; } }','Game']
  ,['public class GameTarget : TargetRules { void Helper() { Type = TargetType.Editor; } }','Unknown']
];
for(const [text,expected] of cases) test('target inference '+JSON.stringify(text),async()=>{
  const root=await fs.mkdtemp(path.join(require('./testTemp').root(),'unreal-target-'));
  try {await fs.mkdir(path.join(root,'Source'));await fs.writeFile(path.join(root,'Source/Game.Target.cs'),text);assert.equal((await project.discoverTargets(root))[0].type,expected);}
  finally {await fs.rm(root,{recursive:true,force:true});}
});
