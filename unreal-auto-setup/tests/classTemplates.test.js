const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const templates=require('../classTemplates');
const {classFixture}=require('./classHelpers');
for(const [id,input,expected,stem] of [
  ['object','InventoryItem','UInventoryItem','InventoryItem'],['object','UInventoryItem','UInventoryItem','InventoryItem'],
  ['actor','PickupActor','APickupActor','PickupActor'],['actor','APickupActor','APickupActor','PickupActor'],
  ['actorComponent','InventoryComponent','UInventoryComponent','InventoryComponent'],['interface','IInteractable','UInteractable','Interactable'],
  ['interface','Interactable','UInteractable','Interactable'],['worldSubsystem','SpawnSubsystem','USpawnSubsystem','SpawnSubsystem'],['object','UserProfile','UUserProfile','UserProfile'],['object','UUIWidget','UUIWidget','UIWidget']
]) test('class naming '+id+' / '+input,()=>{const name=templates.names(input,templates.registry.find(type=>type.id===id));assert.equal(name.className,expected);assert.equal(name.header,stem+'.h');assert.equal(name.source,stem+'.cpp');});
test('invalid identifiers, keywords and path traversal are rejected',()=>{
  const type=templates.registry.find(t=>t.id==='object');
  for(const name of ['', ' ', 'bad name','123Thing','../Thing','Dir/Thing','Dir\\Thing','class','struct','UClass__Thing','CON','_Thing']) assert.throws(()=>templates.names(name,type),name);
  assert.throws(()=>templates.names('UObject',type),/base class/);
});
for(const type of templates.registry.filter(t=>t.cpp)) test('minimal UHT template for '+type.label,()=>{
  const name=templates.names('SampleThing',type);const code=templates.render(type,name,'OTHER_MODULE_API','Systems/SampleThing.h','native');
  const includes=code.header.match(/^#include .+$/gm);
  assert.equal(includes.at(-1),'#include "SampleThing.generated.h"');assert.ok(includes.includes('#include "'+type.include+'"'));
  assert.ok(code.header.includes('class OTHER_MODULE_API '+name.className+' : public '+type.base));
  assert.ok(code.header.includes('GENERATED_BODY()'));assert.ok(code.header.includes(type.interface?'UINTERFACE(':'UCLASS('));
  if(type.interface) {assert.ok(code.header.includes('class OTHER_MODULE_API ISampleThing'));assert.equal((code.header.match(/GENERATED_BODY/g)||[]).length,2);}
  assert.ok(code.source.startsWith('#include "Systems/SampleThing.h"'));
  assert.ok(!code.source.includes('BeginPlay'));assert.ok(!code.source.includes('Tick('));assert.ok(!code.source.includes('bCanEverTick = true'));
  if(type.constructor) assert.ok(code.source.includes(name.className+'::'+name.className+'()'));
  else assert.equal(code.source.trim(),'#include "Systems/SampleThing.h"');
});
test('exposure registry generates only allowed Blueprint metadata',()=>{
  for(const type of templates.registry) for(const mode of type.exposures) {
    const code=templates.render(type,templates.names('ExampleThing',type),'GAME_API','ExampleThing.h',mode).header;
    if(mode==='native') assert.ok(!code.includes('BlueprintType'));
    if(mode==='type') {assert.ok(code.includes('BlueprintType'));assert.ok(!code.includes('Blueprintable,'));}
    if(mode==='blueprintable') assert.ok(code.includes('Blueprintable, BlueprintType'));
    if(type.component && mode!=='native') assert.ok(code.includes('BlueprintSpawnableComponent'));
  }
  for(const type of templates.registry.filter(item=>!item.exposures.includes('blueprintable'))) assert.throws(()=>templates.render(type,templates.names('ExampleThing',type),'GAME_API','ExampleThing.h','blueprintable'));
});
for(const split of [false,true]) test('output layout and includes: '+(split?'Public/Private':'flat'),async()=>{
  const f=await classFixture({split:true===split});
  try {
    const plan=templates.plan(f.project,f.module,'actorComponent','InventoryComponent','Inventory/Items','type');
    assert.equal(plan.api,'GAMEPLAY_API');assert.ok(!plan.name.className.includes('Gameplay'));
    assert.equal(plan.files[0].path,path.join(f.module.root,...(split?['Public']:[]),'Inventory','Items','InventoryComponent','InventoryComponent.h'));
    assert.equal(plan.files[1].path,path.join(f.module.root,...(split?['Private']:[]),'Inventory','Items','InventoryComponent','InventoryComponent.cpp'));
    assert.equal(plan.includePath,split?'Inventory/Items/InventoryComponent/InventoryComponent.h':'InventoryComponent.h');assert.equal(plan.missing.length,0);
    assert.throws(()=>templates.plan(f.project,f.module,'object','GoodName','../Escape'));
  } finally {await f.cleanup();}
});
test('missing dependencies are advisory and do not edit Build.cs',async()=>{
  const f=await classFixture({dependencies:['Core']});
  try {const plan=templates.plan(f.project,f.module,'actor','PickupActor');assert.deepEqual(plan.missing,['CoreUObject','Engine']);}
  finally {await f.cleanup();}
});

test('constructor-free templates never emit inherited JavaScript Object constructor',()=>{
  for(const id of ['object','interface','gameInstanceSubsystem','worldSubsystem','engineSubsystem','localPlayerSubsystem']) {
    const type=templates.registry.find(item=>item.id===id);
    const generated=templates.render(type,templates.names('Example',type),'GAMEPLAY_API','Example.h','native');
    assert.equal(generated.source,'#include "Example.h"\n');
    assert.doesNotMatch(generated.header,/public:\n  UExample\(/);
  }
});
