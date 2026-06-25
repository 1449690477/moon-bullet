# 月蚀弹幕 V3.6 资源生成指导

本文件用于外部高质量图片模型跑图。参考视频只作为层级、清晰度和节奏参考，不复制任何商业游戏角色、UI、素材或构图。

## 全局硬性规则

- 透明素材必须是真透明 PNG。若模型不支持透明，请使用纯 `#00ff00` 或 `#ff00ff` 色键背景，禁止黑底假透明。
- 透明素材四角 alpha 必须为 0，边缘不能有黑边、白边、线条残留、签名、水印或文字。
- 战斗小人主体占画布 65%-80%，中心锚点稳定；头像和 cut-in 可以有暗色背景，但 manifest 不能标记为透明战斗素材。
- 背景必须暗、低频、低对比，禁止扫描线、窗框细线、复杂法阵、放射线、密集纹理。
- 弹幕/VFX 宁可简单也要清楚；敌弹、玩家弹、预警、真实伤害激光必须颜色区分。

## 推荐统一主设定

原创银发月蚀魔女，黑紫哥特服装，月亮发饰，蓝白月光能量；Boss 为原创堕月审判者，堕落修女与机械月轮元素，黑紫金暗红配色。

## 逐项任务

### assets/characters/

#### `player_witch_idle.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; subject fits 65-80% of canvas; feet/body anchor stable near x=128 y=145; readable at 80 px.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Silver-haired moon witch player sprite, idle front-facing combat pose, dark purple black gothic outfit, crescent hair ornament, small staff or magic firearm, blue-white moonlight accents, centered full body, 18-24 px safe transparent padding, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `player_witch_move_left.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; subject fits 65-80% of canvas; feet/body anchor stable near x=128 y=145; readable at 80 px.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Silver-haired moon witch player sprite, leaning left movement pose, same character design, dark purple black gothic outfit, crescent hair ornament, small staff or magic firearm, blue-white moonlight accents, centered full body, 18-24 px safe transparent padding, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `player_witch_move_right.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; subject fits 65-80% of canvas; feet/body anchor stable near x=128 y=145; readable at 80 px.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Silver-haired moon witch player sprite, leaning right movement pose, same character design, dark purple black gothic outfit, crescent hair ornament, small staff or magic firearm, blue-white moonlight accents, centered full body, 18-24 px safe transparent padding, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `player_witch_focus.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; subject fits 65-80% of canvas; feet/body anchor stable near x=128 y=145; readable at 80 px.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Silver-haired moon witch player sprite, focused precision movement pose, compact aura, dark purple black gothic outfit, crescent hair ornament, small staff or magic firearm, blue-white moonlight accents, centered full body, 18-24 px safe transparent padding, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `player_witch_hit.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; subject fits 65-80% of canvas; feet/body anchor stable near x=128 y=145; readable at 80 px.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Silver-haired moon witch player sprite, damage recoil pose, compact hit sparks, dark purple black gothic outfit, crescent hair ornament, small staff or magic firearm, blue-white moonlight accents, centered full body, 18-24 px safe transparent padding, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `player_witch_avatar.png`

- 尺寸：256x256 PNG
- 透明：不强制透明
- 验收：Face readable at 58 px UI size; no watermark or text.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Close-up portrait avatar of the same silver-haired moon witch, dark UI-friendly background allowed, no text.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `player_witch_skill_cutin.png`

- 尺寸：720x420 PNG
- 透明：不强制透明
- 验收：No text; no watermark; important face and hand details not cropped.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Wide cinematic skill cut-in of the same moon witch casting moonlight power, left-weighted composition, empty space on right for game overlay.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

### assets/enemies/

#### `bat_familiar_idle.png`

- 尺寸：192x192 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; silhouette readable at 64 px; no black rectangle.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. small black-purple bat familiar, compact readable wings, glowing eyes, idle state, centered icon-like enemy sprite, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `bat_familiar_attack.png`

- 尺寸：192x192 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; silhouette readable at 64 px; no black rectangle.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. small black-purple bat familiar, compact readable wings, glowing eyes, attack state, centered icon-like enemy sprite, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `bat_familiar_hit.png`

- 尺寸：192x192 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; silhouette readable at 64 px; no black rectangle.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. small black-purple bat familiar, compact readable wings, glowing eyes, hit state, centered icon-like enemy sprite, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `bat_familiar_death.png`

