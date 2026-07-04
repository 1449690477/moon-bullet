// ============================================================
// 月蚀排行榜 · Edge Function：leaderboard-run
// 唯一的写入口。前端不再直接写表，所有上榜都经过这里校验。
//
// 部署（在你项目根目录，已 supabase login 并 link 到项目后）：
//   supabase functions deploy leaderboard-run --no-verify-jwt
//   supabase secrets set LB_SALT="随便一段长随机字符串"
//   # SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 由平台自动注入，无需手动设。
//
// 两个端点：
//   POST /functions/v1/leaderboard-run/start   开局领令牌 → { run_id, run_token, expires_at }
//   POST /functions/v1/leaderboard-run/submit  交分校验   → { ok, status, reasons? }
//        status = accepted | quarantined | rejected
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SALT         = Deno.env.get("LB_SALT") ?? "CHANGE_ME";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CHARACTERS = new Set(["witch", "yanuxiya", "anna", "reaver", "motherlife", "skyward"]);
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 令牌有效期 2 小时

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  const action = new URL(req.url).pathname.split("/").pop(); // start | submit

  try {
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
      return json({ ok: true, run_id: data.run_id, run_token: token, expires_at: data.expires_at });
    }

    // ---------------- /submit ----------------
    if (action === "submit") {
      const [ip_hash, ua_hash] = await clientHashes(req);
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

      // 4) 隔离阈值（疑似作弊 → 进隔离表，不进正式榜）
      const q: string[] = [];
      if (elapsed > 0 && score / elapsed > 12000) q.push("score/sec > 12000");
      if (elapsed > 0 && kills / elapsed > 20) q.push("kills/sec > 20");
      if (bosses > Math.floor(elapsed / 80) + 1) q.push("bosses too high for elapsed");
      if (loops > bosses + 1) q.push("loop_count > bosses_cleared + 1");

      const payload = {
        player_name: name, character, score,
        kill_count: kills, loop_count: loops, elapsed,
        bosses_cleared: bosses, avatar_data: p.avatar_data ?? null,
      };

      if (q.length) {
        await admin.from("leaderboard_quarantine").insert({ payload, reasons: q, ip_hash, ua_hash });
        return json({ ok: true, status: "quarantined", reasons: q });
      }

      // 5) 入榜：同昵称只保留最高分
      const { data: best } = await admin
        .from("leaderboard")
        .select("id, score")
        .eq("player_name", name)
        .order("score", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (best && best.score >= score) {
        // 已有更高分：只更新头像，不插入低分
        if (payload.avatar_data)
          await admin.from("leaderboard").update({ avatar_data: payload.avatar_data }).eq("id", best.id);
        return json({ ok: true, status: "accepted", note: "kept existing higher score" });
      }
      if (best) {
        await admin.from("leaderboard").update(payload).eq("id", best.id); // 刷新为更高分
      } else {
        await admin.from("leaderboard").insert(payload);
      }
      return json({ ok: true, status: "accepted" });
    }

    return json({ ok: false, error: "unknown action, use /start or /submit" }, 404);
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});
