export async function onRequest(context) {
  const { request, env, params } = context;
  const slug = params.slug;

  // 1. Fetch the default app.html asset
  let html = "";
  try {
    const url = new URL(request.url);
    url.pathname = "/app.html";
    const assetResponse = await env.ASSETS.fetch(url);
    if (assetResponse.ok) {
      html = await assetResponse.text();
    } else {
      return new Response("Index asset not found", { status: 404 });
    }
  } catch (err) {
    return new Response("Error loading index.html: " + err.message, { status: 500 });
  }

  // 2. Initialize default meta values
  let titreBio = "Biographie Professionnelle | EbookStore Afrique";
  let descriptionBio = "Consultez cette biographie professionnelle en ligne sur EbookStore Afrique.";
  let hasData = false;
  let bioData = null;

  // 3. Fetch specific Bio data from Supabase REST API
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  if (slug && supabaseUrl && supabaseAnonKey) {
    try {
      const dbUrl = `${supabaseUrl}/rest/v1/bios?slug=eq.${slug}&select=*`;
      const dbResponse = await fetch(dbUrl, {
        method: "GET",
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        }
      });

      if (dbResponse.ok) {
        const bios = await dbResponse.json();
        if (bios && bios.length > 0) {
          const bio = bios[0];
          // Check public visibility
          if (bio.is_public) {
            bioData = bio;
            // Humanize slug into words if no name or title exists (e.g. "hermann-lana" -> "Hermann Lana")
            const formattedName = slug
              .split("-")
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");

            titreBio = `Biographie de ${formattedName} | EbookStore Afrique`;
            // Strip markdown for a clean description snippet
            let cleanText = bio.content || "";
            cleanText = cleanText
              .replace(/[#*`_-]/g, "") // remove markdown accents
              .replace(/\s+/g, " ")
              .trim();
            
            descriptionBio = cleanText.substring(0, 160) || descriptionBio;
            hasData = true;
          } else {
            titreBio = "Biographie Confidentielle | EbookStore Afrique";
            descriptionBio = "Cette biographie professionnelle est confidentielle et son partage public est désactivé.";
          }
        } else {
          titreBio = "Biographie Introuvable | EbookStore Afrique";
          descriptionBio = "La biographie professionnelle demandée n'existe pas ou a été déplacée.";
        }
      }
    } catch (err) {
      console.error("Failed to fetch Bio metadata from Supabase:", err);
    }
  }

  // Helper to escape HTML safely
  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const escapedTitle = escapeHtml(titreBio);
  let truncatedDesc = descriptionBio;
  if (truncatedDesc.length > 160) {
    truncatedDesc = truncatedDesc.substring(0, 157) + "...";
  }
  const escapedMetaDesc = escapeHtml(truncatedDesc);

  // 4. Construct Structured Data (JSON-LD)
  let jsonLdString = "{}";
  if (hasData && bioData) {
    const formattedName = slug
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    const bioSchema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ProfilePage",
          "@id": `https://ebookstore-73b.pages.dev/bio/${slug}#webpage`,
          "url": `https://ebookstore-73b.pages.dev/bio/${slug}`,
          "name": titreBio,
          "description": descriptionBio,
          "mainEntity": {
            "@type": "Person",
            "@id": `https://ebookstore-73b.pages.dev/bio/${slug}#person`,
            "name": formattedName,
            "description": descriptionBio
          }
        },
        {
          "@type": "BreadcrumbList",
          "@id": `https://ebookstore-73b.pages.dev/bio/${slug}#breadcrumb`,
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Accueil",
              "item": "https://ebookstore-73b.pages.dev/"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Biographies",
              "item": `https://ebookstore-73b.pages.dev/`
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": formattedName,
              "item": `https://ebookstore-73b.pages.dev/bio/${slug}`
            }
          ]
        }
      ]
    };
    jsonLdString = JSON.stringify(bioSchema, null, 2);
  }

  // 5. Construct semantic content (SSR partial HTML)
  let partialSsrHtml = "";
  if (hasData && bioData) {
    const formattedName = slug
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    partialSsrHtml = `
    <!-- Partial SSR Content for Robots and AI crawlers (Visually Hidden) -->
    <div class="sr-only" aria-hidden="true" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">
      <h1>Biographie Professionnelle de ${escapeHtml(formattedName)}</h1>
      
      <div class="bio-content">
        ${escapeHtml(bioData.content || "")}
      </div>

      <p>
        Cette biographie est publiée et partagée publiquement sur EbookStore Afrique. Pour lire la version originale, visitez :
        <a href="https://ebookstore-73b.pages.dev/bio/${slug}">https://ebookstore-73b.pages.dev/bio/${slug}</a>
      </p>
    </div>
    `;
  } else {
    partialSsrHtml = `
    <div class="sr-only" aria-hidden="true" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">
      <h1>${escapedTitle}</h1>
      <p>${escapeHtml(descriptionBio)}</p>
    </div>
    `;
  }

  // 6. Set up Dynamic Meta Tags (Open Graph, Twitter, Description, Canonical)
  const ogTags = `
  <!-- Dynamic Meta Tags Generated by Cloudflare Pages Function -->
  <link rel="canonical" href="https://ebookstore-73b.pages.dev/bio/${slug}" />
  <meta name="description" content="${escapedMetaDesc}" />
  <meta property="og:title" content="${escapedTitle}">
  <meta property="og:description" content="${escapedMetaDesc}">
  <meta property="og:url" content="https://ebookstore-73b.pages.dev/bio/${slug}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapedTitle}">
  <meta name="twitter:description" content="${escapedMetaDesc}">
  <script type="application/ld+json">
${jsonLdString}
  </script>
  `;

  // Replace default title tag with the Bio title
  if (html.includes("<title>")) {
    html = html.replace(/<title>.*?<\/title>/, `<title>${escapedTitle}</title>`);
  }

  // Inject meta tags and structured data into <head>
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${ogTags}\n</head>`);
  } else {
    html += ogTags;
  }

  // Inject semantic text block into the <body>
  if (html.includes("<body>")) {
    html = html.replace("<body>", `<body>\n${partialSsrHtml}`);
  } else if (html.includes("<body ")) {
    html = html.replace(/<body[^>]*>/, (match) => `${match}\n${partialSsrHtml}`);
  } else {
    html += partialSsrHtml;
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "public, max-age=600",
    }
  });
}
