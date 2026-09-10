"use strict";
const model=require('./dependencyModel');
function includes(text) {
  // Preserve newlines/columns while removing comments and non-directive strings.
  let cleaned='',i=0;
  while(i<text.length) {
    const raw=/^R"([^ ()\\\t\r\n]{0,16})\(/.exec(text.slice(i));
    if(raw) {const end=text.indexOf(')'+raw[1]+'"',i+raw[0].length);const n=end<0?text.length:end+raw[1].length+2;cleaned+=text.slice(i,n).replace(/[^\r\n]/g,' ');i=n;}
    else if(text.startsWith('//',i)) {const end=text.indexOf('\n',i);const n=end<0?text.length:end;cleaned+=' '.repeat(n-i);i=n;}
    else if(text.startsWith('/*',i)) {const end=text.indexOf('*/',i+2),n=end<0?text.length:end+2;cleaned+=text.slice(i,n).replace(/[^\r\n]/g,' ');i=n;}
    else if(text[i]==='"' || text[i]==="'") {
      const start=i,quote=text[i++];while(i<text.length){if(text[i]==='\\'){i+=2;continue;}if(text[i++]===quote)break;}
      // Keep quoted strings only on an actual preprocessor include line.
      const prefix=cleaned.slice(cleaned.lastIndexOf('\n')+1);
      cleaned+=/^\s*#\s*include\s*$/.test(prefix)?text.slice(start,i):text.slice(start,i).replace(/[^\r\n]/g,' ');
    } else cleaned+=text[i++];
  }
  const found=[];let offset=0;
  for(const [line,text] of cleaned.split('\n').entries()) {const match=/^\s*#\s*include\s*["<]([^">]+)[">]/.exec(text);if(match) found.push({include:match[1],line,start:offset+match.index,column:text.indexOf(match[1])});offset+=text.length+1;}
  return found;
}
function analyze(text,filename,module,parsed,index) {
  if(!parsed.editable) return []; // Conditional/computed lists cannot establish confident absence.
  const results=[];
  for(const entry of includes(text)) {
    const matches=index.resolve(entry.include,filename);if(matches.length!==1) continue;
    const owner=matches[0];if(owner.module.name===module.name || owner.visibility==='Private') continue;
    if(model.dependencies(parsed).some(d=>d.name===owner.module.name)) continue;
    results.push({...entry,module,target:owner.module,recommendation:model.recommendation(module,filename),message:'Header belongs to module "'+owner.module.name+'", but '+module.name+' does not declare that module as a dependency.'});
  }
  return results;
}
function register(vscode,context,service,applyAction) {
  if(!vscode.languages?.registerCodeActionsProvider) return {refresh(){},dispose(){}};
  const collection=vscode.languages.createDiagnosticCollection('unreal-dependencies');let timer,disposed=false,records=new Map(),revision=0;
  async function refresh() {
    if(disposed) return;const version=++revision,next=new Map();collection.clear();
    for(const doc of vscode.workspace.textDocuments) {
      if(doc.uri.scheme!=='file' || !/\.(h|hpp|cpp|inl)$/i.test(doc.uri.fsPath)) continue;
      const module=service.containing(doc.uri.fsPath);if(!module) continue;
      const parsed=await service.parsed(module),findings=analyze(doc.getText(),doc.uri.fsPath,module,parsed,service.index);
      const compiler=vscode.languages.getDiagnostics?.(doc.uri) || [];
      const safe=findings.filter(f=>!compiler.some(d=>d.source==='UnrealBuildTool' && d.range.start.line===f.line));
      if(disposed || version!==revision) return;
      next.set(doc.uri.toString(),safe);collection.set(doc.uri,safe.map(f=>{const d=new vscode.Diagnostic(new vscode.Range(f.line,f.column,f.line,f.column+f.include.length),f.message,vscode.DiagnosticSeverity.Information);d.source='Unreal Dependencies';d.code=f.target.name;return d;}));
    }
    records=next;
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>{void refresh().catch(()=>{});},250);timer.unref?.();}
  const provider={provideCodeActions(doc,range){const fixes=[];
    for(const f of records.get(doc.uri.toString()) || []) if(f.line>=range.start.line && f.line<=range.end.line) {
      if(model.relationship(f.module,f.target).blocked) continue;
      for(const visibility of [f.recommendation.visibility,f.recommendation.visibility==='Public'?'Private':'Public']) {
        const action=new vscode.CodeAction('Add "'+f.target.name+'" as '+visibility+' Unreal dependency',vscode.CodeActionKind.QuickFix);
        action.isPreferred=visibility===f.recommendation.visibility;action.command={title:action.title,command:'unrealSetup.applyDependency',arguments:[{source:f.module.buildFile,target:f.target.buildFile,visibility}]};fixes.push(action);
      }
    }return fixes;
  }};
  context.subscriptions.push(collection,vscode.languages.registerCodeActionsProvider([{language:'cpp',scheme:'file'}],provider,{providedCodeActionKinds:[vscode.CodeActionKind.QuickFix]}));
  for(const event of ['onDidOpenTextDocument','onDidChangeTextDocument','onDidCloseTextDocument']) if(vscode.workspace[event]) context.subscriptions.push(vscode.workspace[event](schedule));
  const api={refresh:schedule,refreshNow:refresh,provider,dispose(){disposed=true;revision++;clearTimeout(timer);collection.clear();}};context.subscriptions.push(api);return api;
}
module.exports={includes,analyze,register};
