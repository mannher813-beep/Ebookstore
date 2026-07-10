export async function onRequest(context) {
  const { request, env, params } = context;
  const id = params.id;

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
  let titre = "EbookStore - Les Meilleurs Ebooks de Développement";
  let description = "Découvrez des ebooks de haute qualité pour propulser votre carrière de développeur en Afrique.";
  let url_couverture = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400";
  let prix = 0;
  let categorie = "Développement";
  let hasData = false;

  // 3. Fetch specific ebook data from Supabase REST API
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  if (id && supabaseUrl && supabaseAnonKey) {
    try {
      const dbUrl = `${supabaseUrl}/rest/v1/ebooks?id=eq.${id}&select=titre,description,url_couverture,prix,categorie`;
      const dbResponse = await fetch(dbUrl, {
        method: "GET",
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        }
      });

      if (dbResponse.ok) {
        const ebooks = await dbResponse.json();
        if (ebooks && ebooks.length > 0) {
          const ebook = ebooks[0];
          if (ebook.titre) titre = ebook.titre;
          if (ebook.description) description = ebook.description;
          if (ebook.url_couverture) url_couverture = ebook.url_couverture;
          if (ebook.prix !== undefined) prix = Number(ebook.prix);
          if (ebook.categorie) categorie = ebook.categorie;
          hasData = true;
        }
      }
    } catch (err) {
      console.error("Failed to fetch ebook metadata from Supabase:", err);
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

  const escapedTitle = escapeHtml(titre);
  
  // Truncate description for meta tag (keep original for JSON-LD and Ssr text)
  let truncatedDesc = description;
  if (truncatedDesc.length > 160) {
    truncatedDesc = truncatedDesc.substring(0, 157) + "...";
  }
  const escapedMetaDesc = escapeHtml(truncatedDesc);
  const escapedImage = escapeHtml(url_couverture);
  const escapedCategory = escapeHtml(categorie);

  const formattedPrice = prix === 0 ? "GRATUIT" : `${prix.toLocaleString()} FCFA`;

  // 4. Construct Structured Data (JSON-LD) for the Product/Book and Breadcrumbs
  const productSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Book",
        "@id": `https://ebookstore-73b.pages.dev/ebook/${id}#book`,
        "name": titre,
        "description": description,
        "image": url_couverture,
        "genre": categorie,
        "inLanguage": "fr",
        "offers": {
          "@type": "Offer",
          "price": prix,
          "priceCurrency": "XAF",
          "priceValidUntil": "2030-12-31",
          "availability": "https://schema.org/InStock",
          "url": `https://ebookstore-73b.pages.dev/ebook/${id}`
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `https://ebookstore-73b.pages.dev/ebook/${id}#breadcrumb`,
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
            "name": categorie,
            "item": `https://ebookstore-73b.pages.dev/?category=${encodeURIComponent(categorie)}`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": titre,
            "item": `https://ebookstore-73b.pages.dev/ebook/${id}`
          }
        ]
      }
    ]
  };

  const jsonLdString = JSON.stringify(productSchema, null, 2);

  // 5. Construct semantic content (SSR partial HTML) for the specific ebook
  const partialSsrHtml = `
  <!-- Partial SSR Content for Robots and AI crawlers (Visually Hidden) -->
  <div class="sr-only" aria-hidden="true" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">
    <h1>${escapedTitle}</h1>
    <p><strong>Catégorie :</strong> ${escapedCategory}</p>
    <p><strong>Prix :</strong> ${formattedPrice}</p>
    
    <h2>Description de l'ouvrage</h2>
    <p>${escapeHtml(description)}</p>
    
    <img src="${escapedImage}" alt="${escapedTitle}" width="400" height="300" />
    
    <h2>Détails techniques et d'achat</h2>
    <ul>
      <li>Format d'ouvrage : Ebook PDF</li>
      <li>Langue : Français</li>
      <li>Mise à jour : 2026</li>
      <li>Mode de livraison : Téléchargement immédiat</li>
      <li>Moyens de paiement : Orange Money, MTN Mobile Money, Wave, etc. (via MoneyFusion)</li>
    </ul>

    <p>
      Intéressé par cet ouvrage ? Vous pouvez l'acheter et le télécharger directement en allant sur :
      <a href="https://ebookstore-73b.pages.dev/ebook/${id}">Télécharger ${escapedTitle}</a>
    </p>
  </div>
  `;

  // 6. Set up Dynamic Meta Tags (Open Graph, Twitter, Description, Canonical)
  const ogTags = `
  <!-- Dynamic Meta Tags Generated by Cloudflare Pages Function -->
  <link rel="canonical" href="https://ebookstore-73b.pages.dev/ebook/${id}" />
  <meta name="description" content="${escapedMetaDesc}" />
  <meta property="og:title" content="${escapedTitle} | EbookStore Afrique">
  <meta property="og:description" content="${escapedMetaDesc}">
  <meta property="og:image" content="${escapedImage}">
  <meta property="og:url" content="https://ebookstore-73b.pages.dev/ebook/${id}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapedTitle} | EbookStore Afrique">
  <meta name="twitter:description" content="${escapedMetaDesc}">
  <meta name="twitter:image" content="${escapedImage}">
  <script type="application/ld+json">
${jsonLdString}
  </script>
  `;

  // Replace default title tag with the specific ebook title
  if (html.includes("<title>")) {
    html = html.replace(/<title>.*?<\/title>/, `<title>${escapedTitle} | EbookStore Afrique</title>`);
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
      "Cache-Control": "public, max-age=600", // Cache for 10 mins
    }
  });
}
