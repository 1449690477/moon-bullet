# Saint Wing Berserk Beam Visual Checklist

1. Start the local server:
   `python3 -m http.server 8765 --directory /Users/wanghan/Downloads/moon_bullet_demo_v3/moon_bullet_demo_v3_6`
2. Open `http://localhost:8765/index.html`. If 8765 is occupied, use the next free port, for example `8766`.
3. On the title screen, equip `圣冕圣械`, start the game, and trigger Berserk_Form.
4. Check the launcher mouth always has a visible breathing Charge_Orb in all four phases.
5. Check the cycle is about 1.25s: charge, fast beam bullet flight, impact, cooldown.
6. Check the fire phase shows a moving beam bullet with a short fading trail, not a full static column.
7. Check the impact point shows core flash, rings, and 12-16 radial spikes, plus the delayed outer gold ring.
8. Check left and right launchers are staggered and do not fire together.
9. Check targets are selected only from visible enemies above the launcher; no off-screen upward sniping.
10. Check there is no high-frequency flashing or full-element alpha popping.
11. Record 30 seconds in DevTools Performance; FPS moving average should stay at or above 58 with no frame over 100ms attributable to the launcher effect.
12. If a check fails, run `git diff index.html` or compare the current launcher block against the latest known-good implementation, then rerun `npm run syntax && npm run regression && npm test` in this directory.
