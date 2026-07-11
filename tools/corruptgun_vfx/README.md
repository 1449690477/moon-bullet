# Corrupt Gun WebGL VFX Runtime

Build the browser bundle with:

```sh
npm run build:corruptgun-vfx
```

The build writes
`assets/player/corrupt_gun/vfx/cg_vfx_engine.iife.js`. Loading that file
exposes `window.CgVfxEngine`.

## Integration

```js
const cgVfx = window.CgVfxEngine.create({
  width: W,
  height: H,
  dpr: window.devicePixelRatio,
  quality: 'high',
  onStatus(status) {
    // status.mode === 'fallback' means the game must draw the baked atlases.
  },
});

cgVfx.beginFrame({ width: W, height: H, time: performance.now() / 1000 });
cgVfx.drawTrail({ points: shot.trail, tailWidth: 4, headWidth: 22 });
cgVfx.drawCloneField({ x: clone.x, y: clone.y, diameter: 132, slot: clone.slot });
cgVfx.compositeTo(ctx, 'back');

// Draw player, enemies, bullets, and clone metal bodies here.
cgVfx.drawOrb({ x: shot.x, y: shot.y, diameter: 82, phase: shot.cgPhase });
cgVfx.drawMark({ x: enemy.x, y: enemy.y, stacks: enemy._cgMark.n });
cgVfx.compositeTo(ctx, 'front');

// Draw HUD last.
```

The engine owns two transparent, detached WebGL canvases. `back` is intended
for trails and clone fields. `front` is intended for orb energy, impacts,
marks, and muzzle effects. Both must be composited with `source-over`; drawing
the complete orb canvas with `lighter` destroys its black volume.

## API

- `CgVfxEngine.create(options)` creates an isolated engine.
- `beginFrame(frame)` clears both layers and updates logical size, DPR, time,
  and quality.
- `drawOrb`, `drawTrail`, `drawImpact`, `drawMark`, `drawCloneField`, and
  `drawMuzzle` render the six effect families.
- `compositeTo(ctx, layer)` copies a layer into the existing game canvas.
- `getCanvas(layer)` returns a detached layer canvas for custom composition.
- `getStatus()` reports shader readiness, context loss, quality, resolution,
  fallback reason, and draw-call count.
- `setQuality('high' | 'medium' | 'low')` switches profiles. `low` deliberately
  reports fallback so the Canvas2D atlas renderer stays visually complete.
- `destroy()` removes GPU resources and context listeners.

High quality renders at up to 2 DPR with full particle density and subtle edge
color separation. Medium renders at 0.7 scale with 60 percent particles and
no color separation. WebGL initialization, draw, or context-loss failures log
once per reason and report `mode: 'fallback'`.

Open `tools/corruptgun_vfx/lab.html` through the local HTTP server for an
isolated visual check of every runtime effect.
