export async function onRequest(context) {
  const { request, env, params } = context;
  const ebookId = params.ebookId;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Veuillez vous connecter pour télécharger cet ebook." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Configuration serveur incomplète (URL ou Clé de service manquante)." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. Authenticate user via Supabase GoTrue Auth API
    console.log("[CF FUNCTION] Authenticating user token...");
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        "apikey": supabaseAnonKey || supabaseServiceKey,
        "Authorization": `Bearer ${token}`
      }
    });

    if (!userResponse.ok) {
      const errText = await userResponse.text();
      console.error("[CF FUNCTION] Auth error:", errText);
      return new Response(JSON.stringify({ error: "Session expirée ou invalide. Veuillez vous reconnecter." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const user = await userResponse.json();
    const userId = user.id;
    console.log(`[CF FUNCTION] User authenticated: ${userId}`);

    // 2. Check if the user has purchased the ebook (statut = paid)
    console.log(`[CF FUNCTION] Verifying purchase for user ${userId} and ebook ${ebookId}...`);
    const purchaseUrl = `${supabaseUrl}/rest/v1/achats?user_id=eq.${userId}&ebook_id=eq.${ebookId}&statut=eq.paid&select=*`;
    const purchaseResponse = await fetch(purchaseUrl, {
      method: "GET",
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!purchaseResponse.ok) {
      const errText = await purchaseResponse.text();
      console.error("[CF FUNCTION] Purchase query error:", errText);
      return new Response(JSON.stringify({ error: "Erreur lors de la vérification de l'achat." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const purchases = await purchaseResponse.json();
    if (!purchases || purchases.length === 0) {
      return new Response(JSON.stringify({ error: "Vous n'avez pas acheté cet ebook ou le paiement est toujours en cours." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Retrieve ebook record to get the file storage path
    console.log(`[CF FUNCTION] Fetching ebook metadata for ${ebookId}...`);
    const ebookUrl = `${supabaseUrl}/rest/v1/ebooks?id=eq.${ebookId}&select=url_fichier_storage`;
    const ebookResponse = await fetch(ebookUrl, {
      method: "GET",
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!ebookResponse.ok) {
      const errText = await ebookResponse.text();
      console.error("[CF FUNCTION] Ebook query error:", errText);
      return new Response(JSON.stringify({ error: "Erreur lors de la récupération de l'ebook." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const ebooks = await ebookResponse.json();
    if (!ebooks || ebooks.length === 0 || !ebooks[0].url_fichier_storage) {
      return new Response(JSON.stringify({ error: "Fichier d'ebook non trouvé sur notre serveur." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const filePath = ebooks[0].url_fichier_storage;
    console.log(`[CF FUNCTION] Found ebook file path: "${filePath}". Generating signed URL...`);

    // 4. Generate signed URL for the private bucket "ebooks-fichiers"
    const signUrl = `${supabaseUrl}/storage/v1/object/sign/ebooks-fichiers/${encodeURIComponent(filePath)}`;
    const signResponse = await fetch(signUrl, {
      method: "POST",
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ expiresIn: 60 })
    });

    if (!signResponse.ok) {
      const errText = await signResponse.text();
      console.error("[CF FUNCTION] Supabase sign URL error:", errText);
      return new Response(JSON.stringify({ error: "Échec de la génération du lien sécurisé Supabase." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const signData = await signResponse.json();
    let signedUrl = signData.signedURL || signData.signedUrl;
    
    // If relative, prepend the Supabase storage base URL
    if (signedUrl && signedUrl.startsWith("/")) {
      signedUrl = `${supabaseUrl}/storage/v1${signedUrl}`;
    }

    console.log(`[CF FUNCTION] Signed URL successfully generated: "${signedUrl}"`);

    return new Response(JSON.stringify({
      url: signedUrl,
      expiresIn: 60,
      filename: filePath
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("[CF FUNCTION] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Une erreur interne est survenue : " + err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
