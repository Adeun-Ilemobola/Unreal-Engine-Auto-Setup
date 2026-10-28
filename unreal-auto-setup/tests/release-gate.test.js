'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {nodeSuite}=require('../../tools/validate-release.cjs');
for(const output of ['generation uses the active engine/project and restores existing VS Code configuration\nfail 1','generation uses the active engine/project and restores existing VS Code configuration\nfail 10','pass 482\nfail 1\nunrelated failure',''])test('strict release rejects nonzero test exit '+JSON.stringify(output),()=>{
 const error=Object.assign(new Error('exit 1'),{status:1,stdout:output});assert.throws(()=>nodeSuite(()=>{throw error;}),e=>e===error);
});
test('strict gate accepts successful test process',()=>assert.equal(nodeSuite(()=> 'all passed'),'all passed'));
