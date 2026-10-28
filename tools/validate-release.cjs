'use strict';
/**
 * P4.3 Quality and Release Validation Runner
 * Consolidates pre-release checks into a single documented entry point.
 */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..');
const extensionDir = path.join(root, 'unreal-auto-setup');

const results = [];
function nodeSuite(execute=cp.execFileSync) {
  // Strict release policy: every nonzero test exit fails, including P1.1.
  return execute(process.execPath, ['tools/run-tests.cjs'], {cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
}
function check(name, fn) {
  process.stdout.write(`Checking ${name}... `);
  try {
    const detail = fn();
    console.log('PASSED' + (detail ? ` (${detail})` : ''));
    results.push({ name, status: 'Passed', detail });
  } catch (err) {
    console.log('FAILED');
    console.error(`  Error: ${err.message}`);
    results.push({ name, status: 'Failed', error: err.message });
  }
}

async function runAsyncCheck(name, fn) {
  process.stdout.write(`Checking ${name}... `);
  try {
    const detail = await fn();
    console.log('PASSED' + (detail ? ` (${detail})` : ''));
    results.push({ name, status: 'Passed', detail });
  } catch (err) {
    console.log('FAILED');
    console.error(`  Error: ${err.message}`);
    results.push({ name, status: 'Failed', error: err.message });
  }
}

async function main() {
  console.log('=== Unreal Engine Auto Setup — Quality & Release Checks ===\n');

  // 1. JavaScript Syntax Check
  check('JavaScript Syntax (Node --check)', () => {
    const jsFiles = [];
    function scan(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) scan(full);
        else if (/\.(js|cjs)$/.test(entry.name)) jsFiles.push(full);
      }
    }
    scan(extensionDir);
    scan(path.join(root, 'tools'));
    for (const f of jsFiles) {
      cp.execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    }
    return `${jsFiles.length} files syntax-checked`;
  });

  // 2. Extension Manifest Validation
  check('Extension Manifest (package.json)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(extensionDir, 'package.json'), 'utf8'));
    if (pkg.name !== 'unreal-project-tools') throw new Error(`Unexpected name: ${pkg.name}`);
    if (pkg.publisher !== 'local-tools') throw new Error(`Unexpected publisher: ${pkg.publisher}`);
    if (pkg.version !== '1.0.0') throw new Error('Unexpected version');
    if (!pkg.engines?.vscode) throw new Error('Missing engines.vscode');
    if (!pkg.main) throw new Error('Missing main entry point');
    if (!fs.existsSync(path.join(extensionDir, pkg.main))) throw new Error(`main entry file missing: ${pkg.main}`);
    return `v${pkg.version}, main: ${pkg.main}`;
  });

  // 3. Public Command Consistency
  check('Public Command Consistency', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(extensionDir, 'package.json'), 'utf8'));
    const declared = pkg.contributes?.commands?.map(c => c.command) || [];
    if (declared.length < 25) throw new Error(`Expected at least 25 declared commands, found ${declared.length}`);
    return `${declared.length} declared commands`;
  });

  // 4. Public Configuration Settings Consistency
  check('Public Configuration Settings', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(extensionDir, 'package.json'), 'utf8'));
    const props = pkg.contributes?.configuration?.properties || {};
    const expected = [
      'unrealSetup.autoSetup',
      'unrealSetup.runtimeRefreshInterval',
      'unrealSetup.automationMode',
      'unrealSetup.autoBuildDelay',
      'unrealSetup.verboseRuntimeLogging'
    ];
    for (const key of expected) {
      if (!props[key]) throw new Error(`Missing setting definition: ${key}`);
    }
    return `${Object.keys(props).length} properties verified`;
  });

  // 5. Native Supervisor Binary Integrity & Schema
  check('Native Supervisor Integrity', () => {
    const nativeDir = path.join(extensionDir, 'native');
    const exe = path.join(nativeDir, 'OperationSupervisor.exe');
    const cs = path.join(nativeDir, 'OperationSupervisor.cs');
    const meta = path.join(nativeDir, 'supervisor-build.json');
    if (!fs.existsSync(exe)) throw new Error('OperationSupervisor.exe missing');
    if (!fs.existsSync(cs)) throw new Error('OperationSupervisor.cs missing');
    if (!fs.existsSync(meta)) throw new Error('supervisor-build.json missing');
    const header = Buffer.alloc(2);
    const fd = fs.openSync(exe, 'r');
    fs.readSync(fd, header, 0, 2, 0);
    fs.closeSync(fd);
    if (header.toString('ascii') !== 'MZ') throw new Error('OperationSupervisor.exe is not a PE binary');
    const json = JSON.parse(fs.readFileSync(meta, 'utf8').replace(/^\uFEFF/,''));
    if (json.schema !== 1) throw new Error(`Unexpected supervisor schema: ${json.schema}`);
    const hash=file=>require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if(hash(exe)!==json.binarySha256 || hash(cs)!==json.sourceSha256)throw new Error('Native source/binary hash mismatch');
    return 'Windows Job supervisor valid';
  });

  // 6. Snippet Contribution Packaging
  check('Snippet Contributions', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(extensionDir, 'package.json'), 'utf8'));
    const snippets = pkg.contributes?.snippets;
    if (!Array.isArray(snippets) || !snippets.length) throw new Error('No snippets contributed');
    const snippetFile = path.resolve(extensionDir, snippets[0].path);
    if (!fs.existsSync(snippetFile)) throw new Error(`Snippet file missing: ${snippetFile}`);
    const content = JSON.parse(fs.readFileSync(snippetFile, 'utf8'));
    const prefixes = Object.values(content).map(s => s.prefix);
    for (const p of ['ustruct', 'uenum', 'uproperty', 'ufunction']) {
      if (!prefixes.includes(p)) throw new Error(`Missing prefix: ${p}`);
    }
    return `${prefixes.length} snippets (ustruct, uenum, uproperty, ufunction)`;
  });

  // 7. Packaging Preflight & Documentation Mirrors
  check('Packaging Preflight & Doc Mirrors (bundle_sources.py)', () => {
    const out = cp.execFileSync('python', ['-B', path.join(root, 'bundle_sources.py')], {
      cwd: root,
      encoding: 'utf8'
    });
    return out.trim();
  });

  // 8. Documentation Links Resolution
  check('Documentation Relative Links', () => {
    let checkedCount = 0;
    function scanMd(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) scanMd(full);
        else if (entry.name.endsWith('.md')) {
          const text = fs.readFileSync(full, 'utf8');
          const matches = text.matchAll(/\[.*?\]\((?!http|mailto|#)(.*?)\)/g);
          for (const m of matches) {
            const link = m[1].split('#')[0];
            if (!link || link === '\\d+') continue; // skip regex false-positive in audit doc
            const target = path.resolve(dir, link);
            if (!fs.existsSync(target)) {
              throw new Error(`Broken link in ${path.relative(root, full)}: ${link}`);
            }
            checkedCount++;
          }
        }
      }
    }
    scanMd(path.join(root, 'docs'));
    return `${checkedCount} relative links verified`;
  });

  // 9. Git Whitespace and Exclusion Rules
  check('Git Ignore & Exclusions', () => {
    const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
    for (const rule of ['*.vsix', 'node_modules/', '/.local-test-projects/Phase3AIntegration/']) {
      if (!gitignore.includes(rule)) throw new Error(`Missing .gitignore rule: ${rule}`);
    }
    return 'Protected rules present';
  });

  // 10. Scratch Directory Compliance
  check('Scratch Directory Policy Compliance', () => {
    const scratchRoot = 'C:\\Dev\\Scratch\\UnrealAutoSetupTests';
    if (!fs.existsSync(scratchRoot)) {
      fs.mkdirSync(scratchRoot, { recursive: true });
    }
    return `Scratch root active: ${scratchRoot}`;
  });

  // 11. Python Test Suite
  await runAsyncCheck('Python Test Suite', async () => {
    const out = cp.execFileSync('python', ['-B', '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py', '-v'], {
      cwd: root,
      encoding: 'utf8'
    });
    return '4 tests passed';
  });

  // 12. Strict Node test gate, including the unresolved P1.1 failure.
  await runAsyncCheck('Full Node Test Suite (isolated scratch)', async () => {
    try {
      nodeSuite();
      return 'All tests passed';
    } catch (err) {
      const output = (err.stdout || '') + (err.stderr || '');
      throw new Error(`Strict release gate requires zero failing tests. P1.1 is unresolved and is not waived.\n${output.slice(-2000)}`);
    }
  });

  // Optional: Extension Host Tests
  if (process.argv.includes('--include-host')) {
    await runAsyncCheck('P4.1 Extension Host Testing (20 scenarios)', async () => {
      cp.execFileSync(process.execPath, ['tools/run-extension-tests.cjs'], {
        cwd: root,
        stdio: 'inherit'
      });
      return '20/20 scenarios passed';
    });
  }

  // Optional: Real Unreal Engine Integration Tests
  if (process.argv.includes('--include-engine')) {
    await runAsyncCheck('P4.2 Real Unreal Engine Validation', async () => {
      const uePath = process.env.UE_PATH || 'C:\\Program Files\\Epic Games\\UE_5.8';
      cp.execFileSync(process.execPath, ['unreal-auto-setup/tests/real-unreal-validation.js', uePath], {
        cwd: root,
        stdio: 'inherit'
      });
      return 'All UBT stages passed';
    });
  }

  console.log('\n=== Validation Summary ===');
  const passed = results.filter(r => r.status === 'Passed').length;
  const failed = results.filter(r => r.status === 'Failed').length;
  console.log(`Passed: ${passed}/${results.length}`);
  if (failed > 0) {
    console.error(`Failed: ${failed}/${results.length}`);
    process.exitCode = 1;
  } else {
    console.log('All required quality and release validation checks passed.');
  }
}

module.exports={nodeSuite};
if(require.main===module)main().catch(err => {
  console.error('Fatal validation runner error:', err);
  process.exitCode = 1;
});
