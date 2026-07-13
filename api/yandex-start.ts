import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes } from "node:crypto";

/**
 * Step 1 of "Sign in with Yandex": set a CSRF state cookie and send the
 * browser to Yandex OAuth. Yandex redirects back to /api/yandex-callback.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (
    !process.env.YANDEX_CLIENT_ID ||
    !process.env.YANDEX_CLIENT_SECRET ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    res.redirect(302, "/auth?yandex_error=not_configured");
    return;
  }

  const state = randomBytes(16).toString("hex");
  res.setHeader(
    "Set-Cookie",
    `ya_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  );

  const url = new URL("https://oauth.yandex.ru/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.YANDEX_CLIENT_ID);
  url.searchParams.set("redirect_uri", `https://${req.headers.host}/api/yandex-callback`);
  url.searchParams.set("state", state);
  res.redirect(302, url.toString());
}
