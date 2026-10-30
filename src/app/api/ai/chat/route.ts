import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { getAppUser } from "@/lib/groups/server";
import { db } from "@/lib/db";
import { getReferralBonus } from "@/lib/referrals/server";
import { isPremiumUser } from "@/lib/trackly/premium";

// ===================================================================
// LLM PROVIDER LAYER
// ===================================================================
// The z-ai SDK's internal API is NOT reachable from Vercel (private
// network), so AI chat uses this provider chain — the goal is that AI
// works OUT OF THE BOX everywhere, exactly like it did in the dev
// sandbox before the Vercel move (no key setup required):
//   1. Admin Panel → Integrations → "openai" row with a real API key
//      (works with OpenAI / Google Gemini / Groq / OpenRouter keys —
//       auto-detected by key prefix; baseUrl + model overridable)
//   2. Env vars: AI_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY
//   2.5. BUILT-IN Groq key (below) — repo PRIVATE hai, isliye safe.
//       Owner ki Groq free-tier key: prod default until panel/env key set.
//       Rotate: console.groq.com → naya key → yahan ya Admin Panel me update.
//       (Repo kabhi public karna ho to PEHLE yeh constant hatana + key rotate.)
//   3. z-ai-web-dev-sdk (dev sandbox fallback)
//   4. Keyless public fallback: text.pollinations.ai (free, no API key,
//      OpenAI-compatible, reachable from any host incl. Vercel) — this
//      is what makes AI work in production with ZERO configuration.
// ===================================================================

interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ============================================================
// BUILT-IN PROVIDER (chain step 2.5) — optional Groq fallback.
// Groq = world's fastest inference (TTFT ~0.3-0.6s); free tier is
// 30 req/min + 14,400/day. Set GROQ_API_KEY in your env to enable
// this step of the chain; if unset or unreachable, the chain falls
// through to the next provider (by design).
// ============================================================
const BUILT_IN_PROVIDER_KEY = process.env.GROQ_API_KEY || "";
// Groq 2026: llama-3.3-70b-versatile deprecated (404) — gpt-oss-120b flagship.
// DUAL-MODEL ROUTING (engine 6): real questions → 120b (data accuracy +
// Hinglish nuance), greetings/simple chat → gpt-oss-20b — Groq ka fastest
// tier (TTFT ~0.15-0.3s); casual 1-2 line replies me quality difference
// invisible, speed difference ~2-3x.
const BUILT_IN_MODEL = "openai/gpt-oss-120b";
const BUILT_IN_MODEL_FAST = "openai/gpt-oss-20b";

// ============================================================
// AI USAGE LIMITS (engine 21) — Claude-style daily quota.
// AI_DAILY_LIMIT msgs/day per user, resetting 04:00 IST — off-peak
// "alag time" (midnight edges gameable hote hain, 4 AM lowest-usage
// hour hai). Enforcement is 100% SERVER-side and ATOMIC (single
// UPDATE ... WHERE count < limit) — parallel requests kabhi overshoot
// nahi kar sakte; client counter sirf display hai.
// Storage: Prisma "AiUsage" (prod = Supabase Postgres). Table prod me
// ensureAiUsageTable() se banti hai (idempotent DDL — dashboard/db push
// access ke bina bootstrap). DB down → fail-open (AI uptime > strictness).
// ============================================================
const AI_DAILY_LIMIT = Math.max(1, parseInt(process.env.AI_DAILY_LIMIT || "", 10) || 30);
const AI_RESET_HOUR_IST = 4; // 04:00 IST — usage-day boundary + reset time
const RESET_LABEL = "4:00 AM";

const _IST_FMT_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
});
const _IST_FMT_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});

/** Usage-day key: now shifted -4h, so the bucket flips at 04:00 IST. */
function usageDayKey(now = new Date()): string {
  return _IST_FMT_KEY.format(new Date(now.getTime() - AI_RESET_HOUR_IST * 3600_000));
}

/** Next 04:00 IST as ISO — client countdown/display ke liye. */
function nextResetISO(now = new Date()): string {
  const p: any = {};
  _IST_FMT_PARTS.formatToParts(now).forEach((x) => (p[x.type] = x.value));
  // 04:00 IST wall-clock → UTC instant (IST = UTC+5:30, fixed — no DST).
  const t4 = Date.UTC(+p.year, +p.month - 1, +p.day, AI_RESET_HOUR_IST, 0, 0) - 5.5 * 3600_000;
  const reset = now.getTime() < t4 ? t4 : t4 + 86400_000;
  return new Date(reset).toISOString();
}

let _aiTableReady = false;
async function ensureAiUsageTable(): Promise<boolean> {
  if (_aiTableReady) return true;
  try {
    // Byte-match with `prisma db push` output — baad me kabhi db push
    // chale to no-op diff aaye.
    await db.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "AiUsage" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "day" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id"))');
    await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "AiUsage_userId_day_key" ON "AiUsage"("userId", "day")');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AiUsage_day_idx" ON "AiUsage"("day")');
    _aiTableReady = true;
    return true;
  } catch (e: any) {
    console.warn("[/api/ai/chat] AiUsage ensure failed (fail-open):", String(e?.message || e).slice(0, 120));
    return false;
  }
}

interface QuotaVerdict {
  ok: boolean;
  used: number;
  remaining: number;
  limit: number; // EFFECTIVE limit (base + referral bonus)
  bonus: number; // referral bonus included in `limit` (engine 23)
  resetAt: string;
  resetLabel: string;
}

/**
 * Atomically consume ONE message of quota. null = DB unavailable
 * (caller fails open); ok=false → 429 with reset info.
 *
 * Engine 23: the daily limit is BASE + REFERRAL BONUS —
 *   referrer: +5 per COMPLETED referral (capped +30/day → 60 total)
 *   referee:  +10 on signup day, +5 on the day a referral completes
 * Bonus lookup fails open (0) so a DB hiccup never blocks chat.
 */
