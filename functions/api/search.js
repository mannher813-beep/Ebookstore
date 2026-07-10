export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const query = q.toLowerCase();

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
    const headers = {
      "apikey": supabaseAnonKey,
      "Authorization": `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
    };

    // Run fetches in parallel
    const [ebooksRes, cvsRes, biosRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/ebooks?select=id,titre,description,prix,categorie`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/cvs?visibility=neq.private&select=reference,visibility,summary,data`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/bios?is_public=eq.true&select=slug,content`, { headers })
    ]);

    let ebooks = [];
    let cvs = [];
    let bios = [];

    if (ebooksRes.ok) ebooks = await ebooksRes.json();
    if (cvsRes.ok) cvs = await cvsRes.json();
    if (biosRes.ok) bios = await biosRes.json();

    // Format and filter Ebooks
    const formattedEbooks = ebooks.map(b => ({
      type: "ebook",
      id: b.id,
      titre: b.titre,
      description: b.description,
      prix: b.prix,
      categorie: b.categorie,
      url: `https://ebookstore-73b.pages.dev/ebook/${b.id}`
    })).filter(b => 
      !query || 
      b.titre.toLowerCase().includes(query) || 
      b.description.toLowerCase().includes(query) || 
      b.categorie.toLowerCase().includes(query)
    );

    // Format and filter CVs
    const formattedCvs = cvs.map(cv => {
      const parsedData = typeof cv.data === "string" ? JSON.parse(cv.data) : cv.data;
      const nom = cv.visibility === "anonymous" ? "Anonyme" : (parsedData?.nom || "Non spécifié");
      const titre = parsedData?.titre || "Non spécifié";
      const competences = parsedData?.competences || [];
      const summary = cv.summary || "";

      return {
        type: "cv",
        reference: cv.reference,
        nom,
        titre,
        summary,
        competences,
        url: `https://ebookstore-73b.pages.dev/cv/${cv.reference}`
      };
    }).filter(cv => 
      !query ||
      cv.reference.toLowerCase().includes(query) ||
      cv.nom.toLowerCase().includes(query) ||
      cv.titre.toLowerCase().includes(query) ||
      cv.summary.toLowerCase().includes(query) ||
      cv.competences.some(c => c.toLowerCase().includes(query))
    );

    // Format and filter Bios
    const formattedBios = bios.map(bio => {
      const formattedName = bio.slug
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      const content = bio.content || "";

      return {
        type: "bio",
        slug: bio.slug,
        nom: formattedName,
        content,
        url: `https://ebookstore-73b.pages.dev/bio/${bio.slug}`
      };
    }).filter(bio => 
      !query ||
      bio.slug.toLowerCase().includes(query) ||
      bio.nom.toLowerCase().includes(query) ||
      bio.content.toLowerCase().includes(query)
    );

    const combinedResults = [
      ...formattedEbooks,
      ...formattedCvs,
      ...formattedBios
    ];

    return new Response(JSON.stringify({
      query: q,
      total_results: combinedResults.length,
      results: combinedResults
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=30",
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error", message: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });
  }
}
