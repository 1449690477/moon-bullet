# 《生命之母》STG 战机开发落地指导文档

> 项目类型：HTML / Canvas / WebGL 2D 弹幕射击小游戏  
> 战机名称：生命之母  
> 定位：高风险高收益、生命汲取、治疗反转、持续压制型战机  
> 美术关键词：透明水晶鳞片、粉白圣光、花冠光环、蝶翼晶羽、生命飘带、心形生命核心、圣洁胎宫领域  
> 适用对象：程序员、特效程序、美术整合、数值策划

---

## 1. 战机总体介绍

“生命之母”是一款以生命汲取为核心机制的特殊战机。它不是传统的直线射击型战机，而是通过“生命飘带”与敌人建立持续连接，抽取敌人的生命值，同时自身也会不断损失生命值。

它的核心体验是：

- 平时通过生命飘带持续压制敌人。
- 自身生命越低，吸血伤害越高。
- 生命值低于 10% 后进入反转回血阶段。
- 暴走状态下所有飘带全开，形成高密度吸血与回血循环。
- 小技能可以把全场敌人连成生命网络。
- 大招展开圣域胎宫，进行全屏吸血、控制、爆发和自我恢复。

这架战机的设计重点不是“子弹很多”，而是“连接很多、吸血很爽、濒死反杀很强”。

---

## 2. 美术外形设定

### 2.1 最终采用外形

采用新版外形：

- 删除原本麻花辫式尾部。
- 改为透明水晶鳞片结构。
- 战机下半部分由多层半透明粉白水晶鳞片组成。
- 鳞片像鱼鳞、羽毛、花瓣三者的结合体。
- 机体整体呈现“圣洁生命体 + 花神战机 + 水晶蝶翼”的感觉。

### 2.2 主要视觉部件

| 部件 | 说明 | 程序表现建议 |
|---|---|---|
| 花冠光环 | 位于机体上方，象征生命领域核心 | 可轻微旋转、闪烁、呼吸缩放 |
| 心形生命核心 | 位于机体中央，是吸血与回血的能量来源 | 根据 HP 变化改变亮度 |
| 蝶翼晶羽 | 两侧大面积透明晶翼 | 常态轻微摆动，暴走时发光增强 |
| 透明水晶鳞片尾翼 | 取代麻花辫的新尾部结构 | 可做轻微波动或层叠闪光 |
| 生命飘带 | 连接敌人的粉白光带 | 用代码曲线绘制为主，贴图辅助 |
| 花瓣粒子 | 战机移动、技能释放时飘落 | 粒子系统循环生成 |
| 圣域莲花 | 大招展开时的领域图案 | 大贴图缩放 + 旋转 + 透明度变化 |

---

## 3. 资源贴图使用说明

本战机已有多张纯绿色背景素材图，建议程序员不要直接整张使用，而是切割成独立 PNG 或通过绿幕抠图生成透明 PNG。

### 3.1 推荐资源目录结构

```text
assets/
  player/
    mother_life/
      ship/
        ship_main.png
        ship_top.png
        ship_side.png
        ship_back.png
        ship_boost.png
        ship_core_heart.png
        ship_halo.png
        ship_wing_left.png
        ship_wing_right.png
        ship_scale_tail.png
        ship_scale_piece_01.png
        ship_scale_piece_02.png

      ribbons/
        ribbon_normal_01.png
        ribbon_normal_02.png
        ribbon_normal_curve_01.png
        ribbon_normal_loop_01.png
        ribbon_tip_01.png
        ribbon_origin_flare.png
        ribbon_pulse_orb.png

      berserk/
        ribbon_berserk_01.png
        ribbon_berserk_spiral_01.png
        ribbon_berserk_orbit_01.png
        aura_berserk_ring.png
        aura_berserk_bloom.png

      skill_space/
        life_link_node.png
        life_link_chain.png
        life_link_web.png
        target_high_hp.png
        resonance_ring.png
        resonance_heart_core.png

      ultimate/
        domain_lotus_large.png
        domain_magic_circle.png
        domain_halo_ring.png
        domain_crystal_cocoon.png
        domain_life_tree.png
        ultimate_bloom_explosion.png
        ultimate_final_flash.png
        ultimate_shockwave_ring.png

      particles/
        particle_petal_01.png
        particle_petal_02.png
        particle_spark_01.png
        particle_star_01.png
        particle_butterfly_01.png
        particle_heal_orb.png
        particle_crystal_dust.png
        particle_soft_glow.png
        particle_smoke_pink.png

      icons/
        icon_passive_drain.png
        icon_ribbon_expand.png
        icon_low_hp_reverse.png
        icon_heal.png
        icon_berserk.png
        icon_life_resonance.png
        icon_ultimate_womb.png
        icon_warning_hp.png
```