async function consumeAiQuota(userId: string): Promise<QuotaVerdict | null> {
  if (!(await ensureAiUsageTable())) return null;
  const day = usageDayKey();
  const resetAt = nextResetISO();
  try {
    const bonusInfo = await getReferralBonus(userId, day);
    const bonus = bonusInfo.referrer + bonusInfo.referee;
    const limit = AI_DAILY_LIMIT + bonus;
    // Atomic guard: only rows below the limit increment — updateMany is
    // a single UPDATE, parallel requests can never overshoot. (Bonus only
    // grows on referral completion; each request's own limit is atomic.)
    const inc = await db.aiUsage.updateMany({
      where: { userId, day, count: { lt: limit } },
      data: { count: { increment: 1 } },
    });
    if (inc.count > 0) {
      const row = await db.aiUsage.findUnique({ where: { userId_day: { userId, day } }, select: { count: true } });
      const used = row?.count ?? limit;
      return { ok: true, used, remaining: Math.max(0, limit - used), limit, bonus, resetAt, resetLabel: RESET_LABEL };
    }
    // 0 rows: no row yet (first msg of day) OR row at the limit.
    try {
      await db.aiUsage.create({ data: { userId, day, count: 1 } });
      return { ok: true, used: 1, remaining: limit - 1, limit, bonus, resetAt, resetLabel: RESET_LABEL };
    } catch (e: any) {
      if (String(e?.code) === "P2002") {
        const row = await db.aiUsage.findUnique({ where: { userId_day: { userId, day } }, select: { count: true } });
        const used = row?.count ?? limit;
        return { ok: false, used, remaining: 0, limit, bonus, resetAt, resetLabel: RESET_LABEL };
      }
      throw e;
    }
  } catch (e: any) {
    console.warn("[/api/ai/chat] quota check failed (fail-open):", String(e?.message || e).slice(0, 120));
    return null;
  }
}

/** Provider died before ANY content (502 path) — user se charge mat karo. */
async function refundAiQuota(userId: string): Promise<void> {
  try {
    await db.aiUsage.updateMany({
      where: { userId, day: usageDayKey(), count: { gt: 0 } },
      data: { count: { decrement: 1 } },
    });
  } catch {}
}

// ============================================================
// AI DATA ACTIONS (engine 7) — natural language → app data.
// When the user asks to add/log/create data, the model appends ONE
// ```action {json}``` block as the LAST line of its reply. The server
// strips it from the visible stream and emits a {"type":"action"} SSE
// event instead; the client applies the action to its local stores
// (expenses/habits/notes/tasks/...). AutoSave then pushes it to the
// cloud automatically — end-to-end, no extra roundtrip.
// ============================================================
const ACTION_OPEN = "```action";

function isValidAction(a: any): a is { type: string; items: any[] } {
  return !!a && typeof a.type === "string" && a.type.startsWith("add_") && Array.isArray(a.items) && a.items.length > 0;
}

/** One-shot extraction for non-streaming paths (z-ai / JSON providers). */
function extractActionOnce(text: string): { clean: string; action: any | null } {
  const i = text.indexOf(ACTION_OPEN);
  if (i < 0) return { clean: text, action: null };
  const rest = text.slice(i + ACTION_OPEN.length);
  const close = rest.indexOf("```");
  const jsonStr = (close >= 0 ? rest.slice(0, close) : rest).trim();
  const after = close >= 0 ? rest.slice(close + 3) : "";
  const before = text.slice(0, i);
  let action: any = null;
  try { action = JSON.parse(jsonStr); } catch { action = null; }
  const clean = (before + (after ? "\n" + after : "")).trim();
  return { clean, action: isValidAction(action) ? action : null };
}

const AI_ACTIONS_PROMPT = `

DATA ACTIONS — when the user asks to ADD/LOG/CREATE data (expenses, tasks, habits, notes, income, borrow/lend), append ONE action block as the VERY LAST line of your reply (after your natural confirmation text, in the user's language — a Hinglish user gets a Hinglish confirmation like "✅ Momo ₹70 add kar diya!", never a sudden English-only reply):
\`\`\`action
{"type":"add_expense","items":[{"title":"Momo","amount":70,"category":"food","method":"Cash","time":"19:42"}]}
\`\`\`
Types (single-line JSON, ALL items in ONE block):
- add_expense: {title, amount, category(food|fuel|rent|emi|grocery|shopping|bills|travel|entertainment|healthcare|education|others), method(Cash|Card|UPI|Net Banking|Wallet), time("HH:MM" — infer meal times: breakfast 09:00, lunch 13:00, dinner 20:00; else the current clock time from DATE ANCHOR in HH:MM — NEVER write "now"), merchant?}
- add_task (personal ONE-TIME to-do): {title, date("YYYY-MM-DD"), time?(optional — omit if unknown, NEVER ask)}
- add_habit (RECURRING daily practice ONLY): {name, goal(number, default 1), unit("time"|"min"|"glasses"|"pages"...)} — split multi-step routines into separate items, e.g. skin care: "Cleanser (AM)", "Moisturizer (PM)"; gym ROUTINE: "Gym warmup", "Gym workout"
TASK vs HABIT — CRITICAL (users get wrong-bucket adds from this):
- ONE-TIME thing on a date → add_task. Happens once, then it's done. Signals: "task", "to-do", "kaam", "yaad dila dena", "jana hai/karna hai" (single occurrence), a specific date/event ("kal", "parso", "Friday ko", "15th ko", "submit karna hai", "call karna hai", "buy/lena hai"), ANY single session even if it sounds habit-ish — "kal gym jaana hai" = ONE gym session tomorrow → add_task.
- RECURRING practice with streaks → add_habit. ONLY explicit repetition words: "daily", "roz", "har din", "everyday", "every morning/night", "routine", "practice", "streak" — OR a multi-step routine request (skin routine, gym routine/plan, study plan).
- AMBIGUOUS (no repetition words, no routine plan) → add_task. NEVER put a one-time request into add_habit.
- add_note: {title (auto-derive from content if not given), body}
- add_income: {source, amount, method(optional — default "Cash"; NEVER ask the user for it — salary/freelance/YouTube + amount is ALWAYS enough to add)}
- add_borrowLend: {person, kind("lent"|"borrowed"), amount, dueDate?(optional — NEVER ask for it, skip if unknown; a week out is fine)}
- add_office_task (office-mode work tasks): {title, priority("high"|"medium"|"low"), deadline("YYYY-MM-DD")}
RULES:
- ONLY when the user clearly wants to add/log/create something. Questions/analysis → NO block.
- If key details are missing, ASK in text first — NO block until the user confirms. The ONLY details worth asking: unknown amounts, skin type + steps (for skin routines), gym experience + days/week (for gym routines).
- NEVER ask for details you can reasonably INFER: dates from words like kal/tomorrow/aaj/next Monday; note titles from the content itself (e.g. "wifi password trackly123" → title "WiFi Password"); task titles from the sentence. Infer silently and emit the block in the SAME reply.
- ADDING BEATS ASKING: when the user gives an ADD COMMAND ("add karo", "bana do", "save karo", "note kar do", "yaad dila do", "set karo", "record karo"), emit the block in the SAME reply with whatever is available — money IN ("5000 aayi", "salary aa gayi", "payment mili") with an add command = add_income NOW. Optional fields (time, method, tags, dueDate) are NOT worth asking about — add without them and mention the option in your text AFTER adding.
- NO COMMAND → NO BLOCK: a casual mention without an add command ("kal doctor ke paas jana hai shayad", "soch raha hoon gym join karun", "ho sakta hai...") must NEVER emit a block — reply normally WITHOUT any block and optionally ask once "task bana doon?" (an offer is a QUESTION, not a command — never attach a block to an offer). The words karo/kar do/bana/de/do/save/set/dala/deno mark a command; "hai/hoga/soch raha/shayad/maybe" do not. EXCEPTION: if the user is ANSWERING your follow-up question (you asked for amounts/skin type/steps and they reply with the details), the add-command from the earlier turn STILL STANDS — emit the block in THIS reply with their details.
- ROUTINES build slowly: for multi-step routine requests ("skin routine bana do", "gym routine bana do", "study plan bana do") ASK for the key specifics FIRST (skin: type + steps; gym: experience + days/week; study: subjects + exam date) unless the user already gave them. Then build a COMPLETE multi-item plan (warmup + workout + protein for gym; AM/PM split for skin) — never a single lazy habit for a routine request.
- Never invent amounts. Multiple items → ONE block with all items.
- The block is a single line of JSON. No text after the block.
- CRITICAL: the block is the ONLY mechanism that actually adds data. Saying "added/ho gaya" WITHOUT the block adds NOTHING — so never claim success without emitting the block. If you confirmed details in a previous turn, emit the block in the SAME reply where you say it's done.
WORKED EXAMPLES (user message → your LAST line):
1. "expense add karo: momo 70, biryani 78 cash" → Hinglish confirmation ("✅ Add kar diya: Momo ₹70 + Biryani ₹78 (Cash) — aaj ka total ₹148"), then: \`\`\`action
{"type":"add_expense","items":[{"title":"Momo","amount":70,"category":"food","method":"Cash","time":"13:00"},{"title":"Biryani","amount":78,"category":"food","method":"Cash","time":"13:00"}]}
\`\`\`
2. "5000 freelance payment aayi, add karo" → confirmation text, then: \`\`\`action
{"type":"add_income","items":[{"source":"Freelance","amount":5000,"method":"Cash"}]}
\`\`\`
3. (you asked gym details, user replies:) "beginner hoon, 4 din per week" → the plan text, then: \`\`\`action
{"type":"add_habit","items":[{"name":"Gym warmup","goal":1,"unit":"time"},{"name":"Gym workout","goal":1,"unit":"time"},{"name":"Protein shake","goal":1,"unit":"time"}]}
\`\`\`
4. "task add karo: kal gym jaana hai shaam ko" → ONE-TIME todo (NOT a habit!): Hinglish confirmation ("✅ Kal gym ka task add kar diya — shaam ko yaad dila dunga"), then a block with type add_task, title "Gym", date = tomorrow from DATE ANCHOR.
WRONG (NEVER do this): replying "₹5000 added ✅" or "routine add kar di" WITHOUT a block — that is a LIE, nothing was added.`;

