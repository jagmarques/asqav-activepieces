const { mkdtempSync, writeFileSync, readFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { execFileSync } = require('node:child_process');
const root = join(__dirname, '..');
const { name: pieceName } = JSON.parse(readFileSync(join(root, 'packages/pieces/community/asqav/package.json'), 'utf8'));
const consumer = mkdtempSync(join(tmpdir(), 'asqav-activepieces-consumer-'));
try {
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'asqav-piece-consumer', private: true,
    dependencies: { [pieceName]: `file:${join(root, 'dist/activepieces-piece-asqav-0.0.1.tgz')}`, nock: '14.0.17' } }));
  execFileSync('npm', ['install'], { cwd: consumer, stdio: 'inherit' });
  writeFileSync(join(consumer, 'consume.cjs'), readFileSync(join(__dirname, 'consume.cjs')));
  execFileSync(process.execPath, ['consume.cjs'], { cwd: consumer, stdio: 'inherit' });
} finally { rmSync(consumer, { recursive: true, force: true }); }
