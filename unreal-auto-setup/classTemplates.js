'use strict';
const path=require('node:path');
const {apiMacro}=require('./modules');
const exposureModes={native:{label:'Native only',description:'Adds no Blueprint exposure; base-class inherited flags may remain.'},type:{label:'Blueprint Type',description:'Allows values of this type in Blueprint.'},blueprintable:{label:'Blueprintable',description:'Allows Blueprint subclasses and Blueprint values.'}};
const registry=[
  {id:'object',label:'UObject',prefix:'U',base:'UObject',include:'UObject/Object.h',exposures:['native','type','blueprintable'],dependencies:['Core','CoreUObject']},
  {id:'actor',label:'Actor',prefix:'A',base:'AActor',include:'GameFramework/Actor.h',constructor:'PrimaryActorTick.bCanEverTick = false;',exposures:['native','type','blueprintable']},
  {id:'actorComponent',label:'Actor Component',prefix:'U',base:'UActorComponent',include:'Components/ActorComponent.h',constructor:'PrimaryComponentTick.bCanEverTick = false;',component:true,exposures:['native','type','blueprintable']},
  {id:'sceneComponent',label:'Scene Component',prefix:'U',base:'USceneComponent',include:'Components/SceneComponent.h',constructor:'PrimaryComponentTick.bCanEverTick = false;',component:true,exposures:['native','type','blueprintable']},
  {id:'interface',label:'Unreal Interface',prefix:'U',base:'UInterface',include:'UObject/Interface.h',interface:true,exposures:['native','type'],dependencies:['Core','CoreUObject']},
  {id:'gameInstanceSubsystem',label:'Game Instance Subsystem',prefix:'U',base:'UGameInstanceSubsystem',include:'Subsystems/GameInstanceSubsystem.h',exposures:['native','type']},
  {id:'worldSubsystem',label:'World Subsystem',prefix:'U',base:'UWorldSubsystem',include:'Subsystems/WorldSubsystem.h',exposures:['native','type']},
  {id:'engineSubsystem',label:'Engine Subsystem',prefix:'U',base:'UEngineSubsystem',include:'Subsystems/EngineSubsystem.h',exposures:['native','type']},
  {id:'localPlayerSubsystem',label:'Local Player Subsystem',prefix:'U',base:'ULocalPlayerSubsystem',include:'Subsystems/LocalPlayerSubsystem.h',exposures:['native','type']}
].map(type=>({constructor:undefined,cpp:true,dependencies:['Core','CoreUObject','Engine'],...type})).map(type=>({...type,requiredDependencies:type.dependencies.map(name=>({name,preferredVisibility:'Public'}))}));
const keywords=new Set(('alignas alignof and and_eq asm atomic_cancel atomic_commit atomic_noexcept auto bitand bitor bool break case catch char char8_t char16_t char32_t class compl concept const consteval constexpr constinit const_cast continue co_await co_return co_yield decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept not not_eq nullptr operator or or_eq private protected public reflexpr register reinterpret_cast requires return short signed sizeof static static_assert static_cast struct switch synchronized template this thread_local throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while xor xor_eq').split(' '));
const deviceName=value=>/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(value);
function names(input,type) {
  if(typeof input!=='string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(input) || input.includes('__') || input.length>100 || keywords.has(input)) throw new Error('Use a C++ identifier starting with a letter, without spaces, paths, keywords or double underscores (100 characters maximum).');
  const prefixes=type.interface?['U','I']:[type.prefix];
  const explicit=prefixes.some(prefix=>input.startsWith(prefix) && /^[A-Z]/.test(input.slice(1)));
  const stem=explicit?input.slice(1):input;
  if(!explicit && /^[AUFI][A-Z]/.test(input) && !prefixes.includes(input[0])) throw new Error('Use the '+type.prefix+' prefix for this type, or an unprefixed name.');
  if(keywords.has(stem) || deviceName(stem)) throw new Error('This name is reserved by C++ or Windows.');
  const className=type.prefix+stem;
  if(registry.some(item=>item.base===className) || className==='IInterface') throw new Error('Choose a name different from an existing Unreal base class.');
  return {stem,className,interfaceName:type.interface?'I'+stem:undefined,header:stem+'.h',source:stem+'.cpp'};
}
function subfolder(value) {
  if(!value) return '';
  if(typeof value!=='string' || /^(?:[\\/]|[A-Za-z]:)/.test(value)) throw new Error('Choose a relative module subfolder.');
  const parts=value.replace(/\\/g,'/').split('/');
  if(parts.some(part=>!/^[A-Za-z0-9_-]+$/.test(part) || deviceName(part))) throw new Error('Use folder names containing letters, digits, underscores or hyphens; no traversal or reserved names.');
  return parts.join('/');
}
function render(type,name,api,includePath,exposure) {
  if(!type.exposures.includes(exposure)) throw new Error('Unsupported Blueprint exposure for '+type.label+'.');
  let metadata=exposure==='native'?'':exposure==='type'?'BlueprintType':'Blueprintable, BlueprintType';
  if(type.component && exposure!=='native') metadata+=(metadata?', ':'')+'meta=(BlueprintSpawnableComponent)';
  if(type.interface) metadata+=(metadata?', ':'')+'meta=(CannotImplementInterfaceInBlueprint)';
  const includes='#pragma once\n\n#include "CoreMinimal.h"\n#include "'+type.include+'"\n#include "'+name.stem+'.generated.h"\n\n';
  let header=includes+(type.interface?'UINTERFACE':'UCLASS')+'('+metadata+')\nclass '+api+' '+name.className+' : public '+type.base+'\n{\n  GENERATED_BODY()\n';
  if(type.constructor) header+='\npublic:\n  '+name.className+'();\n';
  header+='};\n';
  if(type.interface) header+='\nclass '+api+' '+name.interfaceName+'\n{\n  GENERATED_BODY()\n\npublic:\n  // Declare native interface functions here.\n};\n';
  let source='#include "'+includePath+'"\n';
  if(type.constructor) source+='\n'+name.className+'::'+name.className+'()\n{\n  '+type.constructor+'\n}\n';
  return {header,source};
}
function plan(project,module,typeId,input,folder='',exposure='native') {
  const type=registry.find(item=>item.id===typeId);if(!type) throw new Error('Unknown Unreal class type.');
  const name=names(input,type),logical=subfolder(folder),api=apiMacro(module.name);
  const split=module.publicPath && module.privatePath;
  const flatBase=module.privatePath || module.publicPath || module.root;
  const headerBase=split?module.publicPath:flatBase,sourceBase=split?module.privatePath:flatBase;
  const headerPath=path.join(headerBase,logical,name.header),sourcePath=path.join(sourceBase,logical,name.source);
  // Flat modules may disable Unreal's legacy module-root include search. A colocated header is always resolvable.
  const includePath=module.publicPath || module.privatePath ? [logical,name.header].filter(Boolean).join('/') : name.header;
  const text=render(type,name,api,includePath,exposure);
  const dependencyStatus=require('./dependencyModel').required(require('./buildCsParser').parse(module.ruleText,module.name),type.requiredDependencies);
  const missing=dependencyStatus.filter(item=>item.status!=='Present').map(item=>item.name);
  return {project,module,type,name,api,exposure,logical,includePath,missing,dependencyStatus,files:[{path:headerPath,text:text.header},{path:sourcePath,text:text.source}]};
}
module.exports={keywords,deviceName,registry,exposureModes,names,subfolder,render,plan};