---

## 4. 贴图抠图与处理建议

### 4.1 绿色背景处理

素材为纯绿色背景，推荐程序预处理成透明 PNG，而不是运行时实时抠图。

推荐抠图逻辑：

```js
function chromaKeyGreen(imageData) {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // 纯绿背景判断
    const isGreen =
      g > 180 &&
      r < 120 &&
      b < 120 &&
      g > r * 1.4 &&
      g > b * 1.4;

    if (isGreen) {
      data[i + 3] = 0;
    }
  }

  return imageData;
}
```

### 4.2 边缘残留处理

为了避免绿色边缘残留，建议美术预处理时：

```text
1. 先用色彩范围选择绿色背景。
2. 扩展选区 1-2 px。
3. 羽化 0.5 px。
4. 删除背景。
5. 对边缘执行去色边 / Defringe 1 px。
6. 导出 PNG-32。
```

程序侧可以补充：

```js
function removeGreenSpill(r, g, b) {
  if (g > r && g > b) {
    g = Math.min(g, Math.max(r, b) + 20);
  }
  return [r, g, b];
}
```

---

## 5. 战机基础参数建议

### 5.1 战机定位

| 项目 | 建议 |
|---|---|
| 机体尺寸 | 中型偏大 |
| 移动速度 | 中等 |
| 攻击范围 | 中远距离 |
| 操作难度 | 高 |
| 生存方式 | 吸血、自损、反转回血 |
| 核心风险 | 常态持续扣血 |
| 爆发方式 | 低血量高倍率吸血 + 大招全屏爆发 |

### 5.2 基础数值建议

```js
const MotherLifeStats = {
  maxHp: 1000,
  baseAttack: 100,
  moveSpeed: 4.2,

  ribbonDefaultCount: 4,
  ribbonMaxCount: 8,
  ribbonGrowInterval: 6.0,

  selfDamagePerSecond: 0.015, // 每秒损失最大生命 1.5%
  reverseHpThreshold: 0.10,   // 低于 10% 进入反转回血
  reverseHealTarget: 1.0,     // 回满 100% 后重新自损

  berserkDamageMultiplier: 1.8,
  berserkDrainRateMultiplier: 2.0,
  berserkHealMultiplier: 2.0
};
```

---

## 6. 核心机制：生命飘带

### 6.1 普通弹幕机制

普通弹幕不是普通子弹，而是“生命飘带连接”。

机制：

```text
默认 4 条生命飘带。
随时间逐渐增加，最多 8 条。
每条飘带自动寻找敌人并连接。
连接后每秒对敌人造成持续伤害。
如果只有一个敌人，所有飘带可以连接同一个目标。
同一目标受到多条飘带时，伤害按飘带数量叠加。
自身在吸血阶段会持续扣血。
自身生命越低，飘带伤害越高。
生命低于 10% 时进入反转回血阶段。
```

### 6.2 飘带数量增长

```js
function updateRibbonCount(player, dt) {
  player.ribbonTimer += dt;

  if (
    player.ribbonTimer >= player.ribbonGrowInterval &&
    player.ribbonCount < player.ribbonMaxCount
  ) {
    player.ribbonTimer = 0;
    player.ribbonCount += 1;
  }
}
```

### 6.3 目标选择逻辑

推荐优先级：

```text
1. Boss
2. 精英敌人
3. 距离玩家最近的敌人
4. 血量最高的敌人
5. 普通小怪
```

如果敌人数量小于飘带数量，可以允许多条飘带重复连接同一个目标。

```js
function selectRibbonTargets(enemies, ribbonCount) {
  const alive = enemies.filter(e => e.alive);

  if (alive.length === 0) return [];

  alive.sort((a, b) => {
    const scoreA = getTargetScore(a);
    const scoreB = getTargetScore(b);
    return scoreB - scoreA;
  });

  const targets = [];

  for (let i = 0; i < ribbonCount; i++) {
    targets.push(alive[i % alive.length]);
  }

  return targets;
}

function getTargetScore(enemy) {
  let score = 0;
  if (enemy.type === "boss") score += 1000;
  if (enemy.type === "elite") score += 500;
  score += enemy.hp / enemy.maxHp * 100;
  score -= enemy.distanceToPlayer * 0.1;
  return score;
}
```

---

