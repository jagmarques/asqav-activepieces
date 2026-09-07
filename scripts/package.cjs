const { copyFileSync, mkdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');

const root = join(__dirname, '..');
const piece = join(root, 'packages/pieces/community/asqav');
const { name: pieceName } = JSON.parse(readFileSync(join(piece, 'package.json'), 'utf8'));
for (const name of ['README.md', 'LICENSE']) copyFileSync(join(root, name), join(piece, name));
mkdirSync(join(root, 'dist'), { recursive: true });
execFileSync('npm', ['pack', '--workspace', pieceName,
  '--pack-destination', join(root, 'dist')], { cwd: root, stdio: 'inherit' });
