export async function onRequest(context) {
  const { request, env } = context;

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

  // 2. Fetch all job offers from Supabase REST API
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  let jobOffers = [];

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const dbUrl = `${supabaseUrl}/rest/v1/job_offers?statut=eq.active&moderation_status=eq.approved&select=id,titre,slug,description,entreprise,lieu,type_contrat,salaire_min,salaire_max,devise,created_at&order=created_at.desc`;
      const dbResponse = await fetch(dbUrl, {
        method: "GET",
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        }
      });

      if (dbResponse.ok) {
        jobOffers = await dbResponse.json();
      }
    } catch (err) {
      console.error("Failed to fetch job offers for home partial SSR:", err);
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

  // 3. Construct rich structured data (JSON-LD)
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://ebookstore-73b.pages.dev/#website",
        "url": "https://ebookstore-73b.pages.dev/",
        "name": "EbookStore Recrutement",
        "description": "Plateforme d'excellence pour le recrutement de talents technologiques en Afrique"
      },
      {
        "@type": "Organization",
        "@id": "https://ebookstore-73b.pages.dev/#organization",
        "name": "EbookStore Recrutement",
        "url": "https://ebookstore-73b.pages.dev/",
        "logo": "https://ebookstore-73b.pages.dev/icon.svg",
        "sameAs": []
      }
    ]
  };

  if (jobOffers.length > 0) {
    structuredData["@graph"].push({
      "@type": "ItemList",
      "@id": "https://ebookstore-73b.pages.dev/#catalog",
      "name": "Nos offres d'emploi actives",
      "numberOfItems": jobOffers.length,
      "itemListElement": jobOffers.map((job, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `https://ebookstore-73b.pages.dev/job/${job.slug}`,
        "name": job.titre,
        "description": job.description
      }))
    });
  }

  const jsonLdString = JSON.stringify(structuredData, null, 2);

  // 4. Construct the semantic partial SSR HTML block
  let partialSsrHtml = `
  <!-- Partial SSR Content for Robots and AI crawlers (Visually Hidden) -->
  <div class="sr-only" aria-hidden="true" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">
    <h1>EbookStore Recrutement - Plateforme de Recrutement de Talents Technologiques en Afrique</h1>
    <p>Découvrez notre plateforme d'excellence pour recruter des experts tech qualifiés ou propulser votre carrière en Afrique francophone.</p>
    
    <h2>Nos Offres d'Emploi Actives</h2>
    <ul>
  `;

  for (const job of jobOffers) {
    const formattedSalary = (job.salaire_min && job.salaire_max) 
      ? `${job.salaire_min.toLocaleString()} - ${job.salaire_max.toLocaleString()} ${job.devise}` 
      : "Non spécifié";
    partialSsrHtml += `
      <li>
        <article>
          <h3><a href="/job/${job.slug}">${escapeHtml(job.titre)}</a></h3>
          <p><strong>Entreprise :</strong> ${escapeHtml(job.entreprise)}</p>
          <p><strong>Lieu :</strong> ${escapeHtml(job.lieu)}</p>
          <p><strong>Type de contrat :</strong> ${escapeHtml(job.type_contrat)}</p>
          <p><strong>Salaire :</strong> ${formattedSalary}</p>
          <p><strong>Description :</strong> ${escapeHtml(job.description)}</p>
        </article>
      </li>
    `;
  }

  partialSsrHtml += `
    </ul>
    
    <h2>Comment recruter ?</h2>
    <p>Inscrivez-vous en tant que recruteur, décrivez votre poste à pourvoir à l'aide de notre assistant IA et publiez votre offre. Vous pouvez également consulter directement notre répertoire public de candidats certifiés.</p>
    
    <h2>Espace Candidat</h2>
    <p>Créez votre profil candidat, rédigez votre biographie professionnelle, générez votre CV au format PDF et postulez instantanément aux meilleures offres de la région.</p>
  </div>
  `;

  // 5. Inject meta tags and structured data into <head>
  const headInjections = `
  <link rel="canonical" href="https://ebookstore-73b.pages.dev/" />
  <meta name="description" content="EbookStore Recrutement - Recrutez des talents technologiques qualifiés ou postulez à des offres d'emploi exclusives en Afrique francophone." />
  <script type="application/ld+json">
${jsonLdString}
  </script>
  `;

  // Apply substitutions
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${headInjections}\n</head>`);
  } else {
    html += headInjections;
  }

  if (html.includes("<body>")) {
    html = html.replace("<body>", `<body>\n${partialSsrHtml}`);
  } else if (html.includes("<body ")) {
    // If body tag has attributes
    html = html.replace(/<body[^>]*>/, (match) => `${match}\n${partialSsrHtml}`);
  } else {
    html += partialSsrHtml;
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "public, max-age=600", // Cache for 10 minutes
    }
  });
}