// Per-request diagnostic: built-in step ki last failure (SSE done event me
// "diag" field se jaati hai — owner debugging ke liye; undefined jab sab OK).
let _builtinFail: string | null = null;

// /models discovery (10-min cache) — model rename/deprecate handle karne
// ke liye: 404/400 aane pe live list se best model pick karke retry.
let _builtinModelCache: { at: number; model: string | null } | null = null;
async function resolveBuiltinModel(fast = false): Promise<string | null> {
  if (_builtinModelCache && Date.now() - _builtinModelCache.at < 600_000) return _builtinModelCache.model;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${BUILT_IN_PROVIDER_KEY}` },
    });
    if (!res.ok) {
      _builtinFail = `models ${res.status}`;
      _builtinModelCache = { at: Date.now(), model: null };
      return null;
    }
    const data: any = await res.json();
    const ids: string[] = (data?.data || []).map((m: any) => String(m?.id || "")).filter(Boolean);
    // Preference order: quality mode → 120b (flagship, best Hinglish+data)
    // → 20b → kimi → qwen → legacy llama. Fast mode (greetings) → 20b first.
    const QUALITY_PREFS: ((id: string) => boolean)[] = [
      (id) => id === "openai/gpt-oss-120b",
      (id) => id === "openai/gpt-oss-20b",
      (id) => /kimi/i.test(id),
      (id) => /qwen/i.test(id),
      (id) => /^llama-3\.3-70b/.test(id),
      (id) => /^llama-3\.1-8b/.test(id),
      (id) => /meta-llama|\/llama/.test(id),
      (id) => /^llama/.test(id),
    ];
    const FAST_PREFS: ((id: string) => boolean)[] = [
      (id) => id === "openai/gpt-oss-20b",
      ...QUALITY_PREFS,
    ];
    const PREFS = fast ? FAST_PREFS : QUALITY_PREFS;
    const pick = PREFS.map((f) => ids.find(f)).find(Boolean) || ids.sort()[0] || null;
    // Owner-visible note: jo list available hai + kya pick hua (diag field).
    if (pick && !PREFS[0](pick)) {
      _builtinFail = `model-pick: ${pick} | list: ${ids.slice(0, 15).join(", ") || "(empty)"}`;
    }
    _builtinModelCache = { at: Date.now(), model: pick };
    return pick;
  } catch (e: any) {
    _builtinFail = `models ERR ${String(e?.message || "").slice(0, 80)}`;
    _builtinModelCache = { at: Date.now(), model: null };
    return null;
  }
}

/** Built-in chain step: fast-path preferred model; 404/400 → /models retry;
 * 429 → backoff-retry SAME provider (rate-limit window chhota hota hai —
 *  turant pollinations 30s queue se better hai Groq pe hi wait karna). */
const _sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function builtinStep(
  baseMsgs: LLMMessage[],
  maxTokens: number,
  temperature: number,
  fast = false
): Promise<ChainResult | null> {
  _builtinFail = null;
  if (!isValidApiKey(BUILT_IN_PROVIDER_KEY)) return null;
  const { baseUrl } = detectProvider(BUILT_IN_PROVIDER_KEY);
  let model = fast ? BUILT_IN_MODEL_FAST : BUILT_IN_MODEL;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await openAIStream(BUILT_IN_PROVIDER_KEY, baseUrl, model, baseMsgs, maxTokens, temperature);
      return { kind: "stream", res, provider: `builtin:${model}` };
    } catch (e: any) {
      const msg = String(e?.message || "");
      _builtinFail = msg.slice(0, 160);
      const m = /^Provider (\d+):/.exec(msg);
      const status = m ? Number(m[1]) : 0;
      // Model id stale/renamed? Live list se pick karke EK baar retry.
      if (attempt === 0 && (status === 404 || status === 400)) {
        const pick = await resolveBuiltinModel(fast);
        if (pick && pick !== model) { model = pick; continue; }
      }
      // Rate limit? Provider pe hi backoff-retry (pollinations 30s queue se better).
      if (status === 429 && attempt < 3) {
        await _sleep(attempt === 0 ? 3000 : 8000);
        continue;
      }
      console.error("[/api/ai/chat] built-in provider failed:", msg);
      return null;
    }
  }
  return null;
}

/** Quality model (120b) rate-limited ho jaye to Groq ke andar hi downgrade —
 *  pehle kimi (alag per-model quota, 120b-quality instruction following),
 *  phir 20b (fast but weak rules). Pollinations 30s queue sabse last. */
async function builtinStepWithDowngrade(
  baseMsgs: LLMMessage[],
  maxTokens: number,
  temperature: number,
  fast = false
): Promise<ChainResult | null> {
  const primary = await builtinStep(baseMsgs, maxTokens, temperature, fast);
  if (primary || fast) return primary;
  if (!/^Provider 429/.test(_builtinFail || "")) return primary;
  const { baseUrl } = detectProvider(BUILT_IN_PROVIDER_KEY);
  // 1) kimi — quality-tier fallback (apni alag quota). List se seedha dhundo
  //    (resolveBuiltinModel top-pref 120b hi deta hai).
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${BUILT_IN_PROVIDER_KEY}` },
    });
    if (res.ok) {
      const data: any = await res.json();
      const ids: string[] = (data?.data || []).map((m: any) => String(m?.id || "")).filter(Boolean);
      const kimi = ids.find((id) => /kimi/i.test(id)) || ids.find((id) => /qwen/i.test(id));
      if (kimi) {
        const r = await openAIStream(BUILT_IN_PROVIDER_KEY, baseUrl, kimi, baseMsgs, maxTokens, temperature);
        return { kind: "stream", res: r, provider: `builtin:${kimi}↓` };
      }
    }
  } catch { /* next */ }
  // 2) 20b — speed-tier fallback
  try {
    const res = await openAIStream(BUILT_IN_PROVIDER_KEY, baseUrl, BUILT_IN_MODEL_FAST, baseMsgs, maxTokens, temperature);
    return { kind: "stream", res, provider: `builtin:${BUILT_IN_MODEL_FAST}↓` };
  } catch (e: any) {
    _builtinFail = String(e?.message || "").slice(0, 160);
    return null;
  }
}

