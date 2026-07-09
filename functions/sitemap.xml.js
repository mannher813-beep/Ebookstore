export async function onRequest(context) {
  const { env } = context;

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  let ebooks = [];
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const dbUrl = `${supabaseUrl}/rest/v1/ebooks?select=id,created_at&order=created_at.desc`;
      const response = await fetch(dbUrl, {
        method: "GET",
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        ebooks = await response.json();
      }
    } catch (err) {
      console.error("Failed to fetch ebooks for sitemap:", err);
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

  // Dynamic Ebook Detail pages
  for (const ebook of ebooks) {
    if (ebook.id) {
      const lastmod = ebook.created_at ? ebook.created_at.split("T")[0] : currentDate;
      xml += `  <url>
    <loc>https://ebookstore-73b.pages.dev/ebook/${ebook.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
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
