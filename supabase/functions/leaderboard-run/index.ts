// ============================================================
// 月蚀排行榜 · Edge Function：leaderboard-run
// 唯一的写入口。前端不再直接写表，所有上榜都经过这里校验。
//
// 部署（在你项目根目录，已 supabase login 并 link 到项目后）：
//   supabase functions deploy leaderboard-run --no-verify-jwt
//   supabase secrets set LB_SALT="随便一段长随机字符串"
//   # SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 由平台自动注入，无需手动设。
//
// 五个端点：
//   POST /functions/v1/leaderboard-run/health  生产能力与梦境表就绪状态（只读）
//   POST /functions/v1/leaderboard-run/start   开局领令牌 → { run_id, run_token, expires_at }
//   POST /functions/v1/leaderboard-run/submit  交分校验   → { ok, status, reasons? }
//   POST /functions/v1/leaderboard-run/dream-start   梦境开局令牌（绑定关卡/谱面/编队）
//   POST /functions/v1/leaderboard-run/dream-submit  梦境通关提交（星级优先、同星用时优先）
//        status = accepted | rejected
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SALT         = Deno.env.get("LB_SALT") ?? "CHANGE_ME";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const EDGE_VERSION = "leaderboard-run-2026-07-16-dream-level3-v2";
const CHARACTERS = new Set(["witch", "yanuxiya", "anna", "reaver", "motherlife", "skyward", "corruptgun"]);
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 令牌有效期 2 小时
const DREAM_ACTIVE_CLEAR_VERSION = "dream-01-v2";
const DREAM_STAGE_CONTRACT_VERSION = "dream-03-v2";
const DREAM_TOKEN_TTL_MS = 90 * 60 * 1000;
const DREAM_WINGS = new Set(["moonfeather", "reaverwing", "saintcrown", "nightcoffin", "skyglory", "motherhive"]);
const DREAM_STAGES = new Map([
  ["dream-01-seraph", { clearVersion: DREAM_ACTIVE_CLEAR_VERSION, seed: 7130101 }],
  ["dream-02-zero-compile", { clearVersion: "dream-02-v1", seed: 7130202 }],
  ["dream-03-plush-room", { clearVersion: "dream-03-v2", seed: 7130303 }],
]);

const cors = {
  "Access-Control-Allow-Origin": "*", // 上线后可改成你的 Pages 域名收紧
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randToken(): string {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function clientHashes(req: Request): Promise<[string, string]> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ua = req.headers.get("user-agent") || "";
  return [await sha256(ip + SALT), await sha256(ua + SALT)];
}

function normalizeWingLoadout(value: unknown): string[] | null {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 6) return null;
  const wings = value.map((key) => String(key));
  if (wings.some((key) => !DREAM_WINGS.has(key))) return null;
  if (new Set(wings).size !== wings.length) return null;
  return wings.sort();
}

