// Supabase Edge Function: review-verification
// Deploy with: supabase functions deploy review-verification
// Set SUPABASE_SERVICE_ROLE_KEY as a function secret. Never put it in the app.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server is not configured" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user || user.app_metadata?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  let body: { requestId?: string; decision?: string; note?: string };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
  if (!body.requestId || !["approved", "rejected"].includes(body.decision ?? "")) {
    return new Response(JSON.stringify({ error: "requestId and approved/rejected decision are required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: request, error: readError } = await admin
    .from("verification_requests")
    .select("id,user_id,status")
    .eq("id", body.requestId)
    .single();

  if (readError || !request || request.status !== "pending") {
    return new Response(JSON.stringify({ error: "Pending request not found" }), {
      status: 404, headers: { "Content-Type": "application/json" },
    });
  }

  const now = new Date().toISOString();
  const { error: requestError } = await admin.from("verification_requests").update({
    status: body.decision,
    reviewer_id: user.id,
    reviewer_note: (body.note ?? "").slice(0, 1000),
    reviewed_at: now,
  }).eq("id", body.requestId).eq("status", "pending");

  if (requestError) {
    return new Response(JSON.stringify({ error: "Could not update request" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  const { error: profileError } = await admin.from("profiles").update({
    verification_status: body.decision,
    verified_at: body.decision === "approved" ? now : null,
  }).eq("id", request.user_id);

  if (profileError) {
    return new Response(JSON.stringify({ error: "Request reviewed but profile update failed; contact support" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, decision: body.decision }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
