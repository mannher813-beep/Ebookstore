export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "Supabase configuration is missing" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    // Select all public Bios
    let dbUrl = `${supabaseUrl}/rest/v1/bios?is_public=eq.true&select=slug,content,updated_at`;
    
    const response = await fetch(dbUrl, {
      method: "GET",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: "Failed to fetch Bios from database", details: errText }), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const bios = await response.json();
    
    const formattedBios = bios.map(bio => {
      const formattedName = bio.slug
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      return {
        slug: bio.slug,
        nom: formattedName,
        content: bio.content,
        updated_at: bio.updated_at,
        url: `https://ebookstore-73b.pages.dev/bio/${bio.slug}`,
      };
    });

    // If there is a search query 'q', filter client-side
    let filtered = formattedBios;
    if (q) {
      const query = q.toLowerCase();
      filtered = formattedBios.filter(bio => 
        bio.slug.toLowerCase().includes(query) ||
        bio.nom.toLowerCase().includes(query) ||
        bio.content.toLowerCase().includes(query)
      );
    }

    return new Response(JSON.stringify(filtered), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error", message: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