- 尺寸：192x192 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; silhouette readable at 64 px; no black rectangle.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. small black-purple bat familiar, compact readable wings, glowing eyes, death state, centered icon-like enemy sprite, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `orb_drone_idle.png`

- 尺寸：192x192 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; silhouette readable at 64 px; no black rectangle.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. magic-tech orb drone, circular core, dark metal shell, blue-purple energy, idle state, centered icon-like enemy sprite, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `orb_drone_attack.png`

- 尺寸：192x192 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; silhouette readable at 64 px; no black rectangle.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. magic-tech orb drone, circular core, dark metal shell, blue-purple energy, attack state, centered icon-like enemy sprite, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `orb_drone_hit.png`

- 尺寸：192x192 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; silhouette readable at 64 px; no black rectangle.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. magic-tech orb drone, circular core, dark metal shell, blue-purple energy, hit state, centered icon-like enemy sprite, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `orb_drone_death.png`

- 尺寸：192x192 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; silhouette readable at 64 px; no black rectangle.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. magic-tech orb drone, circular core, dark metal shell, blue-purple energy, death state, centered icon-like enemy sprite, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `nun_spirit_idle.png`

- 尺寸：224x224 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; silhouette readable at 64 px; no black rectangle.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. ghost nun elite enemy, dark robe, pale face, small golden halo, purple spirit aura, idle state, centered icon-like enemy sprite, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `nun_spirit_attack.png`

- 尺寸：224x224 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; silhouette readable at 64 px; no black rectangle.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. ghost nun elite enemy, dark robe, pale face, small golden halo, purple spirit aura, attack state, centered icon-like enemy sprite, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `nun_spirit_hit.png`

- 尺寸：224x224 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; silhouette readable at 64 px; no black rectangle.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. ghost nun elite enemy, dark robe, pale face, small golden halo, purple spirit aura, hit state, centered icon-like enemy sprite, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `nun_spirit_death.png`

- 尺寸：224x224 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; silhouette readable at 64 px; no black rectangle.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. ghost nun elite enemy, dark robe, pale face, small golden halo, purple spirit aura, death state, centered icon-like enemy sprite, no background.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

### assets/bosses/

#### `eclipse_boss_idle.png`

- 尺寸：768x768 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; boss body clear at 420 px runtime size; no dense radial linework.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Fallen moon judge boss, corrupted gothic nun with soft eclipse halo, idle state, strong but uncluttered silhouette, no full-screen thin magic lines.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `eclipse_boss_phase1.png`

- 尺寸：768x768 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; boss body clear at 420 px runtime size; no dense radial linework.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Fallen moon judge boss, corrupted gothic nun with soft eclipse halo, phase1 state, strong but uncluttered silhouette, no full-screen thin magic lines.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `eclipse_boss_phase2.png`

- 尺寸：768x768 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; boss body clear at 420 px runtime size; no dense radial linework.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Fallen moon judge boss, corrupted gothic nun with soft eclipse halo, phase2 state, strong but uncluttered silhouette, no full-screen thin magic lines.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `eclipse_boss_phase3.png`

- 尺寸：768x768 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; boss body clear at 420 px runtime size; no dense radial linework.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Fallen moon judge boss, corrupted gothic nun with soft eclipse halo, phase3 state, strong but uncluttered silhouette, no full-screen thin magic lines.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `eclipse_boss_rage.png`

- 尺寸：768x768 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; boss body clear at 420 px runtime size; no dense radial linework.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Fallen moon judge boss, corrupted gothic nun with soft eclipse halo, rage state, strong but uncluttered silhouette, no full-screen thin magic lines.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `eclipse_boss_hit.png`

- 尺寸：768x768 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; boss body clear at 420 px runtime size; no dense radial linework.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Fallen moon judge boss, corrupted gothic nun with soft eclipse halo, hit state, strong but uncluttered silhouette, no full-screen thin magic lines.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `eclipse_boss_break.png`

- 尺寸：768x768 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; boss body clear at 420 px runtime size; no dense radial linework.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Fallen moon judge boss, corrupted gothic nun with soft eclipse halo, break state, strong but uncluttered silhouette, no full-screen thin magic lines.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `eclipse_boss_death.png`

