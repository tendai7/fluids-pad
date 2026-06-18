// fix-typed-clears.js
// Finds setters in handleClear that were changed to "" but have a typed union state,
// and restores them to their original initial value.

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..');
const CALCS_DIR = path.join(ROOT, 'app', 'calculators');

const calcDirs = fs.readdirSync(CALCS_DIR);
const pageFiles = calcDirs
  .map(d => path.join(CALCS_DIR, d, 'page.tsx'))
  .filter(f => fs.existsSync(f));

let fixed = 0;

pageFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const name  = path.basename(path.dirname(filePath));

  // Build a map: setter → { initialValue, hasCustomType }
  // Only look at string-initialised useState calls
  const stateMap = new Map();
  const re = /const \[(\w+),\s*(set\w+)\]\s*=\s*useState(<([^>]+)>)?\("([^"]*)"\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const setter      = m[2];
    const genericType = m[4];  // e.g. "FlowUnit", "GeomType", '"a" | "b"', undefined
    const initial     = m[5];

    // "Custom type" = has a generic parameter that is NOT "string"
    const hasCustomType = !!genericType
      && genericType.trim() !== 'string'
      && genericType.trim() !== 'String';

    stateMap.set(setter, { initial, hasCustomType });
  }

  // Locate handleClear function body
  const lines = content.split('\n');
  let clearStart = -1, clearEnd = -1, depth = 0;
  for (let i = 0; i < lines.length; i++) {
    if (clearStart < 0 && lines[i].includes('const handleClear = () => {')) {
      clearStart = i; depth = 1; continue;
    }
    if (clearStart >= 0 && clearEnd < 0) {
      for (const ch of lines[i]) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }
      if (depth === 0) { clearEnd = i; break; }
    }
  }
  if (clearStart < 0 || clearEnd < 0) return;

  let modified = false;

  for (let i = clearStart + 1; i < clearEnd; i++) {
    // Match lines that were changed to setXxx("");
    const m2 = lines[i].match(/^(\s*)(set\w+)\(""\)(;.*)$/);
    if (!m2) continue;

    const [, indent, setter, tail] = m2;
    const info = stateMap.get(setter);

    // If this setter has a custom type, restore the initial value
    if (info && info.hasCustomType) {
      lines[i] = `${indent}${setter}("${info.initial}")${tail}`;
      modified = true;
    }
  }

  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
    fixed++;
    console.log(`✓ fixed ${name}`);
  }
});

console.log(`\n✓ Done: ${fixed} files fixed`);