## 7. 低血量增伤与反转回血

### 7.1 低血量伤害倍率

这是该战机最重要的爽点。

建议倍率给高，因为它本身会自损。

| HP 区间 | 吸血伤害倍率 |
|---|---|
| 100% - 70% | 1.0x |
| 70% - 40% | 1.6x |
| 40% - 20% | 2.5x |
| 20% - 10% | 4.0x |
| 10% 以下 | 进入反转回血，伤害 3.0x，回血效率极高 |

```js
function getLowHpMultiplier(player) {
  const hpRate = player.hp / player.maxHp;

  if (hpRate > 0.7) return 1.0;
  if (hpRate > 0.4) return 1.6;
  if (hpRate > 0.2) return 2.5;
  if (hpRate > 0.1) return 4.0;

  return 3.0; // 反转回血阶段
}
```

### 7.2 自损阶段

```js
function updateSelfDamage(player, dt) {
  if (player.isReverseHealing) return;
  if (player.isUltimateActive) return;

  const loss = player.maxHp * player.selfDamagePerSecond * dt;
  player.hp = Math.max(player.hp - loss, 1);

  if (player.hp / player.maxHp <= player.reverseHpThreshold) {
    startReverseHealing(player);
  }
}
```

### 7.3 反转回血阶段

```js
function startReverseHealing(player) {
  player.isReverseHealing = true;
  player.reverseHealTimer = 0;

  // 特效：心核爆亮、飘带颜色变为白粉金、机体光环扩散
  spawnEffect("reverse_heal_burst", player.x, player.y);
}

function updateReverseHealing(player, dt, totalDrainDamage) {
  if (!player.isReverseHealing) return;

  const heal = totalDrainDamage * 0.8;
  player.hp = Math.min(player.maxHp, player.hp + heal);

  if (player.hp >= player.maxHp) {
    player.isReverseHealing = false;
    player.ribbonTimer = 0;
    spawnEffect("reverse_complete_ring", player.x, player.y);
  }
}
```

### 7.4 视觉表现

自损阶段：

```text
心形核心微暗。
机体边缘出现粉紫色细线。
飘带像在抽血，光点从敌人流向战机。
HP 越低，飘带越亮、越粗、跳动越明显。
```

反转回血阶段：

```text
心形核心瞬间爆亮。
飘带从粉色变成粉白金。
绿色/粉白治疗光球从敌人方向流向战机。
战机周围出现莲花状回血光环。
HP 回满时产生一次柔和圆形冲击波。
```

---

## 8. 普通飘带特效实现

### 8.1 推荐实现方式

不要完全依赖贴图。飘带应主要由代码绘制，再叠加贴图。

推荐组合：

```text
Canvas 贝塞尔曲线主线
+ 半透明粉白描边
+ 发光阴影
+ 沿线移动的光点
+ 飘带端点贴图
+ 少量花瓣粒子
```

### 8.2 Canvas 绘制飘带

```js
function drawLifeRibbon(ctx, from, to, time, options = {}) {
  const amp = options.amp ?? 40;
  const width = options.width ?? 4;
  const alpha = options.alpha ?? 0.8;
  const color = options.color ?? "rgba(255, 150, 220, 1)";

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  const wave = Math.sin(time * 4 + from.x * 0.01) * amp;

  const ctrlX = midX - dy * 0.15;
  const ctrlY = midY + dx * 0.15 + wave;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 外层柔光
  ctx.shadowColor = "rgba(255, 120, 220, 0.9)";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "rgba(255, 120, 220, 0.35)";
  ctx.lineWidth = width * 4;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(ctrlX, ctrlY, to.x, to.y);
  ctx.stroke();

  // 中层飘带
  ctx.shadowBlur = 10;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(ctrlX, ctrlY, to.x, to.y);
  ctx.stroke();

  // 内部白线
  ctx.shadowBlur = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(1, width * 0.35);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(ctrlX, ctrlY, to.x, to.y);
  ctx.stroke();

  ctx.restore();
}
```

### 8.3 沿飘带流动的吸血光点

```js
function getQuadraticBezierPoint(p0, p1, p2, t) {
  const x =
    (1 - t) * (1 - t) * p0.x +
    2 * (1 - t) * t * p1.x +
    t * t * p2.x;

  const y =
    (1 - t) * (1 - t) * p0.y +
    2 * (1 - t) * t * p1.y +
    t * t * p2.y;

  return { x, y };
}

function drawDrainPulse(ctx, from, control, to, time) {
  const t = (time * 0.8) % 1;
  const p = getQuadraticBezierPoint(to, control, from, t);

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.shadowColor = "rgba(255, 220, 255, 1)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(255, 230, 255, 1)";
  ctx.beginPath();
  ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
```

注意这里从 `to` 到 `from`，表示生命从敌人流向玩家。

---

## 9. 暴走状态设计

### 9.1 暴走触发

暴走可以作为外部系统，也可以在战机能量满时触发。

建议暴走持续 8 秒。

```js
const BerserkConfig = {
  duration: 8,
  ribbonCount: 8,
  damageMultiplier: 1.8,
  drainTickRate: 2.0,
  healMultiplier: 2.0,
  damageReduction: 0.2
};
```

### 9.2 暴走期间机制

```text
飘带直接提升到 8 条。
飘带伤害提高。
吸血 tick 频率提高。
自我回血速度提高。
机体周围出现环绕飘带。
受到伤害降低 20%。
```

### 9.3 暴走视觉表现

```text
1. 机体花冠光环变大。
2. 心形核心变为高亮粉白色。
3. 两侧晶翼边缘出现强光。
4. 透明水晶鳞片尾翼逐层闪烁。
5. 8 条飘带全部展开。
6. 额外生成 2-3 圈环绕飘带。
7. 屏幕轻微粉紫色滤镜。
8. 玩家周围持续生成花瓣粒子。
```

### 9.4 暴走环绕飘带绘制

```js
function drawBerserkOrbitRibbons(ctx, player, time) {
  const ringCount = 3;

  for (let i = 0; i < ringCount; i++) {
    const radiusX = 70 + i * 22;
    const radiusY = 35 + i * 12;
    const rotation = time * (0.8 + i * 0.25);

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(rotation);
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = "rgba(255, 140, 230, 0.9)";
    ctx.lineWidth = 3 + i;
    ctx.shadowColor = "rgba(255, 120, 220, 1)";
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
```

---

## 10. 空格小技能：生命共鸣

### 10.1 技能说明

技能名：生命共鸣  
持续时间：6 秒  
冷却时间：14 秒

释放后：

```text
将在场所有敌人的生命互相连接。
所有飘带合并为一根粗大的主生命飘带。
主飘带锁定当前 HP 最高的敌人。
其他敌人通过生命链与主目标相连。
持续期间，新入场敌人自动加入生命链。
所有敌人共享伤害。
```

### 10.2 数值建议

```js
const LifeResonanceConfig = {
  duration: 6,
  cooldown: 14,
  mainTargetDamagePerSecond: 1.8, // 攻击力 180% / 秒
  sharedDamageRatio: 0.45,
  newEnemyLinkDelay: 0.5
};
```

### 10.3 目标逻辑

```js
function getHighestHpEnemy(enemies) {
  return enemies
    .filter(e => e.alive)
    .sort((a, b) => b.hp - a.hp)[0] ?? null;
}
```

### 10.4 技能更新

```js
function updateLifeResonance(player, enemies, dt) {
  if (!player.lifeResonance.active) return;

  player.lifeResonance.timer -= dt;

  const alive = enemies.filter(e => e.alive);
  const mainTarget = getHighestHpEnemy(alive);

  if (!mainTarget) return;

  const mainDamage =
    player.baseAttack *
    LifeResonanceConfig.mainTargetDamagePerSecond *
    dt;

  mainTarget.takeDamage(mainDamage);

  for (const enemy of alive) {
    if (enemy === mainTarget) continue;

    enemy.takeDamage(mainDamage * LifeResonanceConfig.sharedDamageRatio);
  }

  const totalDamage =
    mainDamage +
    mainDamage * LifeResonanceConfig.sharedDamageRatio * (alive.length - 1);

  healPlayerFromDrain(player, totalDamage, 0.2);

  if (player.lifeResonance.timer <= 0) {
    player.lifeResonance.active = false;
  }
}
```

### 10.5 小技能视觉

小技能要做到“全场被一张生命网锁住”。

推荐视觉层级：

```text
第一层：屏幕轻微变暗，出现粉白色滤镜。
第二层：主目标身上出现大号心形/花形标记。
第三层：玩家到主目标绘制一条粗生命飘带。
第四层：主目标向其他敌人绘制细生命链。
第五层：敌人之间出现节点网络。
第六层：每次 tick 伤害时，节点闪烁一次。
```

### 10.6 网络连线绘制