- 尺寸：768x768 PNG
- 透明：必须真透明
- 验收：Four corners alpha 0; boss body clear at 420 px runtime size; no dense radial linework.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Fallen moon judge boss, corrupted gothic nun with soft eclipse halo, death state, strong but uncluttered silhouette, no full-screen thin magic lines.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `eclipse_boss_portrait.png`

- 尺寸：720x900 PNG
- 透明：不强制透明
- 验收：No text; no watermark; readable face.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Boss upper-body portrait, cold elegant expression, eclipse halo, dark gothic sci-fi costume, UI intro use.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `eclipse_boss_nameplate.png`

- 尺寸：720x180 PNG
- 透明：必须真透明
- 验收：No embedded text; alpha corners 0.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Transparent boss nameplate frame, dark semi-transparent base, thin gold trim, empty center for Canvas text.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

### assets/backgrounds/

#### `bg_stage_base.png`

- 尺寸：720x1280 PNG
- 透明：不强制透明
- 验收：Background stays darker than bullets; no text; no diagonal scan lines; no high-frequency residual strokes.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Opaque dark ruined moon cathedral stage base, low frequency painterly shapes, distant moon and towers, no characters, no UI, no bright line art.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `bg_stage_depth.png`

- 尺寸：720x1280 PNG
- 透明：必须真透明
- 验收：Background stays darker than bullets; no text; no diagonal scan lines; no high-frequency residual strokes.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Transparent depth layer with large soft silhouettes and atmospheric arches only, no fine window bars.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `bg_boss_eclipse_overlay.png`

- 尺寸：720x1280 PNG
- 透明：必须真透明
- 验收：Background stays darker than bullets; no text; no diagonal scan lines; no high-frequency residual strokes.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Transparent boss-phase purple-red eclipse atmosphere overlay, soft glow only.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `bg_fog_layer.png`

- 尺寸：720x1280 PNG
- 透明：必须真透明
- 验收：Background stays darker than bullets; no text; no diagonal scan lines; no high-frequency residual strokes.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Transparent soft fog layer, very subtle, no hard edges.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `bg_particles_subtle.png`

- 尺寸：720x1280 PNG
- 透明：必须真透明
- 验收：Background stays darker than bullets; no text; no diagonal scan lines; no high-frequency residual strokes.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. Transparent tiny dust particle layer, sparse and dim.
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

### assets/ui/

#### `ui_hp_bar_player.png`

- 尺寸：512x128 PNG
- 透明：必须真透明
- 验收：No watermark; no embedded Chinese/English labels except digit reference; readable over dark gameplay.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. player HP bar frame, dark transparent base, thin gold trim, no text
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `ui_hp_bar_boss.png`

- 尺寸：512x128 PNG
- 透明：必须真透明
- 验收：No watermark; no embedded Chinese/English labels except digit reference; readable over dark gameplay.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. boss HP bar frame, dark transparent base, thin gold trim, no text
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `ui_energy_bar.png`

- 尺寸：512x128 PNG
- 透明：必须真透明
- 验收：No watermark; no embedded Chinese/English labels except digit reference; readable over dark gameplay.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. energy bar frame, dark transparent base, blue-white accent, no text
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `ui_skill_frame.png`

- 尺寸：128x128 PNG
- 透明：必须真透明
- 验收：No watermark; no embedded Chinese/English labels except digit reference; readable over dark gameplay.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. skill icon frame, dark purple base, thin gold trim, no text
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `ui_skill_beam.png`

- 尺寸：128x128 PNG
- 透明：必须真透明
- 验收：No watermark; no embedded Chinese/English labels except digit reference; readable over dark gameplay.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. moonlight beam skill icon, no text
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `ui_skill_bomb.png`

- 尺寸：128x128 PNG
- 透明：必须真透明
- 验收：No watermark; no embedded Chinese/English labels except digit reference; readable over dark gameplay.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. eclipse ultimate skill icon, no text
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `ui_pause_panel.png`

- 尺寸：720x420 PNG
- 透明：必须真透明
- 验收：No watermark; no embedded Chinese/English labels except digit reference; readable over dark gameplay.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. pause panel frame, empty center, no text
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `ui_victory_panel.png`

- 尺寸：720x420 PNG
- 透明：必须真透明
- 验收：No watermark; no embedded Chinese/English labels except digit reference; readable over dark gameplay.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. victory panel frame, empty center, no text
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `ui_gameover_panel.png`

