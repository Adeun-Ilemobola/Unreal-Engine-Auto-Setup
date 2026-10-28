"use strict";
const path=require('node:path');
const modules=require('./modules');
const classes=require('./classTemplates');
const types=['Runtime','RuntimeNoCommandlet','Developer','Editor','EditorNoCommandlet','Program'];
// Verified in UE 5.8.1 Runtime/Projects/Public/ModuleDescriptor.h.
const phases=['Default','PreDefault','PostDefault','PostEngineInit','PostConfigInit','PostSplashScreen','PreEarlyLoadingScreen','PreLoadingScreen','EarliestPossible','None'];
const csharpKeywords=new Set('abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while ModuleRules ReadOnlyTargetRules'.split(' '));
function validateName(value) {
  modules.apiMacro(value);
  if(value.length>90 || classes.keywords.has(value) || csharpKeywords.has(value) || classes.deviceName(value)) throw new Error('Reserved or overly long module/plugin name.');
  return value;
}
function render(root,moduleName,type='Runtime',layout='Public / Private',phase='Default') {
  validateName(moduleName);
  if(!types.includes(type) || !phases.includes(phase) || !['Public / Private','Flat'].includes(layout)) throw new Error('Unsupported module type, loading phase or layout.');
  const api=modules.apiMacro(moduleName),split=layout==='Public / Private';
  const dependencies=type==='Program'?['Core']:['Core','CoreUObject','Engine'];
  const rules='using UnrealBuildTool;\n\npublic class '+moduleName+' : ModuleRules\n{\n  public '+moduleName+'(ReadOnlyTargetRules Target) : base(Target)\n  {\n    PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;\n    PublicDependencyModuleNames.AddRange(new string[] { '+dependencies.map(d=>'"'+d+'"').join(', ')+' });\n  }\n}\n';
  const header='#pragma once\n\n#include "Modules/ModuleInterface.h"\n\nclass '+api+' F'+moduleName+'Module : public IModuleInterface\n{\n};\n';
  const source='#include "'+moduleName+'.h"\n#include "Modules/ModuleManager.h"\n\nIMPLEMENT_MODULE(F'+moduleName+'Module, '+moduleName+')\n';
  return {name:moduleName,type,layout,phase,api,root,entry:{Name:moduleName,Type:type,LoadingPhase:phase},files:[{path:path.join(root,moduleName+'.Build.cs'),text:rules},{path:path.join(root,...(split?['Public']:[]),moduleName+'.h'),text:header},{path:path.join(root,...(split?['Private']:[]),moduleName+'.cpp'),text:source}]};
}
// Retain the positional name argument for existing template callers; FriendlyName is independent.
function pluginDescriptor(_pluginName,friendly,description,module) {
  if(!friendly.trim() || friendly.length>120 || description.length>2000) throw new Error('Provide a friendly name (up to 120 characters) and description up to 2000 characters.');
  return JSON.stringify({FileVersion:3,Version:1,VersionName:'1.0',FriendlyName:friendly,Description:description,Category:'Other',CanContainContent:false,EnabledByDefault:true,Modules:[module.entry]},null,2)+'\n';
}
module.exports={types,phases,validateName,render,pluginDescriptor};
