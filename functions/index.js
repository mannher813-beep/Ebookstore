export async function onRequest(context) {
  const { request, env } = context;

  // 1. Fetch the default index.html asset
  let html = "";
  try {
    const url = new URL(request.url);
    url.pathname = "/index.html";
    const assetResponse = await env.ASSETS.fetch(url);
    if (assetResponse.ok) {
      html = await assetResponse.text();
    } else {
      return new Response("Index asset not found", { status: 404 });
    }
  } catch (err) {
    return new Response("Error loading index.html: " + err.message, { status: 500 });
  }

  // 2. Fetch all ebooks from Supabase REST API
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
  let ebooks = [];

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const dbUrl = `${supabaseUrl}/rest/v1/ebooks?select=id,titre,description,prix,categorie,url_couverture,created_at&order=created_at.desc`;
      const dbResponse = await fetch(dbUrl, {
        method: "GET",
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        }
      });

      if (dbResponse.ok) {
        ebooks = await dbResponse.json();
      }
    } catch (err) {
      console.error("Failed to fetch ebooks for home partial SSR:", err);
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
        "name": "EbookStore Afrique",
        "description": "Les Meilleurs Ebooks de Développement Professionnel et No-Code en Afrique"
      },
      {
        "@type": "Organization",
        "@id": "https://ebookstore-73b.pages.dev/#organization",
        "name": "EbookStore Afrique",
        "url": "https://ebookstore-73b.pages.dev/",
        "logo": "https://ebookstore-73b.pages.dev/icon.svg",
        "sameAs": []
      }
    ]
  };

  if (ebooks.length > 0) {
    structuredData["@graph"].push({
      "@type": "ItemList",
      "@id": "https://ebookstore-73b.pages.dev/#catalog",
      "name": "Notre catalogue complet d'ebooks",
      "numberOfItems": ebooks.length,
      "itemListElement": ebooks.map((book, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `https://ebookstore-73b.pages.dev/ebook/${book.id}`,
        "name": book.titre,
        "description": book.description
      }))
    });
  }

  const jsonLdString = JSON.stringify(structuredData, null, 2);

  // 4. Construct the semantic partial SSR HTML block
  let partialSsrHtml = `
  <!-- Partial SSR Content for Robots and AI crawlers (Visually Hidden) -->
  <div class="sr-only" aria-hidden="true" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">
    <h1>EbookStore Afrique - Les Meilleurs Ebooks de Développement en Afrique</h1>
    <p>Découvrez notre plateforme d'excellence pour acquérir de nouvelles compétences technologiques en Afrique. Achetez vos ebooks et formations PDF via Orange Money, MTN MoMo, Wave, etc., et téléchargez-les instantanément de manière sécurisée.</p>
    
    <h2>Notre Catalogue complet d'Ebooks</h2>
    <ul>
  `;

  for (const book of ebooks) {
    const formattedPrice = book.prix === 0 ? "GRATUIT" : `${book.prix.toLocaleString()} FCFA`;
    partialSsrHtml += `
      <li>
        <article>
          <h3><a href="/ebook/${book.id}">${escapeHtml(book.titre)}</a></h3>
          <p><strong>Catégorie :</strong> ${escapeHtml(book.categorie)}</p>
          <p><strong>Prix :</strong> ${formattedPrice}</p>
          <p><strong>Description :</strong> ${escapeHtml(book.description)}</p>
          <img src="${escapeHtml(book.url_couverture)}" alt="${escapeHtml(book.titre)}" width="400" height="300" />
        </article>
      </li>
    `;
  }

  partialSsrHtml += `
    </ul>
    
    <h2>Comment acheter ?</h2>
    <p>Sélectionnez un livre de notre catalogue, cliquez sur Acheter, entrez votre numéro Mobile Money (MTN, Orange, Wave) et validez la transaction. Votre lien de téléchargement unique et sécurisé sera disponible immédiatement.</p>
    
    <h2>Programme d'Affiliation</h2>
    <p>Rejoignez notre communauté et commencez à gagner de l'argent. Générez des liens de parrainage pour nos ebooks et percevez des commissions sur chaque vente réalisée grâce à vous.</p>
  </div>
  `;

  // 5. Inject meta tags and structured data into <head>
  const headInjections = `
  <link rel="canonical" href="https://ebookstore-73b.pages.dev/" />
  <meta name="description" content="EbookStore Afrique - Achetez et téléchargez les meilleurs ebooks et guides de programmation, design et no-code en Afrique. Paiement sécurisé par Mobile Money." />
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
