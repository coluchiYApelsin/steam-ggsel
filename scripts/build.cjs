const { spawnSync } = require('node:child_process');
const { mkdirSync, writeFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pkg = require('../node_modules/@steambrew/starlight/package.json');
const bin = path.join(root, 'node_modules/@steambrew/starlight/binaries', `starlight-${process.platform}-${process.arch}${process.platform === 'win32' ? '.exe' : ''}`);
mkdirSync(path.join(root, 'diagnostics'), { recursive: true });
function run(args) {
  const r = spawnSync(bin, args, { cwd: root, encoding: 'utf8', env: { ...process.env,
    STARLIGHT_TYPES_DIR: path.join(root, 'node_modules/@steambrew/starlight/bin/millennium/types') } });
  const output = (r.stdout || '') + (r.stderr || '');
  process.stdout.write(output);
  writeFileSync(path.join(root, 'diagnostics/build-latest.txt'), `Starlight ${pkg.version}\n${args.join(' ')}\nexit=${r.status} unsigned=0x${(r.status >>> 0).toString(16)}\n${output}`);
  if (r.error || r.status !== 0) {
    if ((r.status >>> 0) === 0xc0000135) console.error('Windows cannot load a required DLL (0xC0000135). Install official Microsoft Visual C++ Redistributable x64: https://aka.ms/vs/17/release/vc_redist.x64.exe. Bun reports this as 53.');
    else console.error(r.error || `Starlight failed: ${r.status}`);
    process.exit(1);
  }
}
mkdirSync(path.join(root, 'dist'), { recursive: true });
run(['pack', '--release']);
const files = readdirSync(path.join(root, 'dist'), { recursive: true }).filter(f => f.endsWith('.star'));
if (!files.length) throw new Error('Compiler returned success without a .star artifact');
for (const f of files) run(['verify', path.join(root, 'dist', f)]);