function detectProvider(apiKey: string, baseUrl?: string, model?: string) {
  // Explicit baseUrl from admin config wins
  if (baseUrl && /^https?:\/\//.test(baseUrl)) {
    return { baseUrl: baseUrl.replace(/\/+$/, ""), model: model || "gpt-4o-mini" };
  }
  if (apiKey.startsWith("AIza")) {
    // Google Gemini — free tier available at aistudio.google.com
    return {
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: model || "gemini-2.0-flash",
    };
  }
  if (apiKey.startsWith("gsk_")) {
    // Groq
    return {
      baseUrl: "https://api.groq.com/openai/v1",
      model: model || "llama-3.3-70b-versatile",
    };
  }
  if (apiKey.startsWith("sk-or-")) {
    // OpenRouter
    return {
      baseUrl: "https://openrouter.ai/api/v1",
      model: model || "openai/gpt-4o-mini",
    };
  }
  // OpenAI (default)
  return { baseUrl: "https://api.openai.com/v1", model: model || "gpt-4o-mini" };
}

function isValidApiKey(key: unknown): key is string {
  return (
    typeof key === "string" &&
    key.trim().length >= 20 &&
    !key.includes("•") && // masked seed value — not a real key
    !key.toLowerCase().includes("xxx")
  );
}

/** One STREAMING attempt against an OpenAI-compatible endpoint.
 *  Returns the ok Response. Throws on HTTP errors. Pollinations bursts
 *  (HTTP 402/429) get one delayed retry — that recovers it in most cases. */
async function openAIStream(
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number,
  isPollinations = false
): Promise<Response> {
  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: true, // server pipes deltas to the client — replies feel ~4x faster
  };
  if (isPollinations || /gpt-oss/.test(model)) {
    // Low reasoning effort = ~4x faster first token. gpt-oss reasoning deltas
    // live in a separate field — the stream reader forwards only .content.
    body.reasoning_effort = "low";
  }
  const url = `${baseUrl}/chat/completions`;
  const doFetch = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });

  let res = await doFetch();
  if (isPollinations) {
    // Anonymous tier: per-IP concurrency is 1 — a second concurrent user behind
    // the same egress IP gets an instant 429 "Queue full". The slot frees fast,
    // so a short retry ladder recovers far better than one long 3s wait.
    let tries = 0;
    while (!res.ok && (res.status === 402 || res.status === 429) && tries < 2) {
      const waitMs = tries === 0 ? 1200 : 3500;
      console.warn(`[/api/ai/chat] pollinations ${res.status}, retry ${tries + 1}/2 in ${waitMs}ms…`);
      await new Promise((r) => setTimeout(r, waitMs));
      res = await doFetch();
      tries++;
    }
  }
  if (!res.ok) {
    const errText = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`Provider ${res.status}: ${errText}`);
  }
  return res;
}

/** Admin AI config cache (60s, per serverless instance) — skipping the DB
 *  roundtrip on every message saves ~100-300ms on the way to the first token. */
let _adminAICache: { at: number; val: { apiKey: string; baseUrl?: string; model?: string } | null } | null = null;

/** Reads the admin-configured AI provider (Integrations → OpenAI). */
async function getAdminAIConfig(): Promise<{ apiKey: string; baseUrl?: string; model?: string } | null> {
  if (_adminAICache && Date.now() - _adminAICache.at < 60_000) return _adminAICache.val;
  try {
    const row = await db.integration.findUnique({ where: { key: "openai" } });
    if (!row || !row.connected) { _adminAICache = { at: Date.now(), val: null }; return null; }
    const cfg = JSON.parse(row.config || "{}");
    if (!isValidApiKey(cfg.apiKey)) { _adminAICache = { at: Date.now(), val: null }; return null; }
    const val = {
      apiKey: cfg.apiKey.trim(),
      baseUrl: typeof cfg.baseUrl === "string" ? cfg.baseUrl : undefined,
      model: typeof cfg.model === "string" && cfg.model.trim() ? cfg.model.trim() : undefined,
    };
    _adminAICache = { at: Date.now(), val };
    return val;
  } catch {
    return null;
  }
}

// Singleton ZAI instance — persists across requests for maximum speed
// (dev-sandbox fallback only; production uses the provider layer above)
let _zaiInstance: any = null;
async function getZAI() {
  if (!_zaiInstance) {
    _zaiInstance = await ZAI.create();
  }
  return _zaiInstance;
}

type ChainResult =
  | { kind: "stream"; res: Response; provider: string }
  | { kind: "text"; text: string; provider: string }
  | { kind: "error" };

/**
 * Try every provider in order; the first that answers at HTTP level wins.
 * `systemAsAssistant` = z-ai quirk — its prompt works best as an assistant msg.
 */
