// clear-inputs.js
// Updates every handleClear so that numeric/text value inputs are cleared to ""
// while unit selectors and mode toggles keep their default values.

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..');
const CALCS_DIR = path.join(ROOT, 'app', 'calculators');

// Setters that should KEEP their default (unit selectors, mode toggles, solve-for)
function keepDefault(setter) {
  if (/Unit/i.test(setter))      return true;   // setFlowUnit, setDiamUnit, setVelUnit…
  if (/Mode/i.test(setter))      return true;   // setInputMode, setViscMode, setRhMode, setMode
  if (setter === 'setSolveFor')  return true;
  return false;
}

// Setters that are always output-state resets — leave them alone
const OUTPUT_SETTERS = new Set([
  'setResult', 'setSteps', 'setErrors', 'setSolved', 'setComputedField',
]);

const calcDirs = fs.readdirSync(CALCS_DIR);
const pageFiles = calcDirs
  .map(d => path.join(CALCS_DIR, d, 'page.tsx'))
  .filter(f => fs.existsSync(f));

let updated = 0;

pageFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const name  = path.basename(path.dirname(filePath));

  // Locate handleClear function body boundaries
  const lines = content.split('\n');
  let clearStart = -1, clearEnd = -1, depth = 0;

  for (let i = 0; i < lines.length; i++) {
    if (clearStart < 0 && lines[i].includes('const handleClear = () => {')) {
      clearStart = i;
      depth = 1;
      continue;
    }
    if (clearStart >= 0 && clearEnd < 0) {
      for (const ch of lines[i]) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }
      if (depth === 0) { clearEnd = i; break; }
    }
  }

  if (clearStart < 0 || clearEnd < 0) return; // no handleClear found

  let modified = false;

  for (let i = clearStart + 1; i < clearEnd; i++) {
    const line = lines[i];

    // Match:   setXxx("some-value");
    // (single-statement lines only — which is the generated pattern)
    const m = line.match(/^(\s*)(set\w+)\("([^"]*)"\)(;.*)$/);
    if (!m) continue;

    const [, indent, setter, value, tail] = m;

    // Skip output-state setters
    if (OUTPUT_SETTERS.has(setter)) continue;

    // Skip unit/mode selectors — they keep their defaults
    if (keepDefault(setter)) continue;

    // Skip if already empty
    if (value === '') continue;

    // Clear to empty string
    lines[i] = `${indent}${setter}("")${tail}`;
    modified = true;
  }

  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
    updated++;
    console.log(`✓ ${name}`);
  }
});

console.log(`\n✓ Done: ${updated} calculators updated`);
