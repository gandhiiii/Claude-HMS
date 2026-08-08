// HMS — Push Relay Edge Function
//
// Triggered by a Supabase Database Webhook on `hms_live_pops` INSERT
// (Dashboard → Database → Webhooks → POST https://<ref>.supabase.co/functions/v1/push-relay).
//
// It reads the inserted payload, looks up every device subscription in
// `hms_push_subs`, and sends:
//   • Web Push  → browser/desktop (web-push / VAPID)
//   • FCM       → Android APK    (Firebase Cloud Messaging HTTP v1)
// so notifications arrive even when the app/browser is closed.

import { createClient } from "npm:@supabase/supabase-js@2";

// @ts-ignore web-push can send via Node crypto (bundler uses Node runtime target)
import webPush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@stavya-hms.local";
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function corsResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/* ── FCM HTTP v1 single-message send (legacy server-key auth) ── */
async function sendFcm(token: string, title: string, body: string): Promise<void> {
  if (!FCM_SERVER_KEY || !token) return;
  try {
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: "key=" + FCM_SERVER_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
          icon: "https://claude-hms.vercel.app/assets/stavya-logo.png",
          badge: "https://claude-hms.vercel.app/assets/stavya-logo.png",
          sound: "default",
        },
        priority: "high",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      }),
    });
    if (!res.ok) console.warn("[push-relay] FCM send failed", res.status, await res.text());
  } catch (e) {
    console.warn("[push-relay] FCM error:", (e as Error).message);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return corsResponse({ ok: true });
  if (req.method !== "POST") return corsResponse({ error: "Method not allowed" }, 405);

  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  }

  try {
    const hookBody = await req.json();
    const msg = parseHookPayload(hookBody);

    if (!msg) return corsResponse({ ok: false, error: "No usable payload" }, 400);
    if (msg.toBackground === false) return corsResponse({ ok: true, skipped: true });

    const title = msg.title || "HMS Notification";
    const bodyText = msg.body || "";
    const notifType = msg.notifType || "info";

    let subs: any[] = [];
    if (SUPABASE_URL && SERVICE_KEY) {
      const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
      const { data, error } = await db
        .from("hms_push_subs")
        .select("id, user_id, platform, endpoint, p256dh, auth, fcm_token");
      if (error) {
        console.warn("[push-relay] Could not load subscriptions:", error.message);
        return corsResponse({ ok: false, error: error.message }, 500);
      }
      subs = (data as any[]) ?? [];
    }

    const excludeUserId = msg.senderId ? String(msg.senderId) : null;
    const webSubs = subs.filter((s) => s.endpoint && !(excludeUserId && s.user_id === excludeUserId));
    const fcmTokens = subs.filter((s) => s.fcm_token && !(excludeUserId && s.user_id === excludeUserId));

    const payloadForPush = {
      title,
      body: bodyText,
      notifType,
      key: msg.key || null,
      url: "dashboard.html",
    };

    let webSent = 0;
    let fcmSent = 0;

    if (VAPID_PUBLIC && VAPID_PRIVATE && webSubs.length > 0) {
      const results = await Promise.allSettled(
        webSubs.map((s) =>
          webPush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh || "", auth: s.auth || "" } },
            JSON.stringify(payloadForPush)
          )
        )
      );
      results.forEach((r) => {
        if (r.status === "fulfilled") webSent++;
        else {
          const reason = (r as PromiseRejectedResult).reason;
          console.warn("[push-relay] Web push fail:", reason?.statusCode ?? reason?.message ?? reason);
        }
      });
    }

    if (FCM_SERVER_KEY && fcmTokens.length > 0) {
      await Promise.allSettled(fcmTokens.map((s) => sendFcm(s.fcm_token, title, bodyText)));
      fcmSent = fcmTokens.length;
    }

    return corsResponse({ ok: true, received: { title, body: bodyText, notifType }, webSent, fcmSent });
  } catch (e) {
    console.error("[push-relay] Unexpected error:", (e as Error).message);
    return corsResponse({ ok: false, error: (e as Error).message }, 500);
  }
});

/** Accept both Supabase Database Webhook envelopes and direct client calls. */
function parseHookPayload(hookBody: any): any {
  try {
    // Webhook: { type, table, record: { payload } } or { new: {...} }
    if (hookBody && (hookBody.record || hookBody.new)) {
      const record = hookBody.record ?? hookBody.new;
      let p = record?.payload ?? record;
      if (typeof p === "string") {
        try { p = JSON.parse(p); } catch (e) { return null; }
      }
      return p || null;
    }
    // Direct call: the body itself is the payload { title, body, ... }
    if (hookBody && (hookBody.title || hookBody.payload)) {
      let p = hookBody.payload ?? hookBody;
      if (typeof p === "string") {
        try { p = JSON.parse(p); } catch (e) { return null; }
      }
      return p || null;
    }
    return null;
  } catch {
    return null;
  }
}