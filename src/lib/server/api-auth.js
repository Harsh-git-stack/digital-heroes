import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createServerSupabaseClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !publicKey || !serviceRoleKey) {
    throw new Error("Set the Supabase URL, publishable key, and server-only service role key.");
  }

  const authClient = createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { authClient, adminClient };
}

export async function getRequestUser(request, authClient) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { user: null, error: "Authentication required." };

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return { user: null, error: "The session is invalid or expired." };
  return { user: data.user, error: null };
}

export function jsonError(message, status) {
  return Response.json({ error: message }, { status });
}

export function isUuid(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
