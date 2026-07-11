const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'tools/corruptgun_vfx/cg_vfx_engine.mjs');
const output = path.join(root, 'assets/player/corrupt_gun/vfx/cg_vfx_engine.iife.js');

async function main() {
  fs.mkdirSync(path.dirname(output), { recursive: true });

  await esbuild.build({
    entryPoints: [entry],
    outfile: output,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome90', 'safari15', 'firefox90'],
    minify: true,
    legalComments: 'none',
    banner: {
      js: '/*! Corrupt Gun VFX engine v2.0.0 | OGL + PSRD Noise | see THIRD_PARTY_NOTICES.md */',
    },
  });

  const bundle = fs.readFileSync(output, 'utf8');
  if (!bundle.includes('CgVfxEngine')) {
    throw new Error('Corrupt Gun VFX bundle did not expose window.CgVfxEngine');
  }
  console.log(`Built ${path.relative(root, output)} (${Buffer.byteLength(bundle)} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
