import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

interface YandexTokenResponse {
  access_token?: string;
}

interface YandexUserInfo {
  id?: string;
  default_email?: string;
  real_name?: string;
  display_name?: string;
}

/**
 * Step 2 of "Sign in with Yandex": exchange the OAuth code for the user's
 * Yandex e-mail, find-or-create that user in Supabase (service role), then
 * hand the browser a one-time token_hash which the client turns into a
 * session via supabase.auth.verifyOtp.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const fail = (reason: string) =>
    res.redirect(302, `/auth?yandex_error=${encodeURIComponent(reason)}`);

  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const cookieState = /(?:^|;\s*)ya_state=([^;]+)/.exec(req.headers.cookie ?? "")?.[1];
    if (!code || !state || state !== cookieState) return fail("state_mismatch");

    const token = (await fetch("https://oauth.yandex.ru/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.YANDEX_CLIENT_ID ?? "",
        client_secret: process.env.YANDEX_CLIENT_SECRET ?? "",
      }),
    }).then((r) => r.json())) as YandexTokenResponse;
    if (!token.access_token) return fail("token_exchange");

    const info = (await fetch("https://login.yandex.ru/info?format=json", {
      headers: { Authorization: `OAuth ${token.access_token}` },
    }).then((r) => r.json())) as YandexUserInfo;
    const email = info.default_email?.toLowerCase();
    if (!email) return fail("no_email");

    const admin = createClient(
      process.env.VITE_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: info.real_name || info.display_name || null,
        yandex_id: info.id ?? null,
        provider: "yandex",
      },
    });
    // "Already registered" is the normal repeat-login path; anything else is fatal.
    if (createErr && !/already|exists/i.test(createErr.message)) return fail("create_user");

    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) return fail("link");

    res.setHeader("Set-Cookie", "ya_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
    res.redirect(302, `/auth?token_hash=${encodeURIComponent(tokenHash)}`);
  } catch {
    fail("unexpected");
  }
}