```js
function drawLifeResonanceNetwork(ctx, player, enemies, mainTarget, time) {
  if (!mainTarget) return;

  drawLifeRibbon(ctx, player, mainTarget, time, {
    width: 9,
    alpha: 0.95,
    color: "rgba(255, 190, 240, 1)"
  });

  for (const enemy of enemies) {
    if (!enemy.alive || enemy === mainTarget) continue;

    drawLifeRibbon(ctx, mainTarget, enemy, time, {
      width: 3,
      alpha: 0.65,
      color: "rgba(255, 170, 220, 0.9)"
    });

    drawLinkNode(ctx, enemy.x, enemy.y, time);
  }

  drawHighHpTargetReticle(ctx, mainTarget.x, mainTarget.y, time);
}
```

---

## 11. X 技能大招：众生胎宫

### 11.1 大招定位

大招名：众生胎宫  
类型：全屏领域、吸血、束缚、回血、终结爆发  
建议持续：6 秒  
推荐释放条件：能量满 / CD 45 秒

大招是该战机的视觉高潮，不要只做成全屏伤害。它应该是一个完整演出：

```text
0.0 - 0.5 秒：圣域展开
0.5 - 4.8 秒：全屏连接 + 持续吸血 + 回血
4.8 - 5.5 秒：生命能量回流，花核蓄满
5.5 - 6.0 秒：圣花终章，全屏爆发
```

### 11.2 大招数值建议

```js
const UltimateWombConfig = {
  duration: 6,
  cooldown: 45,

  drainDuration: 5,
  drainDpsMultiplier: 2.2,

  lowHpDrainMultiplier: 3.5,
  healRatio: 0.25,
  lowHpHealRatio: 0.45,

  finalExplosionMultiplier: 12.0,
  criticalFinalMultiplier: 2.0,

  criticalHpThreshold: 0.1,
  lowHpThreshold: 0.3
};
```

### 11.3 大招伤害逻辑

```js
function castUltimateWomb(player) {
  player.ultimate.active = true;
  player.ultimate.timer = UltimateWombConfig.duration;
  player.ultimate.phase = "expand";

  spawnEffect("ultimate_domain_expand", player.x, player.y);
  screenShake(0.4, 4);
}

function updateUltimateWomb(player, enemies, dt) {
  if (!player.ultimate.active) return;

  player.ultimate.timer -= dt;

  const elapsed = UltimateWombConfig.duration - player.ultimate.timer;
  const hpRate = player.hp / player.maxHp;

  if (elapsed < 0.5) {
    player.ultimate.phase = "expand";
  } else if (elapsed < 4.8) {
    player.ultimate.phase = "drain";
  } else if (elapsed < 5.5) {
    player.ultimate.phase = "gather";
  } else {
    player.ultimate.phase = "burst";
  }

  if (player.ultimate.phase === "drain") {
    let dps =
      player.baseAttack *
      UltimateWombConfig.drainDpsMultiplier;

    if (hpRate < UltimateWombConfig.lowHpThreshold) {
      dps *= UltimateWombConfig.lowHpDrainMultiplier;
    }

    let totalDamage = 0;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;

      const damage = dps * dt;
      enemy.takeDamage(damage);
      totalDamage += damage;
    }

    const healRatio =
      hpRate < UltimateWombConfig.lowHpThreshold
        ? UltimateWombConfig.lowHpHealRatio
        : UltimateWombConfig.healRatio;

    healPlayerFromDrain(player, totalDamage, healRatio);
  }

  if (player.ultimate.phase === "burst" && !player.ultimate.burstDone) {
    doUltimateFinalBurst(player, enemies);
    player.ultimate.burstDone = true;
  }

  if (player.ultimate.timer <= 0) {
    player.ultimate.active = false;
    player.ultimate.burstDone = false;
  }
}

function doUltimateFinalBurst(player, enemies) {
  const hpRate = player.hp / player.maxHp;

  let damage =
    player.baseAttack *
    UltimateWombConfig.finalExplosionMultiplier;

  if (hpRate < UltimateWombConfig.criticalHpThreshold) {
    damage *= UltimateWombConfig.criticalFinalMultiplier;
    player.hp = Math.max(player.hp, player.maxHp * 0.5);
  }

  for (const enemy of enemies) {
    if (enemy.alive) {
      enemy.takeDamage(damage);
    }
  }

  spawnEffect("ultimate_final_bloom", player.x, player.y);
  screenShake(0.7, 10);
  flashScreen("rgba(255, 220, 255, 0.75)", 0.25);
}
```

---

## 12. 大招视觉制作方案

### 12.1 视觉分层

大招不要完全依赖一张大贴图，建议拆成多层：

