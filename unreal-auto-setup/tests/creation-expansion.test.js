'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const templates=require('../classTemplates'),{wizard}=require('../classWizard'),{classFixture}=require('./classHelpers');
for(const type of templates.registry)test('Explorer creates '+type.label+' through shared safe writer',async()=>{
 const f=await classFixture({split:true});
 try {
 const folder=path.join(f.module.publicPath,'Nested');await fs.mkdir(folder);let picks=0,preview,opened;
 f.vscode.window.showQuickPick=async choices=>{picks++;assert.deepEqual(choices.map(c=>c.type.id),templates.registry.map(t=>t.id));return choices.find(c=>c.type.id===type.id);};
 f.vscode.window.showInputBox=async()=>type.prefix+'QualifiedItem';
 f.vscode.window.showInformationMessage=async(message,options,...actions)=>{if(options?.modal){preview=options.detail;return 'Create Class';}if(!type.cpp)assert.ok(![options,...actions].includes('Open Source Beside Header'));};
 f.vscode.workspace.openTextDocument=async uri=>({uri});f.vscode.window.showTextDocument=async doc=>{opened=doc.uri.fsPath;};
 const plan=await wizard(f.vscode,f.context,{}, {uri:f.vscode.Uri.file(folder)});
 assert.equal(picks,1);assert.equal(plan.files.length,type.cpp?2:1);assert.equal(plan.name.className,type.prefix+'QualifiedItem');assert.equal(opened,plan.files[0].path);assert.match(preview,/QualifiedItem/);
 assert.equal(plan.files[0].path,path.join(folder,'QualifiedItem','QualifiedItem.h'));
 const header=await fs.readFile(plan.files[0].path,'utf8');assert.equal(header.match(/^#include.*$/gm).at(-1),'#include "QualifiedItem.generated.h"');
 if(type.kind==='enum'){assert.match(header,/UENUM\(\)\nenum class EQualifiedItem : uint8/);assert.doesNotMatch(header,/GENERATED_BODY/);}
 else {assert.match(header,/GAMEPLAY_API/);assert.match(header,/GENERATED_BODY\(\)/);}
 if(type.kind==='struct')assert.match(header,/USTRUCT\(\)\nstruct GAMEPLAY_API FQualifiedItem/);
 if(type.interface)assert.match(header,/class GAMEPLAY_API IQualifiedItem/);
 if(type.cpp){assert.equal(plan.files[1].path,path.join(f.module.privatePath,'Nested','QualifiedItem','QualifiedItem.cpp'));assert.match(plan.files[1].text,/#include "Nested\/QualifiedItem\/QualifiedItem.h"/);}
 assert.equal(templates.names('QualifiedItem',type).className,plan.name.className);
 await assert.rejects(require('../classFiles').create(plan,f.vscode),/already exists/);
 }finally{await f.cleanup();}
});
test('native snippets are packaged and omit generated-header insertion',()=>{
 const manifest=require('../package.json');assert.deepEqual(manifest.contributes.snippets,[{language:'cpp',path:'./snippets/unreal.json'}]);
 const snippets=require('../snippets/unreal.json');assert.deepEqual(Object.values(snippets).map(s=>s.prefix),['ustruct','uenum','uproperty','ufunction']);
 for(const s of Object.values(snippets)){assert.ok(s.body.join('\n').includes('$'));assert.ok(!s.body.join('\n').includes('#include'));}
});
