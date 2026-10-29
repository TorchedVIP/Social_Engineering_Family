// Regenerates docs/data.js from the canonical data files.
// Run after editing data/accounts.json or data/clues.json:
//   node build-static-data.js
const fs = require('fs');
const path = require('path');

const accounts = JSON.parse(fs.readFileSync('data/accounts.json', 'utf8'));
const clues = JSON.parse(fs.readFileSync('data/clues.json', 'utf8'));

fs.mkdirSync('docs', { recursive: true });

const banner =
  '// AUTO-GENERATED from data/accounts.json + data/clues.json for the static (GitHub Pages) build.\n' +
  '// Do not edit by hand — regenerate with: node build-static-data.js\n';

const out =
  banner +
  'window.GAME_DATA = {\n' +
  '  accounts: ' + JSON.stringify(accounts, null, 2) + ',\n' +
  '  clues: ' + JSON.stringify(clues, null, 2) + '\n' +
  '};\n';

fs.writeFileSync(path.join('docs', 'data.js'), out);
console.log('Wrote docs/data.js — accounts=' + accounts.length + ', clue groups=' + Object.keys(clues.accounts).length);