function sameWingLoadout(a: unknown, b: unknown): boolean {
  const aa = normalizeWingLoadout(a);
  const bb = normalizeWingLoadout(b);
  return aa !== null && bb !== null && JSON.stringify(aa) === JSON.stringify(bb);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  const action = new URL(req.url).pathname.split("/").pop(); // health | start | submit | dream-start | dream-submit

  try {
    // ---------------- /health ----------------
    // 生产验收专用，只读检查函数版本、7号白名单与梦境多关卡契约。
    if (action === "health") {
      const [tableResult, schemaResult, stageContractResult] = await Promise.all([
        admin.from("dream_leaderboard").select("id", { head: true, count: "exact" }),
        admin.rpc("dream_leaderboard_schema_version"),
        admin.rpc("dream_leaderboard_stage_contract"),
      ]);
      const dreamTableError = tableResult.error;
      const dreamTableReady = !dreamTableError;
      const dreamSchemaVersion = typeof schemaResult.data === "string" ? schemaResult.data : null;
      const dreamSchemaReady = !schemaResult.error && dreamSchemaVersion === DREAM_ACTIVE_CLEAR_VERSION;
      const dreamStageContractVersion = typeof stageContractResult.data === "string" ? stageContractResult.data : null;
      const dreamStageContractReady = !stageContractResult.error && dreamStageContractVersion === DREAM_STAGE_CONTRACT_VERSION;
      const dreamLeaderboardReady = dreamTableReady && dreamSchemaReady && dreamStageContractReady;
      const dreamStages = [...DREAM_STAGES.entries()].map(([stage_id, stage]) => ({
        stage_id,
        clear_version: stage.clearVersion,
        seed: stage.seed,
      }));
      return json({
        ok: dreamLeaderboardReady,
        edge_version: EDGE_VERSION,
        capabilities: {
          normal_leaderboard: true,
          corruptgun: CHARACTERS.has("corruptgun"),
          dream_leaderboard: dreamLeaderboardReady,
          dream_stage: "dream-01-seraph",
          dream_clear_version: DREAM_ACTIVE_CLEAR_VERSION,
          dream_stages: dreamStages,
          dream_stage_contract: DREAM_STAGE_CONTRACT_VERSION,
          dream_token_ttl_ms: DREAM_TOKEN_TTL_MS,
        },
        database: {
          dream_leaderboard: dreamTableReady,
          dream_schema_version: dreamSchemaVersion,
          dream_stage_contract: dreamStageContractVersion,
          table_error_code: dreamTableError?.code ?? null,
          schema_error_code: schemaResult.error?.code ?? null,
          stage_contract_error_code: stageContractResult.error?.code ?? null,
        },
      }, dreamLeaderboardReady ? 200 : 503);
    }

    // ---------------- /dream-start ----------------
    if (action === "dream-start") {
      const body = await req.json();
      const stageId = String(body.stage_id ?? "");
      const stage = DREAM_STAGES.get(stageId);
      const character = String(body.character ?? "");
      const clearVersion = String(body.clear_version ?? "");
      const requestedSeed = Number(body.seed ?? stage?.seed);
      const wingLoadout = normalizeWingLoadout(body.wing_loadout);
      const reject: string[] = [];

      if (!stage) reject.push("invalid stage");
      if (!stage || clearVersion !== stage.clearVersion) reject.push("invalid clear version");
      if (!stage || !Number.isInteger(requestedSeed) || requestedSeed !== stage.seed) reject.push("invalid seed");
      if (!CHARACTERS.has(character)) reject.push("invalid character");
      if (wingLoadout === null) reject.push("invalid wing loadout");
      if (reject.length) return json({ ok: false, status: "rejected", reasons: reject }, 400);

      const [ip_hash, ua_hash] = await clientHashes(req);
      const token = randToken();
      const token_hash = await sha256(token);
      const expires_at = new Date(Date.now() + DREAM_TOKEN_TTL_MS).toISOString();
      const { data, error } = await admin
        .from("dream_leaderboard_runs")
        .insert({
          token_hash,
          expires_at,
          ip_hash,
          ua_hash,
          stage_id: stageId,
          clear_version: stage!.clearVersion,
          seed: stage!.seed,
          character,
          wing_loadout: wingLoadout,
          client_version: String(body.client_version ?? "").slice(0, 80),
        })
        .select("run_id, expires_at, stage_id, clear_version, seed, character, wing_loadout")
        .single();

      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, edge_version: EDGE_VERSION, run_token: token, ...data });
    }

    // ---------------- /dream-submit ----------------
    if (action === "dream-submit") {
      const p = await req.json();
      if (!p.run_id || !p.run_token)
        return json({ ok: false, status: "rejected", reasons: ["missing run token"] }, 400);

      const { data: run, error: runError } = await admin
        .from("dream_leaderboard_runs")
        .select("run_id, token_hash, started_at, expires_at, submitted_at, stage_id, clear_version, seed, character, wing_loadout")
        .eq("run_id", p.run_id)
        .maybeSingle();

      const tokenHash = await sha256(String(p.run_token));
      if (runError || !run || run.token_hash !== tokenHash)
        return json({ ok: false, status: "rejected", reasons: ["bad token"] }, 400);
      if (run.submitted_at)
        return json({ ok: false, status: "rejected", reasons: ["already submitted"] }, 400);
      if (new Date(run.expires_at).getTime() < Date.now())
        return json({ ok: false, status: "rejected", reasons: ["token expired"] }, 400);

      const name = String(p.player_name ?? "").trim();
      const nameKey = name.normalize("NFKC").toLocaleLowerCase("en-US");
      const stageId = String(p.stage_id ?? "");
      const clearVersion = String(p.clear_version ?? "");
      const seed = Number(p.seed);
      const character = String(p.character ?? "");
      const wingLoadout = normalizeWingLoadout(p.wing_loadout);
      const stars = Number(p.stars);
      const hitCount = Number(p.hit_count);
      const elapsedMs = Number(p.elapsed_ms);
      const serverRunAgeMs = Math.max(0, Date.now() - new Date(run.started_at).getTime());
      const reject: string[] = [];

      if (!name || name.length > 24 || !nameKey || nameKey.length > 48) reject.push("invalid name");
      if (stageId !== run.stage_id) reject.push("stage mismatch");
      if (clearVersion !== run.clear_version) reject.push("clear version mismatch");
      if (!Number.isInteger(seed) || seed !== Number(run.seed)) reject.push("seed mismatch");
      if (!CHARACTERS.has(character) || character !== run.character) reject.push("character mismatch");
      if (wingLoadout === null || !sameWingLoadout(wingLoadout, run.wing_loadout)) reject.push("wing loadout mismatch");
      if (!Number.isInteger(stars) || stars < 0 || stars > 3) reject.push("invalid stars");
      if (!Number.isInteger(hitCount) || hitCount < 0 || hitCount > 3) reject.push("invalid hit count");
      if (Number.isInteger(stars) && Number.isInteger(hitCount) && stars !== 3 - hitCount) reject.push("stars do not match hit count");
      if (!Number.isInteger(elapsedMs) || elapsedMs < 60000 || elapsedMs > 3600000) reject.push("elapsed out of range");
      if (Number.isInteger(elapsedMs) && elapsedMs > serverRunAgeMs + 15000) reject.push("elapsed exceeds token age");

      // 梦境令牌同样一次性；校验失败也销毁，阻止修改 payload 后重放。
      const consumedAt = new Date().toISOString();
      const { data: consumed, error: consumeError } = await admin
        .from("dream_leaderboard_runs")
        .update({ submitted_at: consumedAt })
        .eq("run_id", p.run_id)
        .is("submitted_at", null)
        .select("run_id")
        .maybeSingle();
      if (consumeError) return json({ ok: false, status: "rejected", reasons: [consumeError.message] }, 500);
      if (!consumed) return json({ ok: false, status: "rejected", reasons: ["already submitted"] }, 400);
      if (reject.length) return json({ ok: false, status: "rejected", reasons: reject }, 400);

      // The claim prevents parallel replay. If the score write itself fails, release
      // only this exact claim so a transient 5xx can be retried with the same token.
      const releaseClaim = async (reason: string) => {
        const { error } = await admin
          .from("dream_leaderboard_runs")
          .update({ submitted_at: null })
          .eq("run_id", p.run_id)
          .eq("submitted_at", consumedAt);
        if (error) console.error("[dream-submit] failed to release claim", reason, error.message);
      };

      const now = new Date().toISOString();
      const payload = {
        stage_id: stageId,
        clear_version: clearVersion,
        player_name: name,
        player_name_key: nameKey,
        character,
        wing_loadout: wingLoadout,
        stars,
        elapsed_ms: elapsedMs,
        hit_count: hitCount,
        avatar_data: p.avatar_data ?? null,
        run_id: p.run_id,
        created_at: now,
        updated_at: now,
      };
      const { data: best, error: bestError } = await admin
        .from("dream_leaderboard")
        .select("id, stars, elapsed_ms")
        .eq("stage_id", stageId)
        .eq("clear_version", clearVersion)
        .eq("player_name_key", nameKey)
        .eq("character", character)
        .maybeSingle();
      if (bestError) {
        await releaseClaim("best-select");
        return json({ ok: false, status: "rejected", reasons: [bestError.message] }, 500);
      }

      const improvesBest = !best || stars > best.stars || (stars === best.stars && elapsedMs < best.elapsed_ms);
      if (!improvesBest) {
        if (p.avatar_data) {
          const { error: avatarErr } = await admin
            .from("dream_leaderboard")
            .update({ avatar_data: p.avatar_data, updated_at: now })
            .eq("id", best!.id);
          if (avatarErr) {
            await releaseClaim("avatar-update");
            return json({ ok: false, status: "rejected", reasons: [avatarErr.message] }, 500);
          }
        }
        return json({ ok: true, status: "accepted", note: "kept existing better dream result" });
      }

      if (best) {
        const { error: updateError } = await admin.from("dream_leaderboard").update(payload).eq("id", best.id);
        if (updateError) {
          await releaseClaim("score-update");
          return json({ ok: false, status: "rejected", reasons: [updateError.message] }, 500);
        }
      } else {
        const { error: insertError } = await admin.from("dream_leaderboard").insert(payload);
        if (insertError) {
          await releaseClaim("score-insert");
          return json({ ok: false, status: "rejected", reasons: [insertError.message] }, 500);
        }
      }
      return json({ ok: true, status: "accepted" });
    }

    // ---------------- /start ----------------
    if (action === "start") {
      const [ip_hash, ua_hash] = await clientHashes(req);
      let body: Record<string, unknown> = {};
      try { body = await req.json(); } catch { /* 允许空 body */ }

      const token = randToken();
      const token_hash = await sha256(token);
      const expires_at = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

      const { data, error } = await admin
        .from("leaderboard_runs")
        .insert({ token_hash, expires_at, ip_hash, ua_hash, client_version: String(body.client_version ?? "") })
        .select("run_id, expires_at")
        .single();

      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, edge_version: EDGE_VERSION, run_id: data.run_id, run_token: token, expires_at: data.expires_at });
    }

    // ---------------- /submit ----------------
    if (action === "submit") {
      const p = await req.json();

      // 1) 核验运行令牌（存在 / 未过期 / 未用过）
      if (!p.run_id || !p.run_token)
        return json({ ok: false, status: "rejected", reasons: ["missing run token"] }, 400);

      const { data: run } = await admin
        .from("leaderboard_runs")
        .select("run_id, token_hash, expires_at, submitted_at")
        .eq("run_id", p.run_id)
        .single();

      const tokenHash = await sha256(String(p.run_token));
      if (!run || run.token_hash !== tokenHash)
        return json({ ok: false, status: "rejected", reasons: ["bad token"] }, 400);
      if (run.submitted_at)
        return json({ ok: false, status: "rejected", reasons: ["already submitted"] }, 400);
      if (new Date(run.expires_at).getTime() < Date.now())
        return json({ ok: false, status: "rejected", reasons: ["token expired"] }, 400);

      // 2) 字段规整
      const name = String(p.player_name ?? "").trim();
      const character = String(p.character ?? "");
      const score = Number(p.score);
      const kills = Number(p.kill_count);
      const loops = Number(p.loop_count);
      const elapsed = Number(p.elapsed);
      const bosses = Number(p.bosses_cleared);
      const isInt = (n: number) => Number.isInteger(n) && n >= 0;

      // 3) 硬拒绝
      const reject: string[] = [];
      if (!name || name.length > 24) reject.push("invalid name");
      if (!CHARACTERS.has(character)) reject.push("invalid character");
      if (![score, kills, loops, elapsed, bosses].every(isInt)) reject.push("non-integer fields");
      if (!(elapsed >= 5 && elapsed <= 7200)) reject.push("elapsed out of range");

      // 令牌一次性：无论结果如何都标记已用，防重放
      await admin.from("leaderboard_runs").update({ submitted_at: new Date().toISOString() }).eq("run_id", p.run_id);

      if (reject.length) return json({ ok: false, status: "rejected", reasons: reject }, 400);

      const payload = {
        player_name: name, character, score,
        kill_count: kills, loop_count: loops, elapsed,
        bosses_cleared: bosses, avatar_data: p.avatar_data ?? null,
      };

      // 4) 入榜：同昵称只保留最高分。分数不再走待审核隔离，合法字段一律正常入榜。
      const { data: best } = await admin
        .from("leaderboard")
        .select("id, score")
        .eq("player_name", name)
        .order("score", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (best && best.score >= score) {
        // 已有更高分：只更新头像，不插入低分
        if (payload.avatar_data) {
          const { error: avatarErr } = await admin.from("leaderboard").update({ avatar_data: payload.avatar_data }).eq("id", best.id);
          if (avatarErr) return json({ ok: false, status: "rejected", reasons: [avatarErr.message] }, 500);
        }
        return json({ ok: true, status: "accepted", note: "kept existing higher score" });
      }
      if (best) {
        const { error: updateErr } = await admin.from("leaderboard").update(payload).eq("id", best.id); // 刷新为更高分
        if (updateErr) return json({ ok: false, status: "rejected", reasons: [updateErr.message] }, 500);
      } else {
        const { error: insertErr } = await admin.from("leaderboard").insert(payload);
        if (insertErr) return json({ ok: false, status: "rejected", reasons: [insertErr.message] }, 500);
      }
      return json({ ok: true, status: "accepted" });
    }

    return json({ ok: false, error: "unknown action, use /health, /start, /submit, /dream-start or /dream-submit" }, 404);
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});
