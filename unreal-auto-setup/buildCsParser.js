"use strict";
const categories=['PublicDependencyModuleNames','PrivateDependencyModuleNames','DynamicallyLoadedModuleNames','PublicIncludePathModuleNames','PrivateIncludePathModuleNames'];
function tokenize(text) {
  const tokens=[];let i=0;
  while(i<text.length) {
    if(/\s|\uFEFF/.test(text[i])) {i++;continue;}
    if(text.startsWith('//',i)) {const end=text.indexOf('\n',i);i=end<0?text.length:end;continue;}
    if(text.startsWith('/*',i)) {const end=text.indexOf('*/',i+2);if(end<0) throw new Error('Unclosed comment');i=end+2;continue;}
    const start=i;
    if(text[i]==='"' || text[i]==="'" || text.startsWith('@"',i) || text.startsWith('$"',i) || text.startsWith('$@"',i) || text.startsWith('@$"',i)) {
      const prefix=/^(?:\$@|@\$|@|\$)?["']/.exec(text.slice(i))[0];const quote=prefix.at(-1),verbatim=prefix.includes('@');i+=prefix.length;
      let closed=false;
      while(i<text.length) {
        if(text[i]===quote) {if(verbatim && text[i+1]===quote){i+=2;continue;}i++;closed=true;break;}
        if(text[i]==='\\' && !verbatim) i+=2;else i++;
      }
      if(!closed) throw new Error('Unclosed string');
      const raw=text.slice(start,i);tokens.push({start,end:i,value:raw,kind:'string',literal:prefix==='"' && /^"[A-Za-z][A-Za-z0-9_]*"$/.test(raw)?raw.slice(1,-1):undefined});continue;
    }
    if(/[A-Za-z_]/.test(text[i])) {while(i<text.length && /[A-Za-z0-9_]/.test(text[i])) i++;tokens.push({start,end:i,value:text.slice(start,i),kind:'id'});continue;}
    i++;tokens.push({start,end:i,value:text[start],kind:'punct'});
  }
  const stack=[];
  for(let n=0;n<tokens.length;n++) {
    const t=tokens[n];if(t.kind==='string') continue;
    if(['{','[','('].includes(t.value)) stack.push(n);
    if(['}',']',')'].includes(t.value)) {const open=stack.pop();if(open===undefined || {'}':'{',']':'[',')':'('}[t.value]!==tokens[open].value) throw new Error('Unbalanced delimiters');tokens[open].close=n;t.open=open;}
  }
  if(stack.length) throw new Error('Unbalanced delimiters');return tokens;
}
function parse(text,moduleName) {
  const result={text,moduleName,dependencies:[],declarations:[],editable:false,status:'Complex / Read Only',reasons:[],tokens:[]};
  let t;try {t=tokenize(text);result.tokens=t;} catch(error) {result.status='Malformed';result.reasons=[error.message];return result;}
  const v=i=>t[i]?.value,match=(i,values)=>values.every((value,n)=>v(i+n)===value);
  // Extract only direct category calls; strings/comments and other-object calls cannot masquerade as declarations.
  for(let i=0;i<t.length;i++) if(categories.includes(v(i)) && (v(i-1)!=='.' || (v(i-2)==='this' && v(i-3)!=='.')) && match(i+1,['.']) && ['Add','AddRange'].includes(v(i+2)) && v(i+3)==='(') {
    const end=t[i+3].close;if(end===undefined) continue;
    const args=t.slice(i+4,end);let list=args,open,close;
    if(v(i+2)==='AddRange') {
      const values=args.map(a=>a.value);let offset;
      if(values[0]==='[') offset=0;
      else if(values.slice(0,4).join(' ')==='new string [ ]' && values[4]==='{') offset=4;
      else if(values.slice(0,3).join(' ')==='new [ ]' && values[3]==='{') offset=3;
      if(offset!==undefined) {open=args[offset];close=t[open.close];if(close===args.at(-1)) list=t.slice(t.indexOf(open)+1,open.close);else list=undefined;} else list=undefined;
    }
    let valid=!!list;
    if(list) for(let n=0;n<list.length;n++) if(n%2===0?!list[n].literal:list[n].value!==',') valid=false;
    if(v(i+2)==='Add' && list?.length!==1) valid=false;
    if(v(end+1)!==';') valid=false;
    const declaration={category:v(i),method:v(i+2),start:t[v(i-1)==='.'?i-2:i].start,end:t[end+1]?.end || t[end].end,tokenStart:v(i-1)==='.'?i-2:i,tokenEnd:end+1,valid,open,close,entries:[]};
    if(valid) for(const token of list.filter(token=>token.literal)) {
      const dep={name:token.literal,category:v(i),visibility:v(i).startsWith('PublicDependency')?'Public':v(i).startsWith('PrivateDependency')?'Private':'Read Only',start:token.start,end:token.end,line:text.slice(0,token.start).split('\n').length,declaration,editable:false};
      declaration.entries.push(dep);result.dependencies.push(dep);
    }
    result.declarations.push(declaration);
  }
  let i=0;
  while(v(i)==='using') {let end=i+1;while(end<t.length && v(end)!==';') end++;if(end===t.length) break;const ns=t.slice(i+1,end).map(t=>t.value).join('');if(!['UnrealBuildTool','System','System.Collections.Generic','System.IO'].includes(ns)){result.reasons.push('Unsupported using/alias declaration.');return result;}i=end+1;}
  if(v(i)==='public') i++;
  if(!match(i,['class',moduleName,':','ModuleRules','{'])) {result.reasons.push('Only a conventional ModuleRules class is supported.');return result;}
  const classOpen=i+4,classClose=t[classOpen].close;i=classOpen+1;
  if(!match(i,['public',moduleName,'(','ReadOnlyTargetRules']) || t[i+4]?.kind!=='id' || !match(i+5,[')',':','base','(',v(i+4),')','{'])) {result.reasons.push('No supported ModuleRules constructor/insertion point.');return result;}
  const ctor=i+11,end=t[ctor].close;result.constructor={open:t[ctor],close:t[end]};
  if(end+1!==classClose || classClose!==t.length-1) result.reasons.push('Additional methods, fields or unsupported class structure.');
  i=ctor+1;
  while(i<end) {
    const declaration=result.declarations.find(d=>d.tokenStart===i);
    if(declaration?.valid) {i=declaration.tokenEnd+1;continue;}
    // One known non-dependency assignment emitted by our module generator.
    if(v(i)==='PCHUsage' && v(i+1)==='=') {
      let n=i+2;while(n<end && v(n)!==';') n++;
      if(['PCHUsageMode.UseExplicitOrSharedPCHs','ModuleRules.PCHUsageMode.UseExplicitOrSharedPCHs'].includes(t.slice(i+2,n).map(x=>x.value).join(''))) {i=n+1;continue;}
    }
    result.reasons.push('Conditional, computed, helper-based or unsupported constructor code.');break;
  }
  const names=new Set();
  for(const dep of result.dependencies.filter(d=>d.visibility!=='Read Only')) {const key=dep.name.toLowerCase();if(names.has(key)) result.reasons.push('Duplicate or contradictory dependency: '+dep.name);names.add(key);}
  result.editable=result.reasons.length===0;result.status=result.editable?'Editable':'Complex / Read Only';
  for(const dep of result.dependencies) {dep.editable=result.editable && dep.visibility!=='Read Only';dep.complex=!result.editable;}
  return result;
}
module.exports={categories,tokenize,parse};
