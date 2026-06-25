import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const start = html.indexOf('function drawSaintWing()');
const end = html.indexOf('function updateScFx(dt)', start);
if (start < 0 || end < 0) {
  console.error('Could not locate drawSaintWing/updateScFx boundaries');
  process.exit(1);
}

const block = html.slice(start, end);
const withoutComments = block
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');
const oldPhase = /\b(sustain|finalburst|dissipate)\b/.exec(withoutComments);
if (oldPhase) {
  const prefix = block.slice(0, oldPhase.index);
  const line = html.slice(0, start + prefix.length).split('\n').length;
  console.error(`Old continuous-beam phase "${oldPhase[1]}" found near index.html:${line}`);
  process.exit(1);
}

if (!/leftSrc\s*=\s*\{\s*sx:\s*411,\s*sy:\s*20,\s*sw:\s*99,\s*sh:\s*260\s*\}/.test(block)) {
  console.error('leftSrc crop literal changed');
  process.exit(1);
}
if (!/rightSrc\s*=\s*\{\s*sx:\s*601,\s*sy:\s*20,\s*sw:\s*111,\s*sh:\s*260\s*\}/.test(block)) {
  console.error('rightSrc crop literal changed');
  process.exit(1);
}

console.log('regression grep ok');
