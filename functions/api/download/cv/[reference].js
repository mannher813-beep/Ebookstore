export async function onRequest(context) {
  const { request, env, params } = context;
  const reference = params.reference;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const urlObj = new URL(request.url);
  const hostUrl = `${urlObj.protocol}//${urlObj.host}`;

  const acceptHeader = request.headers.get("Accept") || "";
  const authHeader = request.headers.get("Authorization");
  const isJsonRequest = acceptHeader.includes("application/json") || authHeader;

  try {
    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Configuration serveur incomplète." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. Check Authentication: Every download requires a valid session
    if (!authHeader) {
      console.log(`[CF CV DOWNLOAD] Unauthenticated request for CV ${reference}.`);
      if (!isJsonRequest) {
        console.log(`[CF CV DOWNLOAD] Redirecting browser to CV page with auth trigger...`);
        return Response.redirect(`${hostUrl}/cv/${reference}?trigger_auth=true`, 307);
      }
      return new Response(JSON.stringify({ error: "Veuillez vous connecter pour télécharger ce CV." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");

    console.log("[CF CV DOWNLOAD] Authenticating user token...");
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${token}`
      }
    });

    if (!userResponse.ok) {
      const errText = await userResponse.text();
      console.error("[CF CV DOWNLOAD] Auth error:", errText);
      if (!isJsonRequest) {
        return Response.redirect(`${hostUrl}/cv/${reference}?trigger_auth=true`, 307);
      }
      return new Response(JSON.stringify({ error: "Session expirée ou invalide. Veuillez vous reconnecter." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const user = await userResponse.json();
    console.log(`[CF CV DOWNLOAD] User authenticated successfully: ${user.id}`);

    // 2. Fetch CV to find its actual PDF URL
    console.log(`[CF CV DOWNLOAD] Retrieving CV path for reference ${reference}...`);
    const dbUrl = `${supabaseUrl}/rest/v1/cvs?reference=eq.${reference}&select=pdf_url,visibility`;
    const dbResponse = await fetch(dbUrl, {
      method: "GET",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!dbResponse.ok) {
      const errText = await dbResponse.text();
      console.error("[CF CV DOWNLOAD] Query error:", errText);
      return new Response(JSON.stringify({ error: "Erreur lors de la récupération du CV." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const cvs = await dbResponse.json();
    if (!cvs || cvs.length === 0) {
      return new Response(JSON.stringify({ error: "Curriculum Vitae introuvable." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const cv = cvs[0];
    if (cv.visibility === "private") {
      return new Response(JSON.stringify({ error: "Ce Curriculum Vitae est privé." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!cv.pdf_url) {
      return new Response(JSON.stringify({ error: "Le fichier PDF de ce CV n'est pas encore disponible." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[CF CV DOWNLOAD] Redirecting to actual PDF file: ${cv.pdf_url}`);

    if (!isJsonRequest) {
      return Response.redirect(cv.pdf_url, 307);
    }

    return new Response(JSON.stringify({
      url: cv.pdf_url,
      filename: `CV_${reference}.pdf`
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("[CF CV DOWNLOAD] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Une erreur interne est survenue : " + err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
