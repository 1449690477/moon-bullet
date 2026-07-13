# 月蚀排行榜安全部署顺序

1. 在 Supabase SQL Editor 运行 `01_immediate_fix.sql`。
2. 在 Supabase SQL Editor 运行 `02_prepare_edge_function.sql`。
3. 设置 secret 并部署 Edge Function：
   ```bash
   npx supabase@latest link --project-ref tdlqugkkojwysqnsunqt
   npx supabase@latest secrets set LB_SALT="换成一段长随机串"
   npx supabase@latest functions deploy leaderboard-run --no-verify-jwt
   ```
4. 构建并推送 GitHub Pages。
5. 确认线上上传正常后，在 SQL Editor 运行 `03_full_hardening.sql` 锁死公开写入。

## 7 号战机上榜补丁（corruptgun）

线上若出现「本局不计入：invalid character」，说明 Edge Function / 数据库白名单还没放行 `corruptgun`。按顺序执行：

1. 在 Supabase SQL Editor 运行 `08_allow_corruptgun.sql`（同时更新了 `06` / `07` 脚本源）。
2. 重新部署 Edge Function（仓库里 `supabase/functions/leaderboard-run/index.ts` 已包含 corruptgun）：
   ```bash
   npx supabase@latest functions deploy leaderboard-run --project-ref tdlqugkkojwysqnsunqt --no-verify-jwt
   ```
3. 用 7 号再打一局，或用补传脚本重提分数。

说明：`01` 会补 `avatar_data` 字段，所以头像上传依赖也一起解决。

