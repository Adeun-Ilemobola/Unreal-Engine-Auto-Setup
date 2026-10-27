'use strict';
// No remote trigger is exposed: UE's Compile API and console commands execute inside Editor.
function capability(editor) {return {support:'Unsupported',canTriggerExternally:false,state:editor?.state==='Stopped'?'Unavailable':'Unknown',detail:'No validated external Live Coding trigger. Editor session enablement is not inferred from saved settings.'};}
function resolve(editor,changes=[]) {
  const liveCoding=capability(editor);
  if(editor?.state==='Stopped') return {allowed:true,name:'External UBT',liveCoding};
  return {allowed:false,name:'Restart required',liveCoding,reason:editor?.state==='Running'?
    'Close this project’s Unreal Editor before an external build. '+(changes.some(c=>c.kind!=='Implementation')?'Header/structural changes require conservative rebuild handling. ':'')+'Live Coding can be invoked inside Unreal Editor; external triggering is unsupported.':
    'Editor state is unknown. Restore process detection before building to avoid a Live Coding or loaded-module conflict.'};
}
async function inspect(editor,{probe}={}) {
  const result=capability(editor);if(editor?.state!=='Running')return result;
  const executables=[...new Set((editor.matches || []).map(m=>m.executable).filter(Boolean))];
  if(!executables.length)return result;
  try {
    const check=probe || (async name=>{
      const script="$m=$null; try { if ([System.Threading.Mutex]::TryOpenExisting('"+name.replace(/'/g,"''")+"',[ref]$m)) { 'Active' } else { 'Absent' } } finally { if ($m) { $m.Dispose() } }";
      const run=require('node:util').promisify(require('node:child_process').execFile);
      const output=await run(require('./processes').powershell(),['-NoLogo','-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:4000});
      if(!/^(Active|Absent)$/.test(output.stdout.trim()))throw new Error('Unrecognized mutex response');return output.stdout.trim()==='Active';
    });
    for(const executable of executables) if(await check('Global\\LiveCoding_'+executable.replace(/[\\/:]/g,'+'))) return {...result,state:'Available',detail:'An engine-executable Live Coding session mutex is active. It is not project-specific; external triggering remains unsupported.'};
    return {...result,state:'Unavailable',detail:'No active Live Coding mutex observed. This does not prove loaded project modules can be rebuilt safely.'};
  }catch(error){return {...result,detail:'Live Coding mutex inspection unavailable: '+error.message};}
}
module.exports={capability,resolve,inspect};
