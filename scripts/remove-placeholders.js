// remove-placeholders.js
// Strips placeholder="..." from every <InputField> call in every calculator page.
// After this, cleared inputs will be completely blank — no grey hint text.

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..');
const CALCS_DIR = path.join(ROOT, 'app', 'calculators');

const calcDirs = fs.readdirSync(CALCS_DIR);
const pageFiles = calcDirs
  .map(d => path.join(CALCS_DIR, d, 'page.tsx'))
  .filter(f => fs.existsSync(f));

let updated = 0;

pageFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const name  = path.basename(path.dirname(filePath));

  // Remove placeholder="..." (any quoted string) from InputField props.
  // Handles both same-line and prop-per-line layouts.
  const before = content;
  content = content.replace(/\s+placeholder="[^"]*"/g, '');

  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
    updated++;
    console.log(`✓ ${name}`);
  }
});

console.log(`\n✓ Done: ${updated} calculator pages updated`);
