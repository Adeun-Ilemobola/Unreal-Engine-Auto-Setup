const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const generation=require('../generation');
const {fixture}=require('./helpers');
const {createState}=require('../runtime');

// Original assertion retained: a newer saved descriptor must survive generation.
test('P1.1: regeneration must preserve a newer saved descriptor edit', async()=>{
  const f=await fixture();
  try {
    const project={root:f.root,filename:path.join(f.root,'Game.uproject')};
    const newer='{"EngineAssociation":"5.8","Description":"concurrent saved user edit"}';
    await generation.run(project,f.root,f.vscode,createState(),{run:()=>({done:(async()=>{
      await fs.writeFile(project.filename,newer);return {success:true,status:'Succeeded'};
    })()})},{storageRoot:path.join(f.root,'.recovery')});
    assert.equal(await fs.readFile(project.filename,'utf8'),newer);
  } finally {await f.cleanup();}
});