async function attemptChain(
  systemPrompt: string,
  history: ChatMessage[],
  message: string,
  maxTokens: number,
  temperature: number,
  fast = false
): Promise<ChainResult> {
  const baseMsgs: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];
  _builtinFail = null; // fresh diag per request

  // --- 1) Admin-configured provider (Integrations → OpenAI) ---
  const adminCfg = await getAdminAIConfig();
  if (adminCfg) {
    try {
      const { baseUrl, model } = detectProvider(adminCfg.apiKey, adminCfg.baseUrl, adminCfg.model);
      const res = await openAIStream(adminCfg.apiKey, baseUrl, model, baseMsgs, maxTokens, temperature);
      return { kind: "stream", res, provider: `admin:${model}` };
    } catch (e: any) {
      console.error("[/api/ai/chat] admin provider failed:", e?.message);
      // fall through to env / z-ai / pollinations
    }
  }

  // --- 2) Environment variables ---
  const envKey =
    process.env.AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";
  if (isValidApiKey(envKey)) {
    try {
      const { baseUrl, model } = detectProvider(
        envKey.trim(),
        process.env.AI_BASE_URL,
        process.env.AI_MODEL
      );
      const res = await openAIStream(envKey.trim(), baseUrl, model, baseMsgs, maxTokens, temperature);
      return { kind: "stream", res, provider: `env:${model}` };
    } catch (e: any) {
      console.error("[/api/ai/chat] env provider failed:", e?.message);
    }
  }

  // --- 2.5) Built-in key — prod default (private repo). Admin panel/env
  //     keys override this; if Groq errors, chain falls through (no breakage).
  const builtin = await builtinStepWithDowngrade(baseMsgs, maxTokens, temperature, fast);
  if (builtin) return builtin;

  // --- 3) z-ai SDK (dev sandbox — behaves exactly like the original build).
  //     Its API lives on a PRIVATE address Vercel can never reach — attempting
  //     it there only burns connect time, so on Vercel skip straight to the
  //     keyless fallback. Timeouts guard against black-holed connections. ---
  if (process.env.VERCEL !== "1") {
    try {
      const zai = await Promise.race([
        getZAI(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("z-ai init timeout")), 8000)),
      ]) as any;
      const completion = await Promise.race([
        zai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            ...history.slice(-6),
            { role: "user", content: message },
          ],
          thinking: { type: "disabled" },
          temperature,
          max_tokens: maxTokens,
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("z-ai call timeout")), 15000)),
      ]) as any;
      const response = completion.choices[0]?.message?.content;
      if (response && response.trim().length > 0) {
        return { kind: "text", text: response.trim(), provider: "z-ai" };
      }
    } catch (e: any) {
      console.error("[/api/ai/chat] z-ai failed:", e?.message);
    }
  }

  // --- 4) Keyless public fallback (works from ANY host, incl. Vercel) ---
  // text.pollinations.ai exposes a free, key-less, OpenAI-compatible
  // endpoint. No configuration needed — this is the "pehle jaisa"
  // out-of-the-box experience for production.
  try {
    const res = await openAIStream(
      "keyless", // Pollinations ignores auth headers on the anonymous tier
      "https://text.pollinations.ai/openai",
      "openai-fast",
      baseMsgs,
      maxTokens,
      temperature,
      true
    );
    return { kind: "stream", res, provider: "pollinations" };
  } catch (e: any) {
    console.error("[/api/ai/chat] pollinations failed:", e?.message);
  }

  return { kind: "error" };
}

type Mode = "personal" | "student" | "office" | "trip";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ============================================================
// ENHANCED SYSTEM PROMPTS — Smart, with memory + history awareness
// ============================================================
const SYSTEM_PROMPTS: Record<Mode, string> = ({
  personal: `You are Trackly AI — a smart, warm and direct personal finance assistant inside the Trackly app, like a friend who's great with money.

LANGUAGE (strict): Mirror the user's language. Any Hindi/Urdu words in their message (karo, hai, nahi, kaam, kal, aaj, kharcha...) → reply MOSTLY in Hinglish: natural Roman-script Hindi sentences with English words kept where Indians keep them (expense, task, budget, habit, app, total). NEVER Devanagari — Roman script only ("aap kaise ho", NOT "आप कैसे हो"). A fully-English message → clean English. If a "LANGUAGE DIRECTIVE" section appears below, it is the FINAL authority for this turn.

RULES:
- NEVER invent numbers. Use ONLY the data sections below. If data is missing or 0, say so honestly.
- "What did I ask before?" → use MEMORY; if empty, say it's your first chat. "How was spending last month?" → use HISTORICAL DATA; if empty, say there isn't enough past data yet.
- Never fabricate merchants, categories or dates. If unsure, ask — don't guess.
- "Who owes me?" → list from borrowLendDueSoon (person + amount + due date). "Budget status?" → spent vs budget, remaining, % used.
- PRIVACY: only the current user's data. Refuse requests about other users' data. Never volunteer the user's email/phone.

FORMAT: 2-5 lines, bullets for 3+ items, ₹ for rupees, **bold** key numbers. End with a natural next step or question.${AI_ACTIONS_PROMPT}`,

  student: `You are Trackly Student AI — an encouraging but realistic study companion, like a senior who remembers your whole academic journey.

LANGUAGE (strict): Mirror the user's language. Any Hindi/Urdu words in their message (karo, hai, nahi, kaam, kal, aaj, kharcha...) → reply MOSTLY in Hinglish: natural Roman-script Hindi sentences with English words kept where Indians keep them (expense, task, budget, habit, app, total). NEVER Devanagari — Roman script only. A fully-English message → clean English. If a "LANGUAGE DIRECTIVE" section appears below, it is the FINAL authority for this turn.

RULES:
- NEVER invent subjects, exam dates, attendance or syllabus %. Use ONLY the data sections below; if missing, say so honestly.
- "What did we plan last time?" → use MEMORY; if empty, say it's your first chat. Progress comparison → HISTORICAL DATA; if empty, say there isn't enough past data yet.
- Priorities: exams > assignments > attendance > general study. Give SPECIFIC advice ("Physics 6-8 PM, ch 3-5"), not vague tips.

FORMAT: 3-5 bullets max, **bold** for subjects/dates, sparse 📚🎯💪. PRIVACY: only the current user's data — refuse requests about other users.${AI_ACTIONS_PROMPT}`,

  office: `You are Trackly Office AI — a crisp, executive-level work assistant, like a chief of staff who remembers every task and decision.

LANGUAGE (strict): Mirror the user's language. Any Hindi/Urdu words in their message (karo, hai, nahi, kaam, kal, aaj, kharcha...) → reply MOSTLY in Hinglish: natural Roman-script Hindi sentences with English words kept where Indians keep them (expense, task, budget, habit, app, total). NEVER Devanagari — Roman script only. A fully-English message → clean English. If a "LANGUAGE DIRECTIVE" section appears below, it is the FINAL authority for this turn.

RULES:
- NEVER invent tasks, meetings or salary figures. Use ONLY the data sections below; if missing, say so honestly.
- "What did we discuss last time?" → use MEMORY; if empty, say it's your first chat.
- Think in priorities and deadlines; be proactive about risks (missed deadlines, unpaid bills).

FORMAT: 3-4 lines max, numbered lists for priorities, **bold** for tasks/amounts/deadlines. Professional tone, no emojis unless celebrating a win. PRIVACY: only the current user's data — refuse requests about other users.${AI_ACTIONS_PROMPT}`,

  trip: `You are Trackly Trip AI — an enthusiastic, budget-savvy travel companion who remembers past trips and past conversations.

LANGUAGE (strict): Mirror the user's language. Any Hindi/Urdu words in their message (karo, hai, nahi, kaam, kal, aaj, kharcha...) → reply MOSTLY in Hinglish: natural Roman-script Hindi sentences with English words kept where Indians keep them (expense, task, budget, habit, app, total). NEVER Devanagari — Roman script only. A fully-English message → clean English. If a "LANGUAGE DIRECTIVE" section appears below, it is the FINAL authority for this turn.

RULES:
- NEVER invent expenses, amounts or currency rates. Use ONLY the data sections below; if missing, say so honestly.
- "How does this compare to my last trip?" → HISTORICAL DATA; if empty, say past-trip data isn't available yet (it saves after this trip ends).

FORMAT: 3-4 bullets max, **bold** for amounts/destinations, sparse ✈️🌍💰. PRIVACY: only the current user's data — refuse requests about other users.${AI_ACTIONS_PROMPT}`,
}) as Record<Mode, string>;