```text
Layer 1：屏幕滤镜层
Layer 2：圣域莲花大贴图
Layer 3：魔法阵旋转层
Layer 4：敌人标记层
Layer 5：生命连接线层
Layer 6：花瓣与水晶粒子层
Layer 7：最终爆发层
Layer 8：白闪与屏幕震动
```

### 12.2 阶段 1：圣域展开

使用贴图：

```text
domain_lotus_large.png
domain_magic_circle.png
domain_halo_ring.png
particle_petal_01.png
```

实现：

```js
function drawUltimateExpand(ctx, player, elapsed) {
  const t = Math.min(elapsed / 0.5, 1);
  const ease = easeOutCubic(t);

  drawScreenTint(ctx, `rgba(80, 20, 80, ${0.25 * ease})`);

  drawSprite(ctx, assets.domain_lotus_large, {
    x: player.x,
    y: player.y,
    scale: 0.2 + ease * 2.5,
    rotation: elapsed * 0.3,
    alpha: ease * 0.85
  });

  drawSprite(ctx, assets.domain_magic_circle, {
    x: player.x,
    y: player.y,
    scale: 0.5 + ease * 2.0,
    rotation: -elapsed * 0.6,
    alpha: ease
  });
}
```

### 12.3 阶段 2：持续吸血领域

```text
所有敌人身上出现生命印记。
敌人与玩家之间出现淡粉生命线。
战场底部有持续旋转的圣域莲花。
玩家周围不断有治疗光球回流。
```

实现重点：

```js
function drawUltimateDrain(ctx, player, enemies, time) {
  drawSprite(ctx, assets.domain_magic_circle, {
    x: player.x,
    y: player.y,
    scale: 2.2 + Math.sin(time * 2) * 0.05,
    rotation: time * 0.2,
    alpha: 0.55
  });

  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    drawLifeRibbon(ctx, player, enemy, time, {
      width: 4,
      alpha: 0.45,
      color: "rgba(255, 180, 240, 0.85)"
    });

    drawSprite(ctx, assets.life_mark, {
      x: enemy.x,
      y: enemy.y - enemy.radius - 10,
      scale: 0.45 + Math.sin(time * 5) * 0.05,
      rotation: time,
      alpha: 0.9
    });
  }
}
```

### 12.4 阶段 3：能量回流

表现：

```text
所有飘带从敌人收回到玩家核心。
玩家心形核心越来越亮。
屏幕中心出现巨大花核。
粒子向内吸入。
```

可以用代码把粒子速度指向玩家：

```js
function updateGatherParticles(particles, player, dt) {
  for (const p of particles) {
    const dx = player.x - p.x;
    const dy = player.y - p.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    p.vx += (dx / len) * 120 * dt;
    p.vy += (dy / len) * 120 * dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}
```

### 12.5 阶段 4：圣花终章爆发

使用贴图：

```text
ultimate_bloom_explosion.png
ultimate_final_flash.png
ultimate_shockwave_ring.png
particle_petal_01.png
particle_crystal_dust.png
```

实现：

```js
function drawUltimateFinalBurst(ctx, player, burstTime) {
  const t = Math.min(burstTime / 0.6, 1);
  const ease = easeOutCubic(t);

  drawSprite(ctx, assets.ultimate_final_flash, {
    x: player.x,
    y: player.y,
    scale: 0.5 + ease * 4.0,
    rotation: burstTime * 0.2,
    alpha: 1 - t
  });

  drawSprite(ctx, assets.ultimate_bloom_explosion, {
    x: player.x,
    y: player.y,
    scale: 0.3 + ease * 3.2,
    rotation: burstTime * 0.5,
    alpha: 0.95 * (1 - t * 0.3)
  });

  drawSprite(ctx, assets.ultimate_shockwave_ring, {
    x: player.x,
    y: player.y,
    scale: 0.2 + ease * 5.5,
    alpha: 1 - t
  });
}
```

---

## 13. 战机渲染层级建议

推荐渲染顺序：

```text
1. 背景
2. 敌人
3. 敌人弹幕
4. 玩家普通飘带连接线底光
5. 玩家战机本体
6. 玩家飘带亮线与光点
7. 玩家技能特效
8. 粒子
9. UI / 血条 / 技能图标
10. 屏幕白闪 / 滤镜
```

注意：  
生命飘带既需要“在玩家下面的连接感”，也需要“在玩家上面的高光感”。  
所以可以分两次画：

```text
先画飘带底光
再画战机
再画飘带高光和流动光点
```

---

