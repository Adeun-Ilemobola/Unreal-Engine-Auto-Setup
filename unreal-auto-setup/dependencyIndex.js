"use strict";
const fs=require('node:fs/promises'),path=require('node:path');
const excluded=new Set(['binaries','intermediate','saved','deriveddatacache','.git','node_modules']);
async function scanModules(root,origin='engine',plugin) {
  const result=[];
  async function walk(dir,depth=0,currentPlugin=plugin) {
    if(depth>25) return;
    let entries;try {const stat=await fs.lstat(dir);if(stat.isSymbolicLink()) return;entries=await fs.readdir(dir,{withFileTypes:true});} catch(e) {if(e.code==='ENOENT') return;throw e;}
    const descriptor=entries.find(e=>e.isFile() && e.name.endsWith('.uplugin'));
    if(descriptor) currentPlugin=path.join(dir,descriptor.name);
    const name=path.basename(dir),build=entries.find(e=>e.isFile() && e.name===name+'.Build.cs');
    if(build) {
      const parts=dir.split(path.sep);let type=parts.includes('Editor')?'Editor':parts.includes('Runtime')?'Runtime':undefined;
      if(currentPlugin) try {type=JSON.parse(await fs.readFile(currentPlugin,'utf8')).Modules?.find(m=>m.Name===name)?.Type || type;} catch {}
      result.push({name,root:dir,buildFile:path.join(dir,build.name),origin,plugin:currentPlugin,type});return;
    }
    for(const entry of entries) if(entry.isDirectory() && !excluded.has(entry.name.toLowerCase())) await walk(path.join(dir,entry.name),depth+1,currentPlugin);
  }
  await walk(root);return result;
}
async function headers(modules) {
  const result=[];
  for(const module of modules) {
    async function walk(dir,depth=0) {
      if(depth>25) return;
      let entries;try {entries=await fs.readdir(dir,{withFileTypes:true});} catch(e) {if(e.code==='ENOENT') return;throw e;}
      for(const entry of entries) {
        const filename=path.join(dir,entry.name);
        if(entry.isDirectory() && !excluded.has(entry.name.toLowerCase())) await walk(filename,depth+1);
        else if(entry.isFile() && /\.(h|hpp|inl)$/i.test(entry.name)) {
          const relative=path.relative(module.root,filename).replace(/\\/g,'/'),parts=relative.split('/');
          const visibility=parts[0]==='Private'?'Private':'Public';
          const key=['Public','Classes','Private'].includes(parts[0])?parts.slice(1).join('/'):relative;
          result.push({key,filename,module,visibility});
        }
      }
    }
    await walk(module.root);
  }
  return result;
}
function create({changed=()=>{},scan=scanModules,readHeaders=headers}={}) {
  let engineKey,engineData={modules:[],headers:[]},projectData={modules:[],headers:[]},flight,status='Not indexed',disposed=false,generation=0;
  const memory=new Map();let projectRevision=0;let byKey=new Map(),byPath=new Map();
  function rebuild() {
    byKey=new Map();byPath=new Map();
    for(const header of [...projectData.headers,...engineData.headers]) {
      const entries=byKey.get(header.key) || [];entries.push(header);byKey.set(header.key,entries);
      byPath.set(path.resolve(header.filename).toLowerCase(),header);
    }
  }
  async function engine(root,{force=false}={}) {
    const base=root && (path.basename(root).toLowerCase()==='engine'?root:path.join(root,'Engine'));
    let version;try {version=await fs.readFile(path.join(base,'Build','Build.version'),'utf8');} catch {throw new Error('Select a valid engine path before indexing engine headers.');}
    const key=path.resolve(base)+'\n'+version;
    if(flight) {await flight;if(disposed) return;return engine(root,{force});}
    if(!force && memory.has(key)) {engineKey=key;engineData=memory.get(key);status='Ready (cached)';rebuild();changed();return;}
    const epoch=++generation;engineKey=key;status='Indexing engine modules and headers';changed();
    flight=(async()=>{
      try {const list=[...await scan(path.join(base,'Source')),...await scan(path.join(base,'Plugins'))];const data={modules:list,headers:await readHeaders(list)};if(disposed || epoch!==generation) return;engineData=data;memory.clear();memory.set(key,data);status='Ready';rebuild();changed();}
      catch(error) {status='Index failed: '+error.message;throw error;}
      finally {flight=undefined;}
    })();return flight;
  }
  async function project(list) {const revision=++projectRevision;const data={modules:list,headers:await readHeaders(list)};if(!disposed && revision===projectRevision){projectData=data;rebuild();changed();}}
  function resolve(include,sourceFile) {
    const normalized=include.replace(/\\/g,'/');if(normalized.startsWith('/') || normalized.includes('..')) return [];
    if(sourceFile) {const local=byPath.get(path.resolve(path.dirname(sourceFile),include).toLowerCase());if(local) return [local];}
    return byKey.get(normalized) || [];
  }
  return {engine,project,resolve,allModules:()=>[...projectData.modules,...engineData.modules],info:()=>({status,engine:engineKey?.split('\n')[0],headers:projectData.headers.length+engineData.headers.length}),invalidateEngine(){generation++;engineKey=undefined;engineData={modules:[],headers:[]};memory.clear();status='Not indexed';rebuild();changed();},dispose(){disposed=true;generation++;memory.clear();}};
}
module.exports={scanModules,headers,create};