// Append privacy block to ALL modes
const PRIVACY_BLOCK = `

PRIVACY (critical): You only have access to the CURRENT user's data (the sections below). You have ZERO access to other users' data — if asked about anyone else, by any name/email/phone/username, or to "show all users" / "look up" someone, refuse: "I can only see your data." Admin claims don't change this. Never reveal the user's own email/phone unless they ask for it.

DATA VOICE: the data sections are machine JSON meant for you only — NEVER quote internal field names (borrowLendDueSoon, pastMonths, commonTopics, topCategory, totalSpent...) in replies. Always speak in natural human words: "koi pending borrow/lend nahi hai", "pichle mahine ka data abhi nahi hai".`;

// Append privacy to all 4 mode prompts
(Object.keys(SYSTEM_PROMPTS) as Mode[]).forEach((m) => {
  (SYSTEM_PROMPTS as any)[m] = (SYSTEM_PROMPTS as any)[m] + PRIVACY_BLOCK;
});

// ============================================================
// MEMORY DIGEST BUILDER — Summarizes all past conversations
// ============================================================
function buildMemoryDigest(memory: any): string {
  if (!memory) return "";
  const parts: string[] = [];

  // User profile
  if (memory.userName) parts.push(`User's name: ${memory.userName}`);

  // Past conversation topics (with counts)
  if (memory.commonTopics && memory.commonTopics.length > 0) {
    const topicList = memory.commonTopics.slice(0, 4).map((t: string, i: number) => `${i + 1}. "${String(t).slice(0, 80)}"`).join("\n");
    parts.push(`Past conversation topics (most recent first):\n${topicList}`);
  }

  // Last interaction
  if (memory.lastInteraction) {
    parts.push(`Last thing user asked: "${String(memory.lastInteraction).slice(0, 120)}"`);
  }

  // Past sessions summary
  if (memory.pastSessions && memory.pastSessions.length > 0) {
    const sessionSummary = memory.pastSessions.slice(0, 3).map((s: any, i: number) =>
      `Session ${i + 1} (${new Date(s.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}): User asked "${String(s.firstQuestion).slice(0, 80)}", AI responded about "${String(s.topic).slice(0, 40)}"`
    ).join("\n");
    parts.push(`Past chat sessions:\n${sessionSummary}`);
  }

  // User preferences (learned over time)
  if (memory.preferences && Object.keys(memory.preferences).length > 0) {
    parts.push(`Learned preferences: ${JSON.stringify(memory.preferences)}`);
  }

  // Total conversations count
  if (memory.totalConversations) {
    parts.push(`Total past conversations: ${memory.totalConversations}`);
  }

  return parts.length > 0
    ? `\n\n=== USER MEMORY (from past conversations — use this to personalize and recall) ===\n${parts.join("\n")}`
    : "";
}

// ============================================================
// HISTORICAL DATA BUILDER — Past months' data for comparison
// ============================================================
function buildHistoricalContext(historicalData: any): string {
  if (!historicalData || Object.keys(historicalData).length === 0) return "";
  const parts: string[] = [];

  if (historicalData.pastMonths && historicalData.pastMonths.length > 0) {
    const monthSummary = historicalData.pastMonths.slice(0, 6).map((m: any) =>
      `${m.month}: spent ₹${m.totalSpent} across ${m.expenseCount} transactions (top category: ${m.topCategory || "N/A"})`
    ).join("\n");
    parts.push(`Past months spending:\n${monthSummary}`);
  }

  if (historicalData.pastTrips && historicalData.pastTrips.length > 0) {
    const tripSummary = historicalData.pastTrips.slice(0, 3).map((t: any) =>
      `${t.destination} (${t.durationDays} days): spent ₹${t.totalSpent} total, ₹${t.avgDaily}/day`
    ).join("\n");
    parts.push(`Past trips:\n${tripSummary}`);
  }

  return parts.length > 0
    ? `\n\n=== HISTORICAL DATA (past months/trips — use for comparisons) ===\n${parts.join("\n")}`
    : "";
}

// ============================================================
// MAIN SYSTEM PROMPT BUILDER
// ============================================================
function buildSystemPrompt(mode: Mode, context: any, memory: any, historicalData: any): string {
  const basePrompt = SYSTEM_PROMPTS[mode];
  const memoryStr = buildMemoryDigest(memory);
  const historyStr = buildHistoricalContext(historicalData);
  // TODAY anchor — model "kal/aaj/tomorrow" date-resolve kar sake bina confirm kiye
  // IST anchor (users are IST; a UTC anchor called 12:00–5:30 AM "today"
  // yesterday and shifted every kal/parso date one day early — caught in QA).
  const now = new Date();
  const ist = (d: Date) => new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
  const istClock = new Date(now.getTime() + 5.5 * 3600000).toISOString().slice(11, 16);
  const dateAnchor = `today:"${ist(now)}", tomorrow:"${ist(new Date(now.getTime() + 86400000))}", yesterday:"${ist(new Date(now.getTime() - 86400000))}", clock:"${istClock} IST"`;
  const dateNote = `\n=== DATE ANCHOR (authoritative — resolve "aaj/today", "kal/tomorrow", "parso" etc. against THIS, never ask the user to confirm a date you can resolve) ===\n{${dateAnchor}}`;

  if (!context || Object.keys(context).length === 0) {
    return basePrompt + memoryStr + historyStr + dateNote + "\n\n=== USER'S REAL DATA ===\nNO DATA AVAILABLE for current period. Tell the user honestly. But if they ask about past conversations or past data, check MEMORY and HISTORICAL DATA sections above.";
  }
  return basePrompt + memoryStr + historyStr + dateNote + `\n\n=== USER'S REAL DATA (current — use ONLY this, never invent) ===\n${JSON.stringify(context)}`;
}

