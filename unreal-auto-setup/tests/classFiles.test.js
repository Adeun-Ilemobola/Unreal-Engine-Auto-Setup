const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const files=require('../classFiles');
const templates=require('../classTemplates');
const {classFixture}=require('./classHelpers');
test('creates both files exclusively and leaves module rules unchanged',async()=>{
  const f=await classFixture({split:true});
  try {
    const before=await fs.readFile(f.module.buildFile,'utf8'),plan=templates.plan(f.project,f.module,'actor','PickupActor','Items');
    assert.equal((await files.create(plan,f.vscode)).length,2);
    for(const file of plan.files) assert.equal(await fs.readFile(file.path,'utf8'),file.text);
    assert.equal(await fs.readFile(f.module.buildFile,'utf8'),before);
    await assert.rejects(files.create(plan,f.vscode),/already exists/);
  } finally {await f.cleanup();}
});
for(const index of [0,1]) test((index?'source':'header')+' collision leaves both destinations untouched',async()=>{
  const f=await classFixture();
  try {
    const plan=templates.plan(f.project,f.module,'object','InventoryItem');await fs.mkdir(path.dirname(plan.files[index].path),{recursive:true});await fs.writeFile(plan.files[index].path,'keep me');
    await assert.rejects(files.create(plan,f.vscode),/already exists/);
    assert.equal(await fs.readFile(plan.files[index].path,'utf8'),'keep me');await assert.rejects(fs.stat(plan.files[1-index].path),{code:'ENOENT'});
  } finally {await f.cleanup();}
});
test('second write failure rolls back the owned header, source and newly created folders',async()=>{
  const f=await classFixture({split:true});
  try {
    const plan=templates.plan(f.project,f.module,'object','InventoryItem','Systems');let opened=0;
    const io={...fs,open:async(...args)=>{
      const handle=await fs.open(...args);opened++;
      if(opened===2) {const write=handle.writeFile.bind(handle);handle.writeFile=async()=>{await write('partial');throw new Error('disk failure');};}
      return handle;
    }};
    await assert.rejects(files.create(plan,f.vscode,{io}),/disk failure/);
    for(const file of plan.files) await assert.rejects(fs.stat(file.path),{code:'ENOENT'});
    await assert.rejects(fs.stat(path.dirname(plan.files[0].path)),{code:'ENOENT'});
    assert.equal((await fs.stat(f.module.publicPath)).isDirectory(),true);
  } finally {await f.cleanup();}
});
test('symlink, traversal, dirty documents and lost trust block class creation',async()=>{
  const f=await classFixture();
  try {
    const plan=templates.plan(f.project,f.module,'object','InventoryItem','Systems');
    f.vscode.workspace.isTrusted=false;await assert.rejects(files.create(plan,f.vscode),/Trust/);f.vscode.workspace.isTrusted=true;
    f.vscode.workspace.textDocuments=[{uri:{fsPath:f.module.buildFile},isDirty:true}];await assert.rejects(files.create(plan,f.vscode),/unsaved/);f.vscode.workspace.textDocuments=[];
    await assert.rejects(files.create({...plan,files:[{...plan.files[0],path:path.join(f.root,'Outside.h')},plan.files[1]]},f.vscode),/Invalid class destination/);
    await fs.mkdir(path.join(f.root,'Elsewhere'));await fs.symlink(path.join(f.root,'Elsewhere'),path.join(f.module.root,'Systems'),process.platform==='win32'?'junction':'dir');
    await assert.rejects(files.create(plan,f.vscode),/symbolic link/);
    assert.deepEqual(await fs.readdir(path.join(f.root,'Elsewhere')),[]);
  } finally {await f.cleanup();}
});
test('post-preview module changes and case-insensitive conflicts are rejected',async()=>{
  const f=await classFixture();
  try {
    const plan=templates.plan(f.project,f.module,'object','InventoryItem');
    const collision=path.join(path.dirname(plan.files[0].path),'inventoryitem.h');await fs.mkdir(path.dirname(collision),{recursive:true});await fs.writeFile(collision,'existing');await assert.rejects(files.create(plan,f.vscode),/already exists/);
    await fs.unlink(collision);await fs.appendFile(f.module.buildFile,'// changed');
    await assert.rejects(files.create(plan,f.vscode),/changed/);
  } finally {await f.cleanup();}
});
test('a file appearing during creation is retained while the owned header is rolled back',async()=>{
  const f=await classFixture();
  try {
    const plan=templates.plan(f.project,f.module,'object','InventoryItem');let count=0;
    const io={...fs,open:async(...args)=>{if(++count===2) await fs.writeFile(args[0],'concurrent file');return fs.open(...args);}};
    await assert.rejects(files.create(plan,f.vscode,{io}),{code:'EEXIST'});
    await assert.rejects(fs.stat(plan.files[0].path),{code:'ENOENT'});assert.equal(await fs.readFile(plan.files[1].path,'utf8'),'concurrent file');
  } finally {await f.cleanup();}
});
