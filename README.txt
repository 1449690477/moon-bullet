月蚀弹幕 Demo V3.6 - 视觉重建与资源规范版

打开方式：
1. 解压 ZIP。
2. 建议用本地 HTTP 服务打开，或直接用 Chrome / Edge 打开 index.html。
3. 点击画面或按 Enter 开始。浏览器会在用户交互后播放音乐。

操作方式：
WASD / 方向键：移动
Shift：低速精确移动
Space：月光束
X：月蚀大招
P：暂停
R：重新开始
M：开关音乐

本版新增内容：
- 新增 RESOURCE_GENERATION_GUIDE_V3_6.md 与 asset_generation_tasks_v3_6.json，用于外部高质量模型批量跑图。
- 背景改为低频暗色分层：bg_stage_base / bg_stage_depth / bg_boss_eclipse_overlay / bg_fog_layer / bg_particles_subtle。
- 重做程序化 Boss、弹幕、VFX、UI，去掉背景和特效里的无意义线条残留。
- 已导入一批用户提供的 AI 素材表：玩家小人、玩家头像、技能 cut-in、Boss、部分弹幕和 VFX 已裁切、去背景并接入。
- 继续导入第二批用户 AI 素材：新玩家 cut-in、Boss portrait、Boss/敌人命中、月光束、大招圈、清弹波、大小爆炸、擦弹特效。
- Canvas 新增 spriteFx 贴图特效队列，命中、死亡、清弹、Boss 受击会实际播放新 VFX 素材。
- 导入并筛选用户提供的 ZIP 批量素材：已覆盖更干净的 bullets、UI、VFX、nun_spirit；低质/假透明/重复素材已保留在报告中但没有覆盖游戏。
- 导入并覆盖本批次完整素材：背景 base/depth/Boss overlay、玩家 5 状态、bat/orb 小怪 8 状态、Boss 8 状态、侧栏 UI 和计时 UI。
- 侧栏 HUD 已接入 ui_timer_panel 与 ui_side_party_card，素材加载失败时仍会回退到 Canvas 面板。
- 加入 QA 脚本 tools/qa_v36_assets.py，可检查缺文件、PNG、alpha、尺寸、manifest。
- 保持 V3.5 的跟手移动、BGM/SFX、小怪到 Boss 流程。

已知问题：
- 当前新角色、Boss、小怪素材是干净可用的游戏图标化版本，但仍不是最终商业级高精动画立绘。
- 本批次没有提供 nun_spirit、玩家头像、玩家 cut-in、Boss portrait/nameplate、雾层和粒子层新版，游戏继续使用上一版已有资源。
- ui_damage_number_style.png 已导入资源库，但实战伤害数字仍由 Canvas 绘制，保证高密度场景下更清晰。
- 参考视频对齐增强：Boss 战新增高密度金色回廊、蛇形弹墙、白羽爆线、红色危险环、自动射击光柱、橙色伤害数字瀑布和左侧战斗 HUD。
- 如果音乐不响，请先点击画面或按 Enter，这是浏览器自动播放限制。

素材来源说明：
- 图片：原创程序化 PNG、项目资源包内参考图的本地透明化清理、用户提供的 AI 生成素材表裁切清理结果。
- 音频：原创程序合成 WAV/OGG。
- 未使用任何商业游戏素材。

用户素材导入说明：
- 导入脚本：tools/import_user_generated_sheets.py
- 第二批导入脚本：tools/import_user_generated_batch2.py
- ZIP 批量筛选导入脚本：tools/import_curated_zip_assets.py
- 本批完整素材导入脚本：tools/import_next_batch_assets.py
- 本次导入报告：ASSET_IMPORT_REPORT_20260618.md
- 本批完整素材导入报告：ASSET_IMPORT_REPORT_NEXT_BATCH_20260618.md
- 参考视频差距与下一批素材清单：NEXT_ASSET_REQUESTS_AFTER_VIDEO_REVIEW.md
- 导入前备份：assets/_backup_before_user_import/
- 每次替换新素材后建议运行：python3 tools/qa_v36_assets.py
