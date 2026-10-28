'use strict';
// Use an already installed Prettier; this tool never installs packages or changes the manifest.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

const ignored = new Set([
  'start',
  'end',
  'loc',
  'range',
  'extra',
  'comments',
  'tokens',
  'leadingComments',
  'trailingComments',
  'innerComments'
]);
function syntaxOnly(value) {
  if (Array.isArray(value)) return value.map(syntaxOnly);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !ignored.has(key))
      .map(([key, item]) => [key, syntaxOnly(item)])
  );
}

async function main() {
  const [prettierPath, ...files] = process.argv.slice(2);
  if (!prettierPath || !files.length)
    throw new Error('Usage: node tools/format-js.cjs <installed-prettier-path> <files...>');
  const prettier = require(path.resolve(prettierPath));
  const options = JSON.parse(await fs.readFile(path.join(__dirname, '..', '.prettierrc.json'), 'utf8'));
  for (const file of files) {
    const original = await fs.readFile(file, 'utf8');
    const formatted = await prettier.format(original, { ...options, parser: 'babel' });
    const before = await prettier.__debug.parse(original, { parser: 'babel' });
    const after = await prettier.__debug.parse(formatted, { parser: 'babel' });
    assert.deepEqual(syntaxOnly(after.ast), syntaxOnly(before.ast), 'Formatting changed syntax: ' + file);
    if (formatted !== original) await fs.writeFile(file, formatted);
    console.log('Formatted; syntax tree unchanged: ' + file);
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
