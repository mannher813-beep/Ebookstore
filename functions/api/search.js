export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const query = q.toLowerCase();

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

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
    const [jobsRes, cvsRes, biosRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/job_offers?statut=eq.active&moderation_status=eq.approved&select=id,titre,slug,description,entreprise,lieu,type_contrat,secteur`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/cvs?visibility=neq.private&select=reference,visibility,summary,data,pdf_url`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/bios?is_public=eq.true&select=slug,content`, { headers })
    ]);

    let jobs = [];
    let cvs = [];
    let bios = [];

    if (jobsRes.ok) jobs = await jobsRes.json();
    if (cvsRes.ok) cvs = await cvsRes.json();
    if (biosRes.ok) bios = await biosRes.json();

    // Format and filter Job Offers
    const formattedJobs = jobs.map(j => ({
      type: "job",
      id: j.id,
      titre: j.titre,
      description: j.description,
      entreprise: j.entreprise,
      lieu: j.lieu,
      type_contrat: j.type_contrat,
      secteur: j.secteur,
      slug: j.slug,
      url: `https://ebookstore-73b.pages.dev/job/${j.slug}`
    })).filter(j => 
      !query || 
      j.titre.toLowerCase().includes(query) || 
      j.description.toLowerCase().includes(query) || 
      (j.entreprise && j.entreprise.toLowerCase().includes(query)) ||
      (j.lieu && j.lieu.toLowerCase().includes(query)) ||
      (j.secteur && j.secteur.toLowerCase().includes(query))
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
        pdf_url: cv.pdf_url || "",
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
      ...formattedJobs,
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