## 14. 粒子系统建议

### 14.1 通用粒子结构

```js
class Particle {
  constructor(x, y, vx, vy, life, sprite, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.sprite = sprite;
    this.scale = options.scale ?? 1;
    this.rotation = options.rotation ?? 0;
    this.rotationSpeed = options.rotationSpeed ?? 0;
    this.alpha = options.alpha ?? 1;
    this.blend = options.blend ?? "source-over";
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed * dt;
  }

  draw(ctx) {
    const t = this.life / this.maxLife;
    drawSprite(ctx, this.sprite, {
      x: this.x,
      y: this.y,
      scale: this.scale,
      rotation: this.rotation,
      alpha: this.alpha * t,
      blend: this.blend
    });
  }
}
```

### 14.2 普通状态粒子

```text
少量粉色花瓣。
少量白色星点。
心核周围微弱光点。
尾翼水晶鳞片偶尔闪光。
```

### 14.3 暴走状态粒子

```text
花瓣数量增加。
粒子速度变快。
出现粉白金光点螺旋。
尾翼鳞片连续闪光。
屏幕边缘出现粉紫闪烁。
```

### 14.4 大招粒子

```text
全屏花瓣。
水晶碎光。
圣域粉白粒子雨。
中心吸入粒子。
最终爆发向外喷射花瓣和水晶碎片。
```

---

## 15. 贴图与代码融合原则

这个战机不能只靠贴图，也不能只靠代码。推荐原则：

### 15.1 贴图负责

```text
复杂美术细节：
- 战机本体
- 心形核心
- 花冠光环
- 蝶翼晶羽
- 水晶鳞片尾翼
- 莲花领域
- 大爆发主图
- 技能图标
- 特殊节点和徽章
```

### 15.2 代码负责

```text
动态连接：
- 飘带曲线
- 生命链连接
- 光点流动
- 粒子生成
- 闪烁
- 缩放
- 旋转
- 透明度变化
- 屏幕震动
- 白闪
- 色彩滤镜
```

### 15.3 最佳融合方式

```text
用代码绘制大面积动态光效。
用贴图补充复杂花纹、端点、核心、爆发图案。
```

例如飘带：

```text
不建议：
直接把一整根飘带贴图拉伸到敌人身上。

建议：
用 Canvas 曲线画主连接线。
再在曲线起点放 origin_flare。
在终点放 ribbon_tip。
沿曲线生成 pulse_orb。
偶尔生成 petal_particle。
```

这样性能更好，也更自然。

---

## 16. 性能优化建议

### 16.1 移动端粒子数量

```text
普通状态：20 - 40 个粒子
暴走状态：60 - 100 个粒子
小技能：80 - 120 个粒子
大招：120 - 200 个粒子
```

如果手机性能不足：

```text
粒子数量减半。
大招领域贴图只保留 2 层。
关闭部分阴影 blur。
减少 Canvas shadowBlur。
```

### 16.2 离屏缓存

复杂大贴图、魔法阵、光环可以缓存：

```js
const offscreen = document.createElement("canvas");
const offCtx = offscreen.getContext("2d");
```

尤其是：

```text
domain_magic_circle
ultimate_bloom
halo_ring
ship_main
```

### 16.3 发光优化

Canvas `shadowBlur` 很耗性能。建议：

```text
普通游戏过程中少用大范围 shadowBlur。
大招演出可以短时间使用。
常驻发光尽量用预制 glow 贴图。
```

---

## 17. 状态机设计

### 17.1 玩家状态

```js
const PlayerState = {
  NORMAL: "normal",
  REVERSE_HEALING: "reverse_healing",
  BERSERK: "berserk",
  SPACE_SKILL: "space_skill",
  ULTIMATE: "ultimate",
  DEAD: "dead"
};
```

### 17.2 战机数据结构

```js
const player = {
  x: 0,
  y: 0,
  hp: 1000,
  maxHp: 1000,
  baseAttack: 100,

  state: PlayerState.NORMAL,

  ribbonCount: 4,
  ribbonTimer: 0,
  ribbonGrowInterval: 6,

  isReverseHealing: false,
  isBerserk: false,

  lifeResonance: {
    active: false,
    timer: 0,
    cooldown: 0
  },

  ultimate: {
    active: false,
    timer: 0,
    cooldown: 0,
    phase: "none",
    burstDone: false
  }
};
```

---

## 18. 输入设计

建议：

```text
移动：WASD / 方向键 / 虚拟摇杆
普通攻击：自动释放生命飘带
空格：生命共鸣
X：众生胎宫
Shift：低速移动，可选
```

