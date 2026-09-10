const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parse,liveCodingConflict}=require('../problemParser');
for(const [title,text,severity,line,column,code] of [
  ['MSVC error','C:\\Project\\File.cpp(123): error C2039: missing member','error',122,0,'C2039'],
  ['MSVC warning','C:\\Project\\File.h(45): warning C4996: deprecated','warning',44,0,'C4996'],
  ['column and spaces','C:\\My Project\\File.cpp(12,8): error C2143: syntax error','error',11,7,'C2143'],
  ['UHT location','C:\\Project\\Source\\Actor.h(19): Error: Unrecognized type Widget','error',18,0,undefined],
  ['clang style','C:\\Project\\Source\\Actor.cpp:22:9: warning: unused parameter','warning',21,8,undefined]
]) test('parses '+title,()=>{const value=parse(text,'C:\\Project');assert.ok(value);assert.equal(value.severity,severity);assert.equal(value.line,line);assert.equal(value.column,column);assert.equal(value.code,code);});
test('ignores informational and malformed diagnostic lines',()=>{for(const text of ['Building 12 actions','Log file: C:\\UE\\Log.txt','C:\\A.cpp(0): error C123: nope','random(123): error: fake','C:\\A.cpp(no): warning: nope']) assert.equal(parse(text,'C:\\Project'),undefined);});
test('identifies Live Coding conflicts without interpreting normal Live Coding logging as failure',()=>{
  assert.equal(liveCodingConflict('Unable to build while Live Coding is active. Exit the editor and game, or press Ctrl+Alt+F11.'),true);
  assert.equal(liveCodingConflict('Live Coding enabled'),false);
});
