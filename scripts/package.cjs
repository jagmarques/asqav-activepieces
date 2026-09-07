const { copyFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');

const root = join(__dirname, '..');
const piece = join(root, 'packages/pieces/community/asqav');
for (const name of ['README.md', 'LICENSE']) copyFileSync(join(root, name), join(piece, name));
mkdirSync(join(root, 'dist'), { recursive: true });
execFileSync('npm', ['pack', '--workspace', '@activepieces/piece-asqav',
  '--pack-destination', join(root, 'dist')], { cwd: root, stdio: 'inherit' });
