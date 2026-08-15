import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();

  if (!profile?.is_admin) {
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  const ghToken = Deno.env.get("GH_TOKEN");
  const ghRepo = Deno.env.get("GH_REPO");

  if (!ghToken || !ghRepo) {
    return new Response("Publish is not configured yet (missing GH_TOKEN/GH_REPO secrets)", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const ghResponse = await fetch(`https://api.github.com/repos/${ghRepo}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event_type: "publish" }),
  });

  if (!ghResponse.ok) {
    const text = await ghResponse.text();
    return new Response(`Error triggering deploy: ${text}`, { status: 500, headers: corsHeaders });
  }

  return new Response("OK", { headers: corsHeaders });
});
