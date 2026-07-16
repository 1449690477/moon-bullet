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

## 梦境三 V2 排行榜契约

梦境三降低难度后使用独立的 `dream-03-v2` 成绩版本。部署顺序如下：

1. 执行 `leaderboard-security/13_dream_level_three_v2.sql`，或通过 Supabase CLI 推送同内容的 `supabase/migrations/20260716000000_dream_level_three_v2.sql`。
2. 部署当前 Edge Function。`supabase/config.toml` 已将 `leaderboard-run` 配置为 `verify_jwt = false`，公开客户端仍只使用发布密钥，写表权限只留给函数内的 `service_role`。
3. 执行只读生产检查：
   ```bash
   npm run check:leaderboard:production
   ```
4. 需要验证令牌表真实写入时，执行一次无成绩污染的写探针：
   ```bash
   LEADERBOARD_WRITE_PROBE=1 npm run check:leaderboard:production
   ```

写探针会创建并立即消费一个运行令牌，但故意使用无效用时，因此不会写入排行榜成绩；输出只报告是否收到令牌，不输出令牌内容。