- 尺寸：720x420 PNG
- 透明：必须真透明
- 验收：No watermark; no embedded Chinese/English labels except digit reference; readable over dark gameplay.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. gameover panel frame, empty center, no text
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `ui_boss_warning.png`

- 尺寸：720x180 PNG
- 透明：必须真透明
- 验收：No watermark; no embedded Chinese/English labels except digit reference; readable over dark gameplay.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. boss warning panel frame, empty center, no text
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `ui_stage_clear.png`

- 尺寸：720x180 PNG
- 透明：必须真透明
- 验收：No watermark; no embedded Chinese/English labels except digit reference; readable over dark gameplay.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. stage clear panel frame, empty center, no text
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `ui_combo_number_style.png`

- 尺寸：512x128 PNG
- 透明：必须真透明
- 验收：No watermark; no embedded Chinese/English labels except digit reference; readable over dark gameplay.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. digit style reference, numbers only if required by model, no logo
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

### assets/bullets/

#### `bullet_gold_orb.png`

- 尺寸：128x128 PNG
- 透明：必须真透明
- 验收：Readable at runtime scale; alpha corners 0; no fuzzy blob that hides hitbox.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. gold enemy orb bullet, bright core, crisp edge
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `bullet_white_needle.png`

- 尺寸：128x128 PNG
- 透明：必须真透明
- 验收：Readable at runtime scale; alpha corners 0; no fuzzy blob that hides hitbox.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. white needle bullet, slender but not too thin
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `bullet_purple_moon.png`

- 尺寸：128x128 PNG
- 透明：必须真透明
- 验收：Readable at runtime scale; alpha corners 0; no fuzzy blob that hides hitbox.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. purple crescent moon bullet, simple silhouette
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `bullet_red_warning.png`

- 尺寸：128x128 PNG
- 透明：必须真透明
- 验收：Readable at runtime scale; alpha corners 0; no fuzzy blob that hides hitbox.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. red warning marker, clearly telegraph not damage bullet
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `bullet_laser_core.png`

- 尺寸：128x128 PNG
- 透明：必须真透明
- 验收：Readable at runtime scale; alpha corners 0; no fuzzy blob that hides hitbox.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. straight laser core segment, white-purple center
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `bullet_laser_glow.png`

- 尺寸：128x128 PNG
- 透明：必须真透明
- 验收：Readable at runtime scale; alpha corners 0; no fuzzy blob that hides hitbox.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. soft laser outer glow segment
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

### assets/vfx/

#### `vfx_player_shot.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：No long ray lines; transparent corners; effect does not look like background residue.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. small blue-white muzzle burst, compact
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `vfx_player_beam.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：No long ray lines; transparent corners; effect does not look like background residue.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. vertical moonlight beam tile, soft glow and clear core
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `vfx_player_ultimate_circle.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：No long ray lines; transparent corners; effect does not look like background residue.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. soft expanding eclipse pulse, no hard radial spokes
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `vfx_enemy_hit.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：No long ray lines; transparent corners; effect does not look like background residue.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. compact purple enemy hit burst
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `vfx_boss_hit.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：No long ray lines; transparent corners; effect does not look like background residue.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. larger gold-blue boss hit burst
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `vfx_boss_break.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：No long ray lines; transparent corners; effect does not look like background residue.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. soft barrier break particles, no long rays
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `vfx_explosion_small.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：No long ray lines; transparent corners; effect does not look like background residue.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. small magical explosion, round particles
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `vfx_explosion_large.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：No long ray lines; transparent corners; effect does not look like background residue.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. large magical explosion, round particles
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `vfx_graze.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：No long ray lines; transparent corners; effect does not look like background residue.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. tiny graze shimmer
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```

#### `vfx_clear_bullets.png`

- 尺寸：256x256 PNG
- 透明：必须真透明
- 验收：No long ray lines; transparent corners; effect does not look like background residue.

Prompt:

```text
Original dark gothic sci-fi anime vertical bullet hell game asset, moon eclipse fantasy, polished 2D game illustration, high contrast, clean silhouette, not copied from any existing game. soft bullet clear wave, no hard rings
```

Negative prompt:

```text
lowres, blurry, watermark, text, logo, signature, cropped subject, cut off, black background, fake transparency, residual lines, stray outlines, extraction artifacts, muddy colors, oversaturated, copyrighted game character, copied design, messy unreadable silhouette, duplicate limbs, bad hands
```
