'use strict';
const path=require('node:path');
function isMetadata(filename) {return /(?:\.Build\.cs|\.Target\.cs|\.uproject|\.uplugin)$/i.test(filename);}
function createState() {
  const values=new Map();
  const get=filename=>{if(!values.has(filename)) values.set(filename,{revision:0,stale:false});return values.get(filename);};
  return {get,peek:filename=>values.get(filename),mark(project,filename) {
    const relative=path.relative(project.root,filename);
    if(relative.startsWith('..'+path.sep) || path.isAbsolute(relative) || !isMetadata(filename)) return false;
    if(/\.uproject$/i.test(filename) && path.resolve(filename)!==path.resolve(project.filename)) return false;
    const item=get(project.filename);item.revision++;item.stale=true;return true;
  },generated(filename,revision,success) {const item=get(filename);if(success && item.revision===revision) item.stale=false;}};
}
module.exports={isMetadata,createState};
