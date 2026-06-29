const { spawnSync } = require('node:child_process');

const [, , script, ...args] = process.argv;
if (!script) {
  console.error('Usage: node tools/run_python.js <script.py> [...args]');
  process.exit(1);
}

const candidates = process.platform === 'win32'
  ? [
      { cmd: 'py', args: ['-3'] },
      { cmd: 'python', args: [] },
      { cmd: 'python3', args: [] },
    ]
  : [
      { cmd: 'python3', args: [] },
      { cmd: 'python', args: [] },
      { cmd: 'py', args: ['-3'] },
    ];

for (const candidate of candidates) {
  const result = spawnSync(candidate.cmd, [...candidate.args, script, ...args], { stdio: 'inherit' });
  if (result.error && result.error.code === 'ENOENT') continue;
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

console.error('Python 3 was not found. Install Python 3 or make py/python/python3 available on PATH.');
process.exit(1);
