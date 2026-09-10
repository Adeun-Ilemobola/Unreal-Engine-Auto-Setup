"use strict";
// Strict JSON, with a small token scanner to retain unrelated bytes and detect ambiguous duplicate keys.
function parse(text) {
  const data=JSON.parse(text.replace(/^\uFEFF/,''));
  if(!data || Array.isArray(data) || typeof data!=='object') throw new Error('Descriptor must be a JSON object.');
  const tokens=[...text.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\]:,]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g)].map(m=>({value:m[0],start:m.index,end:m.index+m[0].length}));
  let i=0;
  function value() {
    const first=tokens[i++];
    if(first.value==='{' || first.value==='[') {
      const object=first.value==='{',end=object?'}':']',keys=new Set(),properties=[];
      while(tokens[i].value!==end) {
        let key;
        if(object) {key=JSON.parse(tokens[i++].value);if(keys.has(key)) throw new Error('Duplicate descriptor key: '+key);keys.add(key);i++;}
        const child=value();if(object) properties.push({key,...child});
        if(tokens[i].value===',') i++;else break;
      }
      return {start:first.start,end:tokens[i++].end,properties};
    }
    return {start:first.start,end:first.end};
  }
  return {data,node:value()};
}
function append(text,key,entry) {
  const {data,node}=parse(text),old=data[key];
  if(old!==undefined && !Array.isArray(old)) throw new Error(key+' must be an array.');
  if(old?.some(item=>!item || typeof item.Name!=='string')) throw new Error(key+' contains an invalid entry.');
  if(old?.some(item=>item.Name.toLowerCase()===entry.Name.toLowerCase())) throw new Error(key+' already declares '+entry.Name+'.');
  const eol=text.includes('\r\n')?'\r\n':'\n',indent=/\n([\t ]+)"/.exec(text)?.[1] || '  ';
  const property=node.properties.find(item=>item.key===key);
  let result;
  if(property) {
    const end=property.end-1;
    let insert=end;while(insert>property.start+1 && /\s/.test(text[insert-1])) insert--;
    result=text.slice(0,insert)+(old.length?',':'')+eol+indent.repeat(2)+JSON.stringify(entry)+text.slice(insert);
  } else {
    let insert=node.end-1;while(insert>node.start+1 && /\s/.test(text[insert-1])) insert--;
    result=text.slice(0,insert)+(node.properties.length?',':'')+eol+indent+JSON.stringify(key)+': ['+eol+indent.repeat(2)+JSON.stringify(entry)+eol+indent+']'+text.slice(insert);
  }
  parse(result);return result;
}
module.exports={parse,append};
