const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {mergeMissing,supportedVersion,chooseTarget,writeNew} = require('../core');
test('keeps existing false, numbers, arrays and nested values',()=>{
  const current = {hidden:false,cpp:{indent:4},list:['mine']};
  assert.deepEqual(mergeMissing(current,{hidden:true,cpp:{indent:2,save:true},list:['new']}),{hidden:false,cpp:{indent:4,save:true},list:['mine']});
  assert.deepEqual(current,{hidden:false,cpp:{indent:4},list:['mine']});
});
test('UE 5.8 minimum',()=>{
  assert.equal(supportedVersion(5,7),false);
  assert.equal(supportedVersion(4,99),false);
  assert.equal(supportedVersion(5,8),true);
  assert.equal(supportedVersion(5,10),true);
  assert.equal(supportedVersion(6,0),true);
});
test('does not guess among ambiguous Editor targets',()=>{
  assert.equal(chooseTarget(['CustomEditor.Target.cs'],'Game'),'CustomEditor');
  assert.equal(chooseTarget(['OtherEditor.Target.cs','GameEditor.Target.cs'],'Game'),'GameEditor');
  assert.equal(chooseTarget(['One.Target.cs','Two.Target.cs'],'Game'),undefined);
  assert.equal(chooseTarget([],'Game'),undefined);
});
test('file creation is repeatable and never overwrites project rules',async()=>{
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'ad-unreal-'));
  try {
    const file = path.join(root,'.vscode','test.json');
    assert.equal(await writeNew(file,'existing'),true);
    assert.equal(await writeNew(file,'replacement'),false);
    assert.equal(await fs.readFile(file,'utf8'),'existing');
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});
