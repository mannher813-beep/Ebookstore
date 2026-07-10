export async function onRequest(context) {
  const { request, env, params } = context;
  const reference = params.reference;

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
  let titreProfil = "Profil Professionnel | EbookStore Afrique";
  let descriptionProfil = "Consultez ce profil professionnel et CV en ligne sur EbookStore Afrique.";
  let photoProfil = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150";
  let nomCandidat = "Professionnel";
  let titreCandidat = "Développeur";
  let hasData = false;
  let cvData = null;

  // 3. Fetch specific CV data from Supabase REST API
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  if (reference && supabaseUrl && supabaseAnonKey) {
    try {
      const dbUrl = `${supabaseUrl}/rest/v1/cvs?reference=eq.${reference}&select=*`;
      const dbResponse = await fetch(dbUrl, {
        method: "GET",
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        }
      });

      if (dbResponse.ok) {
        const cvs = await dbResponse.json();
        if (cvs && cvs.length > 0) {
          const cv = cvs[0];
          // Check public visibility
          if (cv.visibility !== "private") {
            cvData = cv;
            const parsedData = typeof cv.data === "string" ? JSON.parse(cv.data) : cv.data;
            if (parsedData) {
              nomCandidat = parsedData.nom || nomCandidat;
              titreCandidat = parsedData.titre || titreCandidat;
              photoProfil = parsedData.photo || photoProfil;
              titreProfil = `CV de ${nomCandidat} - ${titreCandidat} | EbookStore Afrique`;
              descriptionProfil = cv.summary || `Découvrez le parcours professionnel, les compétences et les expériences de ${nomCandidat} (${titreCandidat}) sur EbookStore Afrique.`;
              hasData = true;
            }
          } else {
            titreProfil = "Profil Privé | EbookStore Afrique";
            descriptionProfil = "Ce profil professionnel est confidentiel et son accès public est restreint par l'auteur.";
          }
        } else {
          titreProfil = "Profil Introuvable | EbookStore Afrique";
          descriptionProfil = "Le Curriculum Vitae demandé n'existe pas ou a été supprimé.";
        }
      }
    } catch (err) {
      console.error("Failed to fetch CV metadata from Supabase:", err);
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

  const escapedTitle = escapeHtml(titreProfil);
  let truncatedDesc = descriptionProfil;
  if (truncatedDesc.length > 160) {
    truncatedDesc = truncatedDesc.substring(0, 157) + "...";
  }
  const escapedMetaDesc = escapeHtml(truncatedDesc);
  const escapedPhoto = escapeHtml(photoProfil);

  // 4. Construct Structured Data (JSON-LD) for ProfilePage / Person
  let jsonLdString = "{}";
  if (hasData && cvData) {
    const parsedData = typeof cvData.data === "string" ? JSON.parse(cvData.data) : cvData.data;
    
    const personSchema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ProfilePage",
          "@id": `https://ebookstore-73b.pages.dev/cv/${reference}#webpage`,
          "url": `https://ebookstore-73b.pages.dev/cv/${reference}`,
          "name": titreProfil,
          "description": descriptionProfil,
          "mainEntity": {
            "@type": "Person",
            "@id": `https://ebookstore-73b.pages.dev/cv/${reference}#person`,
            "name": nomCandidat,
            "jobTitle": titreCandidat,
            "image": photoProfil,
            "description": cvData.summary,
            "knowsAbout": parsedData.competences || []
          }
        },
        {
          "@type": "BreadcrumbList",
          "@id": `https://ebookstore-73b.pages.dev/cv/${reference}#breadcrumb`,
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
              "name": "CVs",
              "item": `https://ebookstore-73b.pages.dev/`
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": nomCandidat,
              "item": `https://ebookstore-73b.pages.dev/cv/${reference}`
            }
          ]
        }
      ]
    };
    jsonLdString = JSON.stringify(personSchema, null, 2);
  }

  // 5. Construct semantic content (SSR partial HTML)
  let partialSsrHtml = "";
  if (hasData && cvData) {
    const parsedData = typeof cvData.data === "string" ? JSON.parse(cvData.data) : cvData.data;
    const comps = parsedData.competences || [];
    const exps = parsedData.experiences || [];
    const educs = parsedData.formation || [];

    partialSsrHtml = `
    <!-- Partial SSR Content for Robots and AI crawlers (Visually Hidden) -->
    <div class="sr-only" aria-hidden="true" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">
      <h1>Curriculum Vitae de ${escapeHtml(nomCandidat)}</h1>
      <h2>${escapeHtml(titreCandidat)}</h2>
      
      ${escapedPhoto ? `<img src="${escapedPhoto}" alt="${escapeHtml(nomCandidat)}" width="150" height="150" />` : ""}
      
      <h3>Résumé professionnel</h3>
      <p>${escapeHtml(cvData.summary || "")}</p>
      
      <h3>Compétences</h3>
      <ul>
        ${comps.map(c => `<li>${escapeHtml(c)}</li>`).join("\n")}
      </ul>
      
      <h3>Expériences Professionnelles</h3>
      <ul>
        ${exps.map(e => `
          <li>
            <h4>${escapeHtml(e.poste)} chez ${escapeHtml(e.entreprise)} (${escapeHtml(e.periode)})</h4>
            <p>${escapeHtml(e.description)}</p>
          </li>
        `).join("\n")}
      </ul>
      
      <h3>Formation & Éducation</h3>
      <ul>
        ${educs.map(ed => `
          <li>
            <h4>${escapeHtml(ed.diplome)} - ${escapeHtml(ed.etablissement)} (${escapeHtml(ed.annee)})</h4>
          </li>
        `).join("\n")}
      </ul>

      <p>
        Ce CV est hébergé publiquement sur EbookStore Afrique. Pour consulter la version interactive et télécharger la version PDF signée, visitez :
        <a href="https://ebookstore-73b.pages.dev/cv/${reference}">https://ebookstore-73b.pages.dev/cv/${reference}</a>
      </p>
    </div>
    `;
  } else {
    partialSsrHtml = `
    <div class="sr-only" aria-hidden="true" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">
      <h1>${escapedTitle}</h1>
      <p>${escapeHtml(descriptionProfil)}</p>
    </div>
    `;
  }

  // 6. Set up Dynamic Meta Tags (Open Graph, Twitter, Description, Canonical)
  const ogTags = `
  <!-- Dynamic Meta Tags Generated by Cloudflare Pages Function -->
  <link rel="canonical" href="https://ebookstore-73b.pages.dev/cv/${reference}" />
  <meta name="description" content="${escapedMetaDesc}" />
  <meta property="og:title" content="${escapedTitle}">
  <meta property="og:description" content="${escapedMetaDesc}">
  <meta property="og:image" content="${escapedPhoto}">
  <meta property="og:url" content="https://ebookstore-73b.pages.dev/cv/${reference}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapedTitle}">
  <meta name="twitter:description" content="${escapedMetaDesc}">
  <meta name="twitter:image" content="${escapedPhoto}">
  <script type="application/ld+json">
${jsonLdString}
  </script>
  `;

  // Replace default title tag with the CV profile title
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
