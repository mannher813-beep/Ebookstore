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
    // Select all non-private CVs
    let dbUrl = `${supabaseUrl}/rest/v1/cvs?visibility=neq.private&select=reference,visibility,summary,data,updated_at`;
    
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
      return new Response(JSON.stringify({ error: "Failed to fetch CVs from database", details: errText }), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const cvs = await response.json();
    
    // Parse the JSON data if it is a string
    const formattedCvs = cvs.map(cv => {
      const parsedData = typeof cv.data === "string" ? JSON.parse(cv.data) : cv.data;
      return {
        reference: cv.reference,
        visibility: cv.visibility,
        summary: cv.summary,
        updated_at: cv.updated_at,
        nom: cv.visibility === "anonymous" ? "Anonyme" : (parsedData?.nom || "Non spécifié"),
        titre: parsedData?.titre || "Non spécifié",
        competences: parsedData?.competences || [],
        experiences: (parsedData?.experiences || []).map(exp => ({
          entreprise: exp.entreprise,
          poste: exp.poste,
          periode: exp.periode,
        })),
        url: `https://ebookstore-73b.pages.dev/cv/${cv.reference}`,
      };
    });

    // If there is a search query 'q', filter client-side for robust searching
    let filtered = formattedCvs;
    if (q) {
      const query = q.toLowerCase();
      filtered = formattedCvs.filter(cv => 
        cv.reference.toLowerCase().includes(query) ||
        cv.nom.toLowerCase().includes(query) ||
        cv.titre.toLowerCase().includes(query) ||
        cv.summary.toLowerCase().includes(query) ||
        cv.competences.some(c => c.toLowerCase().includes(query))
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