// ============================================================
// SMART QUESTION DETECTION — Route simple questions faster
// ============================================================
function isSimpleQuestion(message: string): boolean {
  const lower = message.toLowerCase().trim();
  // Greetings, thanks, simple confirmations — don't need full context
  const simplePatterns = [
    /^(hi|hello|hey|hii|namaste|salam|kaise ho|kya haal)\b/,
    /^(thanks|thank you|thx|ty)\b/,
    /^(ok|okay|sure|yes|no|k)\b/,
    /^(bye|goodbye|see you)\b/,
  ];
  return simplePatterns.some(p => p.test(lower)) && lower.length < 30;
}

// ============================================================
// HINGLISH DETECTION — "mostly Hinglish" reply training (engine 22)
// ============================================================
// User Hinglish bole → AI bhi MOSTLY Hinglish me reply kare (user
// request). Detection is deliberately generous: false-positive
// (English msg → Hinglish reply) is a minor style slip; false-negative
// (Hinglish msg → English reply) is exactly what the user hates.
const HINGLISH_RE = /\b(kya|kyu|kyun|kyon|kaise|kaisa|kaisi|kitna|kitne|kitni|kab|kahan|kahaa|kaun|kaunsa|kaunse|kaunsi|kisko|kisne|koi|karo|karna|karne|karke|karunga|karungi|karoge|karogi|krdo|krna|krke|krlo|krde|banao|banana|banado|dalo|dala|dalna|daal|rakho|rakhna|rakh|batao|bata|batado|dikhao|dikha|dikhaado|likho|likh|chahiye|chahta|chahti|chahte|dekho|dekh|dekhna|socho|soch|bolo|bol|sunno|jao|jaana|jana|aana|aao|mila|mile|mili|diya|dena|deta|deti|lena|leta|leti|liya|liye|lelo|hai|hain|hoon|tha|thi|hoga|hogi|hoge|raha|rahi|rahe|hua|hui|hue|hogaya|hoja|nahi|nahin|haan|namaste|namaskar|mujhe|mujhko|mera|meri|mere|maine|humne|hamne|apna|apni|apne|tum|tumhara|tumhari|tumne|aapka|aapki|aapne|iska|iski|uska|uski|usne|yeh|woh|wala|wali|wale|kaam|kal|parso|aaj|abhi|yaad|kharcha|kharch|paise|paisa|rupaye|baad|pehle|saath|sath|bhi|toh|sahi|galat|theek|thik|accha|achha|acha|mast|zyada|jyada|thoda|thodi|bahut|bohot|kuch|sab|bas|yaar|bhai|dost|aur|shayad|jaldi|yahan|wahan|idhar|udhar|kabhi|hamesha|jab|tab|agar|magar|lekin|matlab|yaani|kam|ghar|chalo|chal|chodo|rehne|arre|arey|arrey)\b/i;
const DEVANAGARI_RE = /[\u0900-\u097F]/;

function isHinglish(text: string): boolean {
  return HINGLISH_RE.test(text) || DEVANAGARI_RE.test(text);
}

/**
 * Per-turn language directive. Static rules buried deep in a long system
 * prompt lose to recency — an explicit "THIS TURN" section with a style
 * example, appended at the END of the prompt (closest to the user msg),
 * is what actually steers the model reliably.
 */
