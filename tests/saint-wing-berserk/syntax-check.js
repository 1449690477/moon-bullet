import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];

for (let i = 0; i < scripts.length; i++) {
  try {
    new Function(scripts[i][1]);
  } catch (err) {
    console.error(`Syntax error in <script> #${i + 1}`);
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

console.log(`syntax ok (${scripts.length} script block${scripts.length === 1 ? '' : 's'})`);
