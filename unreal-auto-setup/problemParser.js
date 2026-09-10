'use strict';
const path=require('node:path');
function parse(line,root) {
  line=line.replace(/\x1b\[[0-9;]*m/g,'').trim().replace(/^\d+>/,'');
  // MSVC/UHT: File.cpp(12[,34]): [fatal] error [C1234]: text
  let match=/^(.+?)\((\d+)(?:,(\d+))?\)\s*:\s*(?:fatal\s+)?(error|warning)\s*(?:([A-Za-z]+\d+)\s*)?:\s*(.+)$/i.exec(line);
  if(!match) match=/^(.+?):(\d+)(?::(\d+))?:\s*(?:fatal\s+)?(error|warning)\s*(?:([A-Za-z]+\d+)\s*)?:\s*(.+)$/i.exec(line);
  if(!match) return undefined;
  let [,file,lineNumber,column,severity,code,message]=match;
  file=file.replace(/^"|"$/g,'').trim();
  if(!/\.(?:cpp|c|cc|cxx|h|hpp|hxx|inl|cs|uproject|uplugin)$/i.test(file) || /[\r\n<>|]/.test(file)) return undefined;
  if(!Number.isSafeInteger(+lineNumber) || +lineNumber<1 || (column && (!Number.isSafeInteger(+column) || +column<1))) return undefined;
  // Source-relative UHT diagnostics resolve against the project root.
  file=path.win32.isAbsolute(file) ? path.win32.normalize(file) : path.resolve(root,file);
  return {file,line:+lineNumber-1,column:column?+column-1:0,severity:severity.toLowerCase(),code,message};
}
function liveCodingConflict(line) {
  return /(?:unable to build|cannot (?:build|compile)|build.*(?:blocked|failed)).*(?:live coding|editor.*running)|(?:live coding).*(?:active|enabled).*?(?:build|exit|close)|(?:close|exit).*editor.*(?:build|compil)/i.test(line);
}
module.exports={parse,liveCodingConflict};
