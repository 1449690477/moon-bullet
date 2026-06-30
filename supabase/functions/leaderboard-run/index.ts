import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SALT = Deno.env.get("LB_SALT") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
const CHARACTERS = new Set(["witch", "yanuxiya", "anna", "reaver", "motherlife"]);
const ALLOWED_ORIGINS = new Set([
  "https://1449690477.github.io",
  "http://localhost:18765",
  "http://127.0.0.1:18765",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://1449690477.github.io";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function tokenHash(token: string): Promise<string> {
  return sha256(`${token}:${SALT}`);
}

function randToken(): string {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function clientHashes(req: Request): Promise<[string, string]> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ua = req.headers.get("user-agent") || "";
  return [await sha256(`${ip}:${SALT}`), await sha256(`${ua}:${SALT}`)];
}

function intField(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function normalizedAvatar(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  if (value.length > 22000) return null;
  if (!value.startsWith("data:image/")) return null;
  return value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { ok: false, error: "method not allowed" }, 405);

  const action = new URL(req.url).pathname.split("/").pop();

  try {
    if (!SUPABASE_URL || !SERVICE_KEY || !SALT || SALT === "CHANGE_ME") {
      return json(req, { ok: false, error: "server is not configured" }, 500);
    }

    if (action === "start") {
      const [ip_hash, ua_hash] = await clientHashes(req);
      let body: Record<string, unknown> = {};
      try { body = await req.json(); } catch { body = {}; }

      const token = randToken();
      const expires_at = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
      const { data, error } = await admin
        .from("leaderboard_runs")
        .insert({
          token_hash: await tokenHash(token),
          expires_at,
          ip_hash,
          ua_hash,
          client_version: String(body.client_version ?? ""),
        })
        .select("run_id, expires_at")
        .single();

      if (error) return json(req, { ok: false, error: error.message }, 500);
      return json(req, { ok: true, run_id: data.run_id, run_token: token, expires_at: data.expires_at });
    }

    if (action === "submit") {
      const [ip_hash, ua_hash] = await clientHashes(req);
      const p = await req.json();

      if (!p.run_id || !p.run_token) {
        return json(req, { ok: false, status: "rejected", reasons: ["missing run token"] }, 400);
      }

      const { data: run, error: runError } = await admin
        .from("leaderboard_runs")
        .select("run_id, token_hash, expires_at, submitted_at")
        .eq("run_id", String(p.run_id))
        .maybeSingle();

      if (runError) return json(req, { ok: false, error: runError.message }, 500);
      if (!run || run.token_hash !== await tokenHash(String(p.run_token))) {
        return json(req, { ok: false, status: "rejected", reasons: ["bad token"] }, 400);
      }
      if (run.submitted_at) {
        return json(req, { ok: false, status: "rejected", reasons: ["already submitted"] }, 400);
      }
      if (new Date(run.expires_at).getTime() < Date.now()) {
        return json(req, { ok: false, status: "rejected", reasons: ["token expired"] }, 400);
      }

      await admin
        .from("leaderboard_runs")
        .update({ submitted_at: new Date().toISOString() })
        .eq("run_id", run.run_id);

      const name = String(p.player_name ?? "").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
      const character = String(p.character ?? "");
      const score = intField(p.score);
      const kills = intField(p.kill_count);
      const loops = intField(p.loop_count);
      const elapsed = intField(p.elapsed);
      const bosses = intField(p.bosses_cleared);

      const reject: string[] = [];
      if (!name || Array.from(name).length > 12) reject.push("invalid name");
      if (!CHARACTERS.has(character)) reject.push("invalid character");
      if ([score, kills, loops, elapsed, bosses].some((n) => n === null)) reject.push("non-integer fields");
      if (elapsed === null || elapsed < 5 || elapsed > 7200) reject.push("elapsed out of range");
      if (p.hell_mode !== true) reject.push("not hell mode");

      if (reject.length) {
        return json(req, { ok: false, status: "rejected", reasons: reject }, 400);
      }

      const cleanScore = score as number;
      const cleanKills = kills as number;
      const cleanLoops = loops as number;
      const cleanElapsed = elapsed as number;
      const cleanBosses = bosses as number;

      const quarantine: string[] = [];
      if (cleanScore > 5_000_000) quarantine.push("score > 5000000");
      if (cleanScore / Math.max(1, cleanElapsed) > 12000) quarantine.push("score/sec > 12000");
      if (cleanKills / Math.max(1, cleanElapsed) > 20) quarantine.push("kills/sec > 20");
      if (cleanBosses > Math.floor(cleanElapsed / 80) + 1) quarantine.push("bosses too high for elapsed");
      if (cleanLoops > cleanBosses + 1) quarantine.push("loop_count > bosses_cleared + 1");

      const payload = {
        player_name: name,
        character,
        score: cleanScore,
        kill_count: cleanKills,
        loop_count: cleanLoops,
        elapsed: cleanElapsed,
        bosses_cleared: cleanBosses,
        avatar_data: normalizedAvatar(p.avatar_data),
      };

      if (quarantine.length) {
        await admin.from("leaderboard_quarantine").insert({ payload, reasons: quarantine, ip_hash, ua_hash });
        return json(req, { ok: true, status: "quarantined", reasons: quarantine });
      }

      const { data: best, error: bestError } = await admin
        .from("leaderboard")
        .select("id, score")
        .eq("player_name", name)
        .order("score", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bestError) return json(req, { ok: false, error: bestError.message }, 500);

      if (best && Number(best.score) >= cleanScore) {
        if (payload.avatar_data) {
          await admin.from("leaderboard").update({ avatar_data: payload.avatar_data, character }).eq("id", best.id);
        }
        return json(req, { ok: true, status: "accepted", note: "kept existing higher score" });
      }

      if (best) {
        await admin.from("leaderboard").update(payload).eq("id", best.id);
      } else {
        await admin.from("leaderboard").insert(payload);
      }

      return json(req, { ok: true, status: "accepted" });
    }

    return json(req, { ok: false, error: "unknown action" }, 404);
  } catch (e) {
    return json(req, { ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});

