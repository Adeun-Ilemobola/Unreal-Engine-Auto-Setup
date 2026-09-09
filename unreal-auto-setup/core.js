'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

function mergeMissing(current, defaults) {
  if (current === undefined) return structuredClone(defaults);
  if (!current || typeof current !== 'object' || Array.isArray(current)) return current;
  const result = {...current};
  for (const [key, value] of Object.entries(defaults)) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? mergeMissing(current[key], value)
      : current[key] === undefined ? value : current[key];
  }
  return result;
}
function supportedVersion(major, minor) {
  return major > 5 || (major === 5 && minor >= 8);
}
function targetName(filename) { return filename.replace(/\.Target\.cs$/i, ''); }
function chooseTarget(files, projectName) {
  const expected = projectName + 'Editor';
  const names = files.map(targetName);
  if (names.includes(expected)) return expected;
  return names.length === 1 ? names[0] : undefined;
}
async function writeNew(filename, text) {
  await fs.mkdir(path.dirname(filename), {recursive: true});
  try { await fs.writeFile(filename, text, {flag:'wx'}); return true; }
  catch (error) { if (error.code === 'EEXIST') return false; throw error; }
}
const formatting = `BasedOnStyle: LLVM
Language: Cpp
BreakBeforeBraces: Attach
IndentWidth: 2
ContinuationIndentWidth: 2
TabWidth: 2
UseTab: Never
ColumnLimit: 100
AllowShortFunctionsOnASingleLine: Empty
AllowShortIfStatementsOnASingleLine: Never
AllowShortLoopsOnASingleLine: false
AllowShortBlocksOnASingleLine: Never
SpaceBeforeParens: ControlStatements
PointerAlignment: Left
DerivePointerAlignment: false
SortIncludes: Never
IncludeBlocks: Preserve
`;
const settings = {
  'files.associations': {'*.h':'cpp','*.inl':'cpp'},
  'files.exclude': {'**/Binaries':true,'**/DerivedDataCache':true,'**/Intermediate':true,'**/Saved':true,'**/Content':true,'.idea':true,'.vs':true,'Config':true,'*.sln':true,'*.slnx':true,'.vsconfig':true},
  'search.exclude': {'**/Binaries':true,'**/DerivedDataCache':true,'**/Intermediate':true,'**/Saved':true,'**/Content':true},
  'editor.bracketPairColorization.enabled':true,
  'editor.guides.bracketPairs':true,
  'editor.renderWhitespace':'selection',
  'C_Cpp.formatting':'clangFormat',
  'C_Cpp.clang_format_style':'file',
  '[cpp]': {'editor.defaultFormatter':'ms-vscode.cpptools','editor.formatOnSave':true,'editor.detectIndentation':false,'editor.insertSpaces':true,'editor.tabSize':2}
};
module.exports = {mergeMissing,supportedVersion,chooseTarget,writeNew,formatting,settings};
