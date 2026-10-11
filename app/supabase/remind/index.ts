// Supabase Edge Function "remind": sends the phone reminders for fixed dates.
// It runs every hour (see reminders.sql). At 9 am in the phone's time zone it looks at
// the fixed dates and sends a notification for each one that is due a reminder.
// It also hands the app the public key it needs to turn reminders on.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/* due:start */
const HOUR = 9;
const pad = (n) => String(n).padStart(2, "0");
const isoOf = (y, m, d) => { const x = new Date(Date.UTC(y, m - 1, d)); return x.getUTCFullYear() + "-" + pad(x.getUTCMonth() + 1) + "-" + pad(x.getUTCDate()); };
const addDays = (s, n) => isoOf(+s.slice(0, 4), +s.slice(5, 7), +s.slice(8) + n);
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dayDiff = (a, b) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8))) / 864e5);
// does fixed date d fall on day k? (repeating dates included; the 31st becomes the last day of shorter months)
function fallsOn(d, k) {
  if (!d.date || k < d.date) return false;
  if (!d.rep) return d.date === k;
  const y = +k.slice(0, 4), m = +k.slice(5, 7), dd = +d.date.slice(8);
  if (d.rep === "year") return +d.date.slice(5, 7) === m && Math.min(dd, daysIn(y, m)) === +k.slice(8);
  if (d.rep === "month") return Math.min(dd, daysIn(y, m)) === +k.slice(8);
  if (d.rep === "week") return dayDiff(d.date, k) % 7 === 0;
  return false;
}
const BEFORE = { morning: 0, day: 1, week: 7 };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WDS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// the reminders to send on day `today` at local hour `hour`
function dueReminders(data, today, hour) {
  if (hour !== HOUR) return [];
  const out = [];
  for (const d of (data && data.dates) || []) {
    const r = d.remind === undefined ? "day" : d.remind;   // dates made before reminders existed get "the day before"
    if (!(r in BEFORE)) continue;
    const on = addDays(today, BEFORE[r]);
    if (!fallsOn(d, on)) continue;
    const when = r === "morning" ? "Today" : r === "day" ? "Tomorrow" : `${WDS[new Date(on + "T12:00:00Z").getUTCDay()]} ${MON[+on.slice(5, 7) - 1]} ${+on.slice(8)}`;
    out.push({ key: `${d.id}|${on}|${r}`, title: d.t || "Fixed date", body: [when, d.time, d.tag].filter(Boolean).join(" · ") });
  }
  return out;
}
/* due:end */

function localNow(tz) {
  let p;
  try { p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date()); }
  catch { return localNow("UTC"); }
  const g = (t) => p.find((x) => x.type === t)!.value;
  return { day: `${g("year")}-${g("month")}-${g("day")}`, hour: +g("hour") };
}

async function vapid() {
  let { data } = await sb.from("push_keys").select("public_key,private_key").eq("id", 1).maybeSingle();
  if (!data) {
    const k = webpush.generateVAPIDKeys();
    await sb.from("push_keys").insert({ id: 1, public_key: k.publicKey, private_key: k.privateKey });
    ({ data } = await sb.from("push_keys").select("public_key,private_key").eq("id", 1).single());
  }
  webpush.setVapidDetails("https://izzie-vi.github.io/second-brain/", data!.public_key, data!.private_key);
  return data!.public_key;
}

async function send(row, msg) {
  try { await webpush.sendNotification(row.sub, JSON.stringify(msg), { TTL: 6 * 3600 }); return true; }
  catch (e) {
    if (e && (e.statusCode === 404 || e.statusCode === 410)) await sb.from("push_subs").delete().eq("endpoint", row.endpoint);   // phone turned them off
    else console.error("push failed", e && e.statusCode, e && e.body);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const body = await req.json().catch(() => ({}));
  const key = await vapid();
  if (body.op === "key") return json({ key });

  if (body.op === "test") {
    const { data: row } = await sb.from("push_subs").select("*").eq("endpoint", body.endpoint || "").maybeSingle();
    if (!row) return json({ ok: false, error: "not found" }, 404);
    return json({ ok: await send(row, { title: "Reminders are on", body: "Fixed dates will remind you here at 9 am." }) });
  }

  // op "run": called every hour
  const { data: subs } = await sb.from("push_subs").select("*");
  const byUser = new Map();
  for (const s of subs || []) byUser.set(s.user_id, [...(byUser.get(s.user_id) || []), s]);
  let sent = 0;
  for (const [uid, rows] of byUser) {
    const { data: brain } = await sb.from("brain").select("data").eq("user_id", uid).maybeSingle();
    for (const row of rows) {
      const now = localNow(row.tz);
      for (const msg of dueReminders(brain && brain.data, now.day, now.hour)) {
        // one reminder per date, per phone, even if this runs twice
        const { error } = await sb.from("push_sent").insert({ user_id: uid, key: `${msg.key}|${row.endpoint.slice(-24)}` });
        if (error) continue;
        if (await send(row, { title: msg.title, body: msg.body, url: "./#days" })) sent++;
      }
    }
  }
  return json({ ok: true, sent });
});