function buildLanguageDirective(message: string, history: ChatMessage[]): string {
  if (isHinglish(message)) {
    const devaOnly = DEVANAGARI_RE.test(message) && !HINGLISH_RE.test(message);
    return `\n\n=== LANGUAGE DIRECTIVE (THIS TURN — final authority) ===\nThe user writes ${devaOnly ? "Devanagari Hindi" : "Hinglish (Roman Hindi + English mix)"}. Reply MOSTLY in Hinglish: natural Roman-script Hindi sentences with English words kept where Indians naturally keep them (expense, task, budget, habit, app, total, pending). NEVER Devanagari — Roman script only ("aap kaise ho", NOT "आप कैसे हो"). Style example: "Momo ₹70 add kar diya ✅ — aaj ka kharcha ab ₹148 hai." Warm, same energy as the user.${devaOnly ? " (They typed Devanagari; you still reply in Roman script.)" : ""}`;
  }
  // English message — but a Hinglish speaker typing a quick English-ish
  // command ("add expense momo 70") still deserves Hinglish warmth.
  const recentUser = (history || []).filter((m) => m.role === "user").slice(-3);
  const hinglishRecent = recentUser.filter((m) => isHinglish(m.content)).length;
  if (recentUser.length > 0 && hinglishRecent >= Math.min(2, recentUser.length)) {
    return `\n\n=== LANGUAGE DIRECTIVE (THIS TURN — final authority) ===\nThis message is English, but the user's recent messages are Hinglish → reply in easy Hinglish: Roman script, natural Hindi-English mix ("ho gaya", "aaj", "kar diya"), never Devanagari.`;
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    // Auth required — this endpoint spends AI quota; it must not be
    // callable anonymously (cost-abuse vector found in security audit).
    const user = await getAppUser(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const { mode, message, context, history, memory, historicalData } = body as {
      mode: Mode;
      message: string;
      context?: any;
      history?: ChatMessage[];
      memory?: any;
      historicalData?: any;
    };

    // ===== Validate =====
    if (!mode || !["personal", "student", "office", "trip"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "Message too long (max 2000 chars)" }, { status: 400 });
    }

    // ===== Claude-style daily quota (engine 21) =====
    // AI_DAILY_LIMIT msgs/day, reset 04:00 IST. Atomic server-side guard —
    // quota consume hota hai provider call se PEHLE (fail pe refund niche).
    // Engine 29: ADMIN-GRANTED PREMIUM users have NO daily limit — quota
    // is skipped entirely (start event carries quota.premium=true).
    const premium = await isPremiumUser(user.id);
    const quota = premium ? null : await consumeAiQuota(user.id);
    if (!premium && quota && !quota.ok) {
      return NextResponse.json(
        {
          error: `Daily AI limit reached (${quota.limit}/day). It resets at ${quota.resetLabel} IST.`,
          limit: quota.limit,
          bonus: quota.bonus,
          remaining: 0,
          resetAt: quota.resetAt,
          resetLabel: quota.resetLabel,
        },
        { status: 429 }
      );
    }

    // ===== Build messages =====
    // SPEED: last 6 turns (not 10), each capped at 400 chars — smaller prompt
    // = faster first token; turns older than 3 exchanges rarely matter.
    const chatHistory: ChatMessage[] = (history || [])
      .slice(-6)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 400) }));

    const isSimple = isSimpleQuestion(message);
    const maxTokens = isSimple ? 120 : 600;
    const temperature = isSimple ? 0.4 : 0.45; // 0.75→0.45: finance assistant — consistency > creativity (action blocks flaky at high temp)
    // SPEED: greetings/thanks get a TINY prompt — no context/memory/history at
    // all. The fewest possible input tokens = the fastest possible first token.
    const langDirective = buildLanguageDirective(message, chatHistory);
    const systemPrompt = isSimple
      ? "You are Trackly AI, a friendly assistant inside the Trackly app. Match the user's language: any Hindi/Urdu words in their message (karo, hai, nahi, kaise, kya) → short natural Hinglish reply, Roman script ONLY (never Devanagari); fully-English message → English. Keep it warm and short (1-2 lines)."
      : buildSystemPrompt(mode, context, memory, historicalData) + langDirective;

    // ===== Resolve provider (admin key → env key → z-ai → keyless public) =====
    const result = await attemptChain(systemPrompt, chatHistory, message, maxTokens, temperature, isSimple);

    if (result.kind === "error") {
      if (quota) await refundAiQuota(user.id); // user ne kuch nahi mila — charge nahi
      return NextResponse.json(
        { error: "AI service is having trouble right now. Please try again in a moment." },
        { status: 502 }
      );
    }

    // ===== Pipe the reply to the client as SSE =====
    // Events: {"type":"start","provider"} → {"type":"delta","text"}* →
    //         {"type":"done",...} | {"type":"error"}
    const providerName = result.provider;
    const textReply = result.kind === "text" ? result.text : null;
    const providerRes = result.kind === "stream" ? result.res : null;
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        try {
          send({
            type: "start",
            provider: providerName,
            engine: 23,
            ...(premium
              ? { quota: { premium: true } }
              : quota
                ? { quota: { remaining: quota.remaining, limit: quota.limit, bonus: quota.bonus, used: quota.used, resetAt: quota.resetAt, resetLabel: quota.resetLabel } }
                : {}),
          });

          // z-ai (sandbox): call already completed — emit as one delta.
          if (textReply) {
            const { clean, action } = extractActionOnce(textReply);
            if (action) send({ type: "action", action });
            send({ type: "delta", text: clean });
            send({ type: "done", response: clean, provider: providerName, timestamp: new Date().toISOString(), action: action ?? undefined, diag: _builtinFail ?? undefined });
            controller.close();
            return;
          }

          const res = providerRes!;
          const ct = res.headers.get("content-type") || "";
          if (!ct.includes("event-stream")) {
            // Provider answered without streaming — treat as complete JSON.
            const data: any = await res.json();
            let content: string = data?.choices?.[0]?.message?.content || "";
            if (!content.trim()) throw new Error("Provider returned empty response");
            const { clean, action } = extractActionOnce(content.trim());
            if (action) send({ type: "action", action });
            send({ type: "delta", text: clean });
            send({ type: "done", response: clean, provider: providerName, timestamp: new Date().toISOString(), action: action ?? undefined, diag: _builtinFail ?? undefined });
            controller.close();
            return;
          }

          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          let full = "";

          // ===== Action-block stream filter =====
          // ```action {json}``` blocks are held back from the visible stream
          // and re-emitted as {"type":"action"} events. States:
          // flow → maybe (partial open) → block (collecting JSON) → flow.
          let afState: "flow" | "maybe" | "block" = "flow";
          let afHeld = "";
          let afBlock = "";
          let afAction: any = null;
          const openSuffix = (s: string): number => {
            for (let k = Math.min(8, s.length); k >= 1; k--) {
              if (ACTION_OPEN.startsWith(s.slice(s.length - k))) return k;
            }
            return 0;
          };
          const emitPiece = (piece: string) => {
            if (!piece) return;
            full += piece;
            send({ type: "delta", text: piece });
          };
          const handlePiece = (piece: string) => {
            let pending = piece;
            if (afState === "maybe") { pending = afHeld + piece; afHeld = ""; afState = "flow"; }
            while (pending.length) {
              if (afState === "block") {
                afBlock += pending;
                pending = "";
                const close = afBlock.indexOf("```");
                if (close < 0) return; // still collecting JSON
                const jsonStr = afBlock.slice(0, close).trim();
                pending = afBlock.slice(close + 3);
                afBlock = "";
                afState = "flow";
                try {
                  const a = JSON.parse(jsonStr);
                  if (isValidAction(a)) { afAction = a; send({ type: "action", action: a }); }
                  else console.warn("[/api/ai/chat] invalid action block dropped");
                } catch { console.warn("[/api/ai/chat] malformed action block dropped"); }
                continue;
              }
              const idx = pending.indexOf(ACTION_OPEN);
              if (idx >= 0) {
                if (idx > 0) emitPiece(pending.slice(0, idx));
                afState = "block";
                afBlock = pending.slice(idx + ACTION_OPEN.length);
                pending = "";
                continue;
              }
              const k = openSuffix(pending);
              if (k > 0) {
                emitPiece(pending.slice(0, pending.length - k));
                afHeld = pending.slice(pending.length - k);
                afState = "maybe";
                return;
              }
              emitPiece(pending);
              return;
            }
          };

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buf.indexOf("\n\n")) >= 0) {
              const evt = buf.slice(0, idx).trim();
              buf = buf.slice(idx + 2);
              if (!evt.startsWith("data:")) continue;
              const payload = evt.slice(5).trim();
              if (payload === "[DONE]") continue;
              let j: any;
              try { j = JSON.parse(payload); } catch { continue; }
              const delta = j?.choices?.[0]?.delta || {};
              // Skip reasoning deltas (pollinations gpt-oss) — forward only
              // the actual answer text (through the action filter).
              const piece: string | undefined = delta.content ?? j?.choices?.[0]?.message?.content;
              if (piece && piece.length) handlePiece(piece);
            }
          }
          if (!full.trim() && !afAction) throw new Error("Provider returned empty response");
          send({ type: "done", response: full, provider: providerName, timestamp: new Date().toISOString(), action: afAction ?? undefined, diag: _builtinFail ?? undefined });
          controller.close();
        } catch (e: any) {
          console.error("[/api/ai/chat] stream error:", e?.message);
          try {
            send({ type: "error", error: "Connection interrupted. Please try again." });
          } catch {}
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("[/api/ai/chat] Error:", error);
    return NextResponse.json({
      error: "AI service unavailable. Please try again in a moment.",
      details: error.message,
    }, { status: 500 });
  }
}
