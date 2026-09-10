"use strict";
const path=require('node:path'),parser=require('./buildCsParser');
function dependencies(model) {return model.dependencies.filter(d=>d.visibility!=='Read Only');}
function recommendation(module,filename) {
  const relative=filename?path.relative(module.root,filename).replace(/\\/g,'/'):'';
  if(/\.cpp$/i.test(relative) || relative.startsWith('Private/')) return {visibility:'Private',reason:'Implementation or Private header usage.'};
  if(relative.startsWith('Public/')) return {visibility:'Public',reason:'Included by an exposed Public header.'};
  return {visibility:'Public',reason:'Flat/unknown API boundary; Public is conservative. Review and override if implementation-only.'};
}
function relationship(source,target) {
  if(source.name.toLowerCase()===target.name.toLowerCase()) return {blocked:'Self-dependencies are not allowed.'};
  if((!source.type || /^Runtime/.test(source.type)) && /^Editor/.test(target.type || '')) return {blocked:'An unconditional Runtime -> Editor dependency is unsafe. No conditional code will be generated.'};
  return {warning:source.plugin && (source.plugin!==target.plugin || source.origin!==target.origin)?'This cross-plugin/project relationship may require plugin descriptor configuration. No descriptor will be edited.':target.plugin?'This module belongs to a plugin; check project/plugin enablement and descriptor relationships.':undefined};
}
function graph(modules,models,known=modules) {
  const edges=[],warnings=[],names=new Map(known.map(m=>[m.name.toLowerCase(),m])),local=new Set(modules.map(m=>m.name.toLowerCase()));
  for(const source of modules) {
    const seen=new Set();for(const dep of dependencies(models.get(source.buildFile) || parser.parse(source.ruleText,source.name))) {
      const key=dep.name.toLowerCase(),target=names.get(key);edges.push({from:source.name,to:dep.name,visibility:dep.visibility});
      if(seen.has(key)) warnings.push(source.name+': duplicate '+dep.name);seen.add(key);
      if(!target) warnings.push(source.name+': '+dep.name+' not in the current module index (may require indexing).');
      else {const check=relationship(source,target);if(check.blocked) warnings.push(source.name+': '+check.blocked);else if(check.warning) warnings.push(source.name+': '+check.warning);}
    }
  }
  const visited=new Set(),active=[],cycles=new Set();
  function visit(name) {
    const position=active.indexOf(name);if(position>=0) {cycles.add(active.slice(position).concat(name).join(' -> '));return;}
    if(visited.has(name)) return;active.push(name);
    for(const edge of edges.filter(e=>e.from.toLowerCase()===name)) if(local.has(edge.to.toLowerCase())) visit(edge.to.toLowerCase());
    active.pop();visited.add(name);
  }
  for(const name of local) visit(name);
  for(const cycle of cycles) warnings.push('Suspicious cycle: '+cycle);
  return {edges,warnings,cycles:[...cycles]};
}
function required(model,items) {
  return items.map(item=>{const name=typeof item==='string'?item:item.name;return {name,status:!model.editable?'Unknown / review complex rules':dependencies(model).some(d=>d.name===name)?'Present':'Missing',visibility:typeof item==='string'?'Public':item.preferredVisibility || 'Public'};});
}
module.exports={dependencies,recommendation,relationship,graph,required};
