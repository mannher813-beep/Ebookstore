export async function onRequest(context) {
  const { env } = context;

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  let jobs = [];
  let cvs = [];
  let bios = [];
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const dbUrl = `${supabaseUrl}/rest/v1/job_offers?statut=eq.active&moderation_status=eq.approved&select=slug,created_at&order=created_at.desc`;
      const response = await fetch(dbUrl, {
        method: "GET",
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        jobs = await response.json();
      }
    } catch (err) {
      console.error("Failed to fetch jobs for sitemap:", err);
    }

    try {
      const cvsUrl = `${supabaseUrl}/rest/v1/cvs?visibility=neq.private&select=reference,updated_at`;
      const response = await fetch(cvsUrl, {
        method: "GET",
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        cvs = await response.json();
      }
    } catch (err) {
      console.error("Failed to fetch CVs for sitemap:", err);
    }

    try {
      const biosUrl = `${supabaseUrl}/rest/v1/bios?is_public=eq.true&select=slug,updated_at`;
      const response = await fetch(biosUrl, {
        method: "GET",
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        bios = await response.json();
      }
    } catch (err) {
      console.error("Failed to fetch Bios for sitemap:", err);
    }
  }

  // Generate XML sitemap
  const currentDate = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Page d'accueil -->
  <url>
    <loc>https://ebookstore-73b.pages.dev/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

  // Dynamic Job Offer Detail pages
  for (const job of jobs) {
    if (job.slug) {
      const lastmod = job.created_at ? job.created_at.split("T")[0] : currentDate;
      xml += `  <url>
    <loc>https://ebookstore-73b.pages.dev/job/${job.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    </url>
`;
    }
  }

  // Dynamic CV pages
  for (const cv of cvs) {
    if (cv.reference) {
      const lastmod = cv.updated_at ? cv.updated_at.split("T")[0] : currentDate;
      xml += `  <url>
    <loc>https://ebookstore-73b.pages.dev/cv/${cv.reference}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }
  }

  // Dynamic Bio pages
  for (const bio of bios) {
    if (bio.slug) {
      const lastmod = bio.updated_at ? bio.updated_at.split("T")[0] : currentDate;
      xml += `  <url>
    <loc>https://ebookstore-73b.pages.dev/bio/${bio.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml;charset=UTF-8",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}