移动端：

```text
左侧虚拟摇杆移动。
右侧两个按钮：
- 小技能
- 大招
```

---

## 19. UI 显示建议

因为该战机会自损，血条表现很重要。

### 19.1 血条

建议血条分三段色彩：

```text
100%-40%：粉白
40%-10%：深粉紫，提示高风险高收益
10%以下：闪烁金白，提示反转回血
```

### 19.2 飘带数量提示

可以在玩家附近或 UI 角落显示：

```text
生命飘带：4 / 8
```

也可以用小花瓣图标表示数量。

### 19.3 反转回血提示

当 HP 低于 10%：

```text
屏幕边缘出现粉白光。
心形核心图标闪烁。
血条出现“反哺”动画。
```

---

## 20. 开发优先级建议

### 第一阶段：能玩

目标：机制跑通。

```text
1. 导入战机本体 PNG。
2. 实现生命飘带自动锁敌。
3. 实现持续吸血伤害。
4. 实现自损。
5. 实现低血量增伤。
6. 实现 10% 以下反转回血。
7. 实现简单飘带曲线。
```

### 第二阶段：好看

目标：视觉有战机特色。

```text
1. 加入心核呼吸光。
2. 加入花瓣粒子。
3. 加入飘带流动光点。
4. 加入敌人生命印记。
5. 加入水晶鳞片尾部闪光。
6. 加入暴走环绕飘带。
```

### 第三阶段：完整技能

```text
1. 实现空格技能生命共鸣。
2. 实现大招众生胎宫。
3. 加入大招四阶段演出。
4. 加入屏幕震动、白闪、滤镜。
5. 加入 UI 图标和冷却显示。
```

### 第四阶段：优化

```text
1. 粒子数量自适应。
2. 移动端性能优化。
3. 贴图压缩。
4. 离屏缓存。
5. 碰撞和伤害数值微调。
```

---

## 21. 推荐最终体验目标

玩家使用“生命之母”时，应获得以下体验：

```text
平时：
我用柔和的生命飘带持续吸敌人的血。

血量下降：
我越来越危险，但伤害也越来越离谱。

低于 10%：
我没有死，反而进入反转回血，生命力爆发。

暴走：
8 条飘带全开，战机周围像圣花一样展开，所有敌人被吸干。

空格技能：
全屏敌人被一张生命网连接，打一个等于打一群。

X 大招：
整片战场变成圣洁胎宫，所有敌人被生命领域吞没，最终圣花全屏爆发。
```

这款战机的核心关键词是：

```text
温柔外表
危险机制
濒死反杀
吸血循环
圣洁爆发
```

---

## 22. 最终落地检查清单

程序员完成时，请逐项检查：

```text
[ ] 战机外形采用新版水晶鳞片尾翼，而不是麻花辫尾巴
[ ] 普通状态默认 4 条飘带
[ ] 飘带可随时间增加到 8 条
[ ] 单体敌人时多条飘带可叠加在同一目标
[ ] 自身吸血阶段持续扣血
[ ] 自身 HP 越低，吸血伤害越高
[ ] HP 低于 10% 后进入反转回血
[ ] 回满 100% 后重新开始自损循环
[ ] 暴走状态飘带数量直接变 8
[ ] 暴走状态有环绕飘带和强光特效
[ ] 空格技能能连接全场敌人
[ ] 空格技能持续 6 秒
[ ] 新入场敌人能加入生命共鸣网络
[ ] X 大招有圣域展开、持续吸血、能量回流、最终爆发四阶段
[ ] 大招能造成全屏伤害并回血
[ ] 飘带用代码曲线绘制，贴图作为端点/粒子/节点辅助
[ ] 贴图已去绿底并导出透明 PNG
[ ] 移动端粒子数量有上限
[ ] Canvas shadowBlur 使用受控，不造成严重掉帧
```

---

## 23. 给程序员的实现总结

不要把“生命之母”理解成一架普通飞机。  
它本质上是一个“生命连接系统”。

核心开发重点：

```text
1. 目标选择系统
2. 飘带连接系统
3. 自损与回血循环
4. 低血量增伤倍率
5. 全屏生命网络
6. 大招领域演出
7. 贴图和代码光效融合
```

最重要的技术策略是：

```text
复杂造型靠贴图。
动态连接靠代码。
大招氛围靠多层叠加。
粒子负责高级感。
数值负责爽感。
```

只要做到这几点，这款战机就能在 HTML STG 小游戏里成功落地。
