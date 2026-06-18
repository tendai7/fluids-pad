// add-clear-button.js
// Adds ClearButton to every calculator page that doesn't already have one.

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..');
const CALCS_DIR = path.join(ROOT, 'app', 'calculators');

// State variable names that are outputs, not inputs — reset to null/{}
const OUTPUT_VARS = new Set([
  'result', 'steps', 'errors', 'solved', 'computedField',
  'stateHistory', 'lastResult',
]);

const calcDirs = fs.readdirSync(CALCS_DIR);
const pageFiles = calcDirs
  .map(d => path.join(CALCS_DIR, d, 'page.tsx'))
  .filter(f => fs.existsSync(f));

let updated = 0, skipped = 0;

pageFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const name = path.basename(path.dirname(filePath));

  // Already fully done
  if (content.includes('<ClearButton')) { skipped++; return; }

  // ── 1. Collect input resets ──────────────────────────────────────────────
  const inputResets = [];
  const seen = new Set();

  // String-initialised states: useState("...") and useState<Type>("...")
  const strRe = /const \[(\w+),\s*(set\w+)\]\s*=\s*useState(?:<[^>]*>)?\("([^"]*)"\)/g;
  let m;
  while ((m = strRe.exec(content)) !== null) {
    const [, varName, setter, init] = m;
    if (OUTPUT_VARS.has(varName) || seen.has(setter)) continue;
    seen.add(setter);
    inputResets.push(`    ${setter}("${init}");`);
  }

  // Boolean-initialised states: useState(true/false)
  const boolRe = /const \[(\w+),\s*(set\w+)\]\s*=\s*useState(?:<[^>]*>)?\((true|false)\)/g;
  while ((m = boolRe.exec(content)) !== null) {
    const [, varName, setter, init] = m;
    if (OUTPUT_VARS.has(varName) || seen.has(setter)) continue;
    seen.add(setter);
    inputResets.push(`    ${setter}(${init});`);
  }

  // Number-initialised states: useState(42) — rare but handle it
  const numRe = /const \[(\w+),\s*(set\w+)\]\s*=\s*useState(?:<[^>]*>)?\((\d+(?:\.\d+)?)\)/g;
  while ((m = numRe.exec(content)) !== null) {
    const [, varName, setter, init] = m;
    if (OUTPUT_VARS.has(varName) || seen.has(setter)) continue;
    seen.add(setter);
    inputResets.push(`    ${setter}(${init});`);
  }

  // ── 2. Collect output resets ─────────────────────────────────────────────
  const outputResets = [];
  if (content.includes('setResult('))       outputResets.push('    setResult(null);');
  if (content.includes('setSteps('))        outputResets.push('    setSteps(null);');
  if (content.includes('setErrors('))       outputResets.push('    setErrors({});');
  if (content.includes('setSolved('))       outputResets.push('    setSolved(null);');
  if (content.includes('setComputedField('))outputResets.push('    setComputedField(null);');

  // ── 3. Add handleClear (if missing) before handleCalculate ───────────────
  if (!content.includes('handleClear')) {
    const body = [...inputResets, ...outputResets].join('\n');
    const fn   = `  const handleClear = () => {\n${body}\n  };\n\n`;
    if (content.includes('  const handleCalculate')) {
      content = content.replace('  const handleCalculate', fn + '  const handleCalculate');
    }
  }

  // ── 4. Add import after the last import block ────────────────────────────
  if (!content.includes('ClearButton')) {
    // Find the last line that ends an import (either starts with "import " or ends with `; from "..."`)
    const lines = content.split('\n');
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/^import\s/.test(l) || /^}\s+from\s+"/.test(l) || /^}\s+from\s+'/.test(l)) {
        lastImport = i;
      }
    }
    if (lastImport >= 0) {
      lines.splice(lastImport + 1, 0, 'import { ClearButton } from "@/components/ClearButton";');
      content = lines.join('\n');
    }
  }

  // ── 5. Inject <ClearButton> after the Calculate button ───────────────────
  // Match: ...>Calculate</button>  or  ...>Calculate\n</button>
  content = content.replace(
    /(>[\s\r\n]*Calculate[\s\r\n]*<\/button>)/,
    '$1\n        <ClearButton onClear={handleClear} />'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  updated++;
  console.log(`✓ ${name}`);
});

console.log(`\n✓ Done: ${updated} updated, ${skipped} already had ClearButton`);
