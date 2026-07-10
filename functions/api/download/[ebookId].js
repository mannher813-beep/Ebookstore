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

  // Parse the host to construct redirects dynamically
  const urlObj = new URL(request.url);
  const hostUrl = `${urlObj.protocol}//${urlObj.host}`;

  const acceptHeader = request.headers.get("Accept") || "";
  const authHeader = request.headers.get("Authorization");
  const isJsonRequest = acceptHeader.includes("application/json") || authHeader;

  try {
    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Configuration serveur incomplète (URL ou Clé de service manquante)." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. Authenticate user: EVERY download requires a logged-in session (per user instructions)
    if (!authHeader) {
      console.log(`[CF DOWNLOAD] Unauthenticated request for ebook ${ebookId}.`);
      if (!isJsonRequest) {
        console.log(`[CF DOWNLOAD] Browser navigation. Redirecting to login page...`);
        return Response.redirect(`${hostUrl}/ebook/${ebookId}?trigger_auth=true`, 307);
      }
      return new Response(JSON.stringify({ error: "Veuillez vous connecter pour télécharger cet ebook." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");

    console.log("[CF DOWNLOAD] Authenticating user token...");
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        "apikey": supabaseAnonKey || supabaseServiceKey,
        "Authorization": `Bearer ${token}`
      }
    });

    if (!userResponse.ok) {
      const errText = await userResponse.text();
      console.error("[CF DOWNLOAD] Auth error:", errText);
      if (!isJsonRequest) {
        return Response.redirect(`${hostUrl}/ebook/${ebookId}?trigger_auth=true`, 307);
      }
      return new Response(JSON.stringify({ error: "Session expirée ou invalide. Veuillez vous reconnecter." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const user = await userResponse.json();
    const userId = user.id;
    console.log(`[CF DOWNLOAD] User authenticated: ${userId}`);

    // 2. Retrieve ebook record to check if it's free and get its storage file path
    console.log(`[CF DOWNLOAD] Fetching ebook metadata for ${ebookId} to verify price...`);
    const ebookUrl = `${supabaseUrl}/rest/v1/ebooks?id=eq.${ebookId}&select=prix,url_fichier_storage`;
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
      console.error("[CF DOWNLOAD] Ebook query error:", errText);
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

    const ebook = ebooks[0];
    const isFree = Number(ebook.prix) === 0;
    const filePath = ebook.url_fichier_storage;

    // 3. If the ebook is NOT free, require a paid transaction check
    if (!isFree) {
      console.log(`[CF DOWNLOAD] Verifying purchase for user ${userId} and ebook ${ebookId}...`);
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
        console.error("[CF DOWNLOAD] Purchase query error:", errText);
        return new Response(JSON.stringify({ error: "Erreur lors de la vérification de l'achat." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const purchases = await purchaseResponse.json();
      if (!purchases || purchases.length === 0) {
        if (!isJsonRequest) {
          console.log(`[CF DOWNLOAD] User has not purchased this book. Redirecting to product page...`);
          return Response.redirect(`${hostUrl}/ebook/${ebookId}`, 307);
        }
        return new Response(JSON.stringify({ error: "Vous n'avez pas acheté cet ebook ou le paiement est toujours en cours." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } else {
      console.log(`[CF DOWNLOAD] Ebook ${ebookId} is FREE. User is authenticated, download permitted!`);
    }

    console.log(`[CF DOWNLOAD] Found ebook file path: "${filePath}". Generating signed URL...`);

    // 4. Generate signed URL for the private bucket "ebooks-fichiers"
    const signUrl = `${supabaseUrl}/storage/v1/object/sign/ebooks-fichiers/${encodeURIComponent(filePath)}`;
    const signResponse = await fetch(signUrl, {
      method: "POST",
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ expiresIn: 120 }) // Expire in 120 seconds for safety
    });

    if (!signResponse.ok) {
      const errText = await signResponse.text();
      console.error("[CF DOWNLOAD] Supabase sign URL error:", errText);
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

    console.log(`[CF DOWNLOAD] Signed URL successfully generated: "${signedUrl}"`);

    if (!isJsonRequest) {
      console.log(`[CF DOWNLOAD] Direct browser request detected. Redirecting (307) to file URL...`);
      return Response.redirect(signedUrl, 307);
    }

    return new Response(JSON.stringify({
      url: signedUrl,
      expiresIn: 120,
      filename: filePath
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("[CF DOWNLOAD] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Une erreur interne est survenue : " + err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
