export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS OPTIONS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "Configuration Supabase manquante" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Define headers helper
  const getSupabaseHeaders = (token = null) => {
    return {
      "apikey": supabaseAnonKey,
      "Authorization": `Bearer ${token || supabaseAnonKey}`,
      "Content-Type": "application/json",
    };
  };

  // Helper to verify Supabase JWT token and get user info
  const verifyUserToken = async () => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.split(" ")[1];
    if (!token) return null;

    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const user = await res.json();
        return { user, token };
      }
    } catch (err) {
      console.error("Token verification failed in MCP:", err);
    }
    return null;
  };

  // Helper to retrieve user profile role
  const getUserRole = async (userId, token) => {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role`, {
        headers: getSupabaseHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        return data[0]?.role || "user";
      }
    } catch (e) {
      console.error("Error fetching user role:", e);
    }
    return "user";
  };

  // GET: modern Streamable HTTP Discovery
  if (request.method === "GET") {
    return new Response(JSON.stringify({
      message: "Recruitment Africa MCP Server (Streamable HTTP)",
      protocolVersion: "2024-11-05",
      endpoints: {
        post: "/api/mcp"
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // POST: JSON-RPC 2.0 messages
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { jsonrpc, method, params, id } = body;

      if (jsonrpc !== "2.0") {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32600, message: "Invalid Request" },
          id: id || null
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      let result = null;
      let error = null;

      switch (method) {
        case "initialize":
          result = {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: "Recruitment Africa MCP Server",
              version: "1.0.0"
            }
          };
          break;

        case "ping":
          result = {};
          break;

        case "tools/list":
          result = {
            tools: [
              {
                name: "rechercher_cv",
                description: "Recherche des CV publics par mot-clé et filtres (secteur, lieu, compétences, etc.).",
                inputSchema: {
                  type: "object",
                  properties: {
                    query: { type: "string", description: "Mot-clé de recherche" },
                    secteur: { type: "string", description: "Filtre par secteur d'activité" },
                    lieu: { type: "string", description: "Filtre par ville ou lieu" },
                    disponible: { type: "boolean", description: "Candidat immédiatement disponible" }
                  }
                }
              },
              {
                name: "obtenir_cv",
                description: "Affiche le détail complet d'un CV en respectant sa visibilité (public/anonyme).",
                inputSchema: {
                  type: "object",
                  properties: {
                    reference: { type: "string", description: "Référence unique du CV" }
                  },
                  required: ["reference"]
                }
              },
              {
                name: "creer_cv",
                description: "Crée le CV de l'utilisateur connecté (authentifié par jeton JWT).",
                inputSchema: {
                  type: "object",
                  properties: {
                    nom: { type: "string", description: "Nom complet" },
                    titre: { type: "string", description: "Titre du poste visé" },
                    competences: { type: "array", items: { type: "string" }, description: "Liste des compétences" },
                    experiences: { type: "array", items: { type: "object" }, description: "Expériences professionnelles" },
                    formation: { type: "array", items: { type: "object" }, description: "Formations/diplômes" },
                    summary: { type: "string", description: "Accroche/Résumé professionnel" },
                    is_public: { type: "boolean", description: "Rendre le CV public" },
                    visibility: { type: "string", enum: ["private", "public", "anonymous"], description: "Type de visibilité" }
                  },
                  required: ["nom", "titre", "competences"]
                }
              },
              {
                name: "mettre_a_jour_cv",
                description: "Met à jour un CV existant de l'utilisateur connecté.",
                inputSchema: {
                  type: "object",
                  properties: {
                    reference: { type: "string", description: "Référence du CV à éditer" },
                    nom: { type: "string" },
                    titre: { type: "string" },
                    competences: { type: "array", items: { type: "string" } },
                    experiences: { type: "array", items: { type: "object" } },
                    formation: { type: "array", items: { type: "object" } },
                    summary: { type: "string" },
                    visibility: { type: "string", enum: ["private", "public", "anonymous"] }
                  },
                  required: ["reference"]
                }
              },
              {
                name: "rechercher_bio",
                description: "Recherche des biographies de candidats publics.",
                inputSchema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    lieu: { type: "string" },
                    secteur: { type: "string" }
                  }
                }
              },
              {
                name: "obtenir_bio",
                description: "Récupère le contenu d'une biographie par son slug.",
                inputSchema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" }
                  },
                  required: ["slug"]
                }
              },
              {
                name: "creer_bio",
                description: "Crée la biographie de l'utilisateur connecté.",
                inputSchema: {
                  type: "object",
                  properties: {
                    slug: { type: "string", description: "Slug d'URL unique" },
                    content: { type: "string", description: "Contenu rédigé" },
                    is_public: { type: "boolean" },
                    secteur: { type: "string" },
                    lieu: { type: "string" }
                  },
                  required: ["slug", "content"]
                }
              },
              {
                name: "telecharger_pdf",
                description: "Obtient le lien de téléchargement PDF d'un CV.",
                inputSchema: {
                  type: "object",
                  properties: {
                    reference: { type: "string" }
                  },
                  required: ["reference"]
                }
              },
              {
                name: "sauvegarder_favori",
                description: "Sauvegarde un favori (cv, bio ou job_offer) pour l'utilisateur connecté.",
                inputSchema: {
                  type: "object",
                  properties: {
                    item_type: { type: "string", enum: ["cv", "bio", "job_offer"] },
                    item_id: { type: "string" }
                  },
                  required: ["item_type", "item_id"]
                }
              },
              {
                name: "lister_favoris",
                description: "Liste tous les favoris sauvegardés par l'utilisateur connecté.",
                inputSchema: { type: "object", properties: {} }
              },
              {
                name: "publier_offre",
                description: "Publie une nouvelle offre d'emploi. Nécessite d'être un recruteur vérifié.",
                inputSchema: {
                  type: "object",
                  properties: {
                    titre: { type: "string" },
                    description: { type: "string" },
                    entreprise: { type: "string" },
                    lieu: { type: "string" },
                    secteur: { type: "string" },
                    type_contrat: { type: "string", enum: ["cdi", "cdd", "stage", "freelance", "temps_partiel", "alternance"] },
                    remote: { type: "boolean" },
                    salaire_min: { type: "number" },
                    salaire_max: { type: "number" },
                    devise: { type: "string" },
                    competences: { type: "array", items: { type: "string" } }
                  },
                  required: ["titre", "description", "entreprise", "lieu", "secteur", "type_contrat"]
                }
              },
              {
                name: "generer_offre_ia",
                description: "Fait appel à l'IA pour générer une offre à partir de points bruts.",
                inputSchema: {
                  type: "object",
                  properties: {
                    points_bruts: { type: "string" },
                    poste: { type: "string" },
                    entreprise: { type: "string" }
                  },
                  required: ["points_bruts", "poste", "entreprise"]
                }
              },
              {
                name: "rechercher_offres",
                description: "Recherche des offres d'emploi actives.",
                inputSchema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    lieu: { type: "string" },
                    secteur: { type: "string" },
                    type_contrat: { type: "string" },
                    remote: { type: "boolean" }
                  }
                }
              },
              {
                name: "obtenir_offre",
                description: "Détail complet d'une offre d'emploi.",
                inputSchema: {
                  type: "object",
                  properties: {
                    id: { type: "string" }
                  },
                  required: ["id"]
                }
              },
              {
                name: "postuler_offre",
                description: "Postule à une offre avec un CV ou une Bio.",
                inputSchema: {
                  type: "object",
                  properties: {
                    job_offer_id: { type: "string" },
                    cv_id: { type: "string" },
                    bio_id: { type: "string" },
                    message: { type: "string" }
                  },
                  required: ["job_offer_id"]
                }
              },
              {
                name: "lister_candidatures",
                description: "Liste les candidatures reçues (Réservé au recruteur auteur de l'offre).",
                inputSchema: {
                  type: "object",
                  properties: {
                    job_offer_id: { type: "string" }
                  },
                  required: ["job_offer_id"]
                }
              },
              {
                name: "signaler_offre",
                description: "Signale une offre suspecte.",
                inputSchema: {
                  type: "object",
                  properties: {
                    job_offer_id: { type: "string" },
                    raison: { type: "string" }
                  },
                  required: ["job_offer_id", "raison"]
                }
              },
              {
                name: "booster_post",
                description: "Initie un paiement MoneyFusion de Boost pour un CV, une Bio ou une Offre.",
                inputSchema: {
                  type: "object",
                  properties: {
                    target_type: { type: "string", enum: ["cv", "bio", "job_offer"] },
                    target_id: { type: "string" },
                    numeroSend: { type: "string" },
                    nomclient: { type: "string" },
                    montant: { type: "number" }
                  },
                  required: ["target_type", "target_id", "numeroSend", "nomclient", "montant"]
                }
              }
            ]
          };
          break;

        case "tools/call": {
          const { name, arguments: args } = params || {};
          const authData = await verifyUserToken();

          if (name === "rechercher_cv") {
            const { query, secteur, lieu, disponible } = args || {};
            let dbUrl = `${supabaseUrl}/rest/v1/cvs?visibility=neq.private&select=*`;
            if (secteur) dbUrl += `&secteur=eq.${encodeURIComponent(secteur)}`;
            if (lieu) dbUrl += `&lieu=eq.${encodeURIComponent(lieu)}`;
            if (disponible !== undefined) dbUrl += `&disponible=eq.${disponible}`;

            const res = await fetch(dbUrl, { headers: getSupabaseHeaders() });
            if (res.ok) {
              let list = await res.json();
              if (query) {
                const qLower = query.toLowerCase();
                list = list.filter(cv => 
                  cv.summary?.toLowerCase().includes(qLower) ||
                  cv.reference?.toLowerCase().includes(qLower) ||
                  JSON.stringify(cv.data).toLowerCase().includes(qLower)
                );
              }
              // Format results to respect anonymity
              const cleanList = list.map(cv => ({
                reference: cv.reference,
                summary: cv.summary,
                disponible: cv.disponible,
                annees_experience: cv.annees_experience,
                titre: cv.data?.titre || cv.titre_poste || "Candidat",
                competences: cv.data?.competences || cv.competences || [],
                nom: cv.visibility === "anonymous" ? "Anonyme" : (cv.data?.nom || "Candidat"),
                is_boosted: cv.is_boosted
              }));
              result = { content: [{ type: "text", text: JSON.stringify(cleanList, null, 2) }] };
            } else {
              result = { content: [{ type: "text", text: "Erreur lors de la récupération des CV." }], isError: true };
            }
          }

          else if (name === "obtenir_cv") {
            const { reference } = args || {};
            const res = await fetch(`${supabaseUrl}/rest/v1/cvs?reference=eq.${reference}&select=*`, { headers: getSupabaseHeaders() });
            if (res.ok) {
              const data = await res.json();
              if (data.length === 0) {
                result = { content: [{ type: "text", text: "CV introuvable." }], isError: true };
              } else {
                const cv = data[0];
                if (cv.visibility === "private" && (!authData || authData.user.id !== cv.user_id)) {
                  result = { content: [{ type: "text", text: "Ce CV est privé." }], isError: true };
                } else {
                  if (cv.visibility === "anonymous") {
                    if (cv.data) cv.data.nom = "Anonyme";
                  }
                  result = { content: [{ type: "text", text: JSON.stringify(cv, null, 2) }] };
                }
              }
            } else {
              result = { content: [{ type: "text", text: "Erreur de base de données." }], isError: true };
            }
          }

          else if (name === "creer_cv") {
            if (!authData) {
              result = { content: [{ type: "text", text: "Authentification requise" }], isError: true };
              break;
            }
            const { user, token } = authData;
            const { nom, titre, competences, experiences, formation, summary, visibility } = args || {};

            const reference = "CV-" + new Date().getFullYear() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
            const cvPayload = {
              user_id: user.id,
              reference,
              data: {
                nom,
                titre,
                competences: competences || [],
                experiences: experiences || [],
                formation: formation || []
              },
              summary: summary || "",
              pdf_url: "",
              is_public: visibility === "public" || visibility === "anonymous",
              visibility: visibility || "private",
              titre_poste: titre,
              competences: competences || [],
              created_at: new Date().toISOString()
            };

            const insertRes = await fetch(`${supabaseUrl}/rest/v1/cvs`, {
              method: "POST",
              headers: {
                ...getSupabaseHeaders(token),
                "Prefer": "return=representation"
              },
              body: JSON.stringify(cvPayload)
            });

            if (insertRes.ok) {
              result = { content: [{ type: "text", text: `CV créé avec succès ! Référence : ${reference}` }] };
            } else {
              const errText = await insertRes.text();
              result = { content: [{ type: "text", text: `Échec : ${errText}` }], isError: true };
            }
          }

          else if (name === "mettre_a_jour_cv") {
            if (!authData) {
              result = { content: [{ type: "text", text: "Authentification requise" }], isError: true };
              break;
            }
            const { user, token } = authData;
            const { reference, nom, titre, competences, experiences, formation, summary, visibility } = args || {};

            // Check ownership
            const checkRes = await fetch(`${supabaseUrl}/rest/v1/cvs?reference=eq.${reference}&select=user_id`, { headers: getSupabaseHeaders() });
            if (!checkRes.ok) {
              result = { content: [{ type: "text", text: "CV introuvable." }], isError: true };
              break;
            }
            const checkData = await checkRes.json();
            if (checkData.length === 0 || checkData[0].user_id !== user.id) {
              result = { content: [{ type: "text", text: "Vous n'êtes pas propriétaire de ce CV." }], isError: true };
              break;
            }

            const updatedPayload = {
              data: {
                nom,
                titre,
                competences: competences || [],
                experiences: experiences || [],
                formation: formation || []
              },
              summary: summary || "",
              is_public: visibility === "public" || visibility === "anonymous",
              visibility: visibility || "private",
              titre_poste: titre,
              competences: competences || [],
              updated_at: new Date().toISOString()
            };

            const updateRes = await fetch(`${supabaseUrl}/rest/v1/cvs?reference=eq.${reference}`, {
              method: "PATCH",
              headers: getSupabaseHeaders(token),
              body: JSON.stringify(updatedPayload)
            });

            if (updateRes.ok) {
              result = { content: [{ type: "text", text: "CV mis à jour avec succès !" }] };
            } else {
              result = { content: [{ type: "text", text: "Échec de la mise à jour." }], isError: true };
            }
          }

          else if (name === "rechercher_bio") {
            const { query, lieu, secteur } = args || {};
            let dbUrl = `${supabaseUrl}/rest/v1/bios?is_public=eq.true&select=*`;
            if (lieu) dbUrl += `&lieu=eq.${encodeURIComponent(lieu)}`;
            if (secteur) dbUrl += `&secteur=eq.${encodeURIComponent(secteur)}`;

            const res = await fetch(dbUrl, { headers: getSupabaseHeaders() });
            if (res.ok) {
              let list = await res.json();
              if (query) {
                const qL = query.toLowerCase();
                list = list.filter(b => b.content?.toLowerCase().includes(qL));
              }
              result = { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
            } else {
              result = { content: [{ type: "text", text: "Erreur" }], isError: true };
            }
          }

          else if (name === "obtenir_bio") {
            const { slug } = args || {};
            const res = await fetch(`${supabaseUrl}/rest/v1/bios?slug=eq.${slug}&select=*`, { headers: getSupabaseHeaders() });
            if (res.ok) {
              const data = await res.json();
              if (data.length === 0) {
                result = { content: [{ type: "text", text: "Biographie introuvable." }], isError: true };
              } else {
                result = { content: [{ type: "text", text: JSON.stringify(data[0], null, 2) }] };
              }
            } else {
              result = { content: [{ type: "text", text: "Erreur" }], isError: true };
            }
          }

          else if (name === "creer_bio") {
            if (!authData) {
              result = { content: [{ type: "text", text: "Authentification requise." }], isError: true };
              break;
            }
            const { user, token } = authData;
            const { slug, content, is_public, secteur, lieu } = args || {};

            const bioPayload = {
              id: user.id,
              user_id: user.id,
              slug,
              content,
              is_public: !!is_public,
              secteur,
              lieu,
              created_at: new Date().toISOString()
            };

            const insertRes = await fetch(`${supabaseUrl}/rest/v1/bios`, {
              method: "POST",
              headers: {
                ...getSupabaseHeaders(token),
                "Prefer": "return=representation"
              },
              body: JSON.stringify(bioPayload)
            });

            if (insertRes.ok) {
              result = { content: [{ type: "text", text: "Biographie créée avec succès !" }] };
            } else {
              result = { content: [{ type: "text", text: "Échec de création de la biographie." }], isError: true };
            }
          }

          else if (name === "publier_offre") {
            if (!authData) {
              result = { content: [{ type: "text", text: "Authentification requise." }], isError: true };
              break;
            }
            const { user, token } = authData;
            const role = await getUserRole(user.id, token);

            if (role !== "recruiter" && role !== "admin") {
              result = { content: [{ type: "text", text: "Seuls les recruteurs peuvent publier des offres." }], isError: true };
              break;
            }

            // Check company status
            const compRes = await fetch(`${supabaseUrl}/rest/v1/recruiter_profiles?id=eq.${user.id}&select=verification_status`, { headers: getSupabaseHeaders() });
            const compData = await compRes.json();
            if (compData.length === 0 || compData[0].verification_status !== "verified") {
              result = { content: [{ type: "text", text: "Votre entreprise doit être vérifiée pour publier des offres d'emploi publiques." }], isError: true };
              break;
            }

            const { titre, description, entreprise, lieu, secteur, type_contrat, remote, salaire_min, salaire_max, devise, competences } = args || {};
            const cleanSlug = titre.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).substring(2, 6);

            const offerPayload = {
              recruiter_id: user.id,
              titre,
              slug: cleanSlug,
              description,
              entreprise,
              lieu,
              secteur,
              type_contrat,
              remote: !!remote,
              salaire_min,
              salaire_max,
              devise: devise || "XAF",
              competences: competences || [],
              statut: "active",
              moderation_status: "pending", // Always starts in pending
              vues: 0,
              created_at: new Date().toISOString()
            };

            const publishRes = await fetch(`${supabaseUrl}/rest/v1/job_offers`, {
              method: "POST",
              headers: getSupabaseHeaders(token),
              body: JSON.stringify(offerPayload)
            });

            if (publishRes.ok) {
              result = { content: [{ type: "text", text: "Offre d'emploi publiée ! Elle est actuellement en attente de modération." }] };
            } else {
              result = { content: [{ type: "text", text: "Échec de publication de l'offre." }], isError: true };
            }
          }

          else if (name === "rechercher_offres") {
            const { query, lieu, secteur, type_contrat, remote } = args || {};
            let dbUrl = `${supabaseUrl}/rest/v1/job_offers?statut=eq.active&moderation_status=eq.approved&select=*`;
            if (lieu) dbUrl += `&lieu=eq.${encodeURIComponent(lieu)}`;
            if (secteur) dbUrl += `&secteur=eq.${encodeURIComponent(secteur)}`;
            if (type_contrat) dbUrl += `&type_contrat=eq.${encodeURIComponent(type_contrat)}`;
            if (remote !== undefined) dbUrl += `&remote=eq.${remote}`;

            const res = await fetch(dbUrl, { headers: getSupabaseHeaders() });
            if (res.ok) {
              let list = await res.json();
              if (query) {
                const qL = query.toLowerCase();
                list = list.filter(o => o.titre?.toLowerCase().includes(qL) || o.description?.toLowerCase().includes(qL));
              }
              result = { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
            } else {
              result = { content: [{ type: "text", text: "Erreur" }], isError: true };
            }
          }

          else if (name === "obtenir_offre") {
            const { id } = args || {};
            const res = await fetch(`${supabaseUrl}/rest/v1/job_offers?id=eq.${id}&select=*`, { headers: getSupabaseHeaders() });
            if (res.ok) {
              const list = await res.json();
              if (list.length === 0) {
                result = { content: [{ type: "text", text: "Offre introuvable." }], isError: true };
              } else {
                result = { content: [{ type: "text", text: JSON.stringify(list[0], null, 2) }] };
              }
            } else {
              result = { content: [{ type: "text", text: "Erreur" }], isError: true };
            }
          }

          else if (name === "postuler_offre") {
            if (!authData) {
              result = { content: [{ type: "text", text: "Authentification requise." }], isError: true };
              break;
            }
            const { user, token } = authData;
            const { job_offer_id, cv_id, bio_id, message } = args || {};

            // Check if already applied
            const checkRes = await fetch(`${supabaseUrl}/rest/v1/job_applications?job_offer_id=eq.${job_offer_id}&user_id=eq.${user.id}`, { headers: getSupabaseHeaders() });
            const checkData = await checkRes.json();
            if (checkData.length > 0) {
              result = { content: [{ type: "text", text: "Vous avez déjà postulé à cette offre d'emploi." }], isError: true };
              break;
            }

            const appPayload = {
              job_offer_id,
              user_id: user.id,
              cv_id: cv_id || null,
              bio_id: bio_id || null,
              message: message || "",
              statut: "envoyee",
              created_at: new Date().toISOString()
            };

            const postRes = await fetch(`${supabaseUrl}/rest/v1/job_applications`, {
              method: "POST",
              headers: getSupabaseHeaders(token),
              body: JSON.stringify(appPayload)
            });

            if (postRes.ok) {
              result = { content: [{ type: "text", text: "Candidature envoyée avec succès !" }] };
            } else {
              result = { content: [{ type: "text", text: "Échec de l'envoi de la candidature." }], isError: true };
            }
          }

          else if (name === "lister_candidatures") {
            if (!authData) {
              result = { content: [{ type: "text", text: "Authentification requise." }], isError: true };
              break;
            }
            const { user, token } = authData;
            const { job_offer_id } = args || {};

            // Verify owner of the offer
            const offerRes = await fetch(`${supabaseUrl}/rest/v1/job_offers?id=eq.${job_offer_id}&select=recruiter_id`, { headers: getSupabaseHeaders() });
            const offerData = await offerRes.json();
            if (offerData.length === 0 || offerData[0].recruiter_id !== user.id) {
              result = { content: [{ type: "text", text: "Non autorisé (Vous n'êtes pas le recruteur de cette offre)." }], isError: true };
              break;
            }

            const appsRes = await fetch(`${supabaseUrl}/rest/v1/job_applications?job_offer_id=eq.${job_offer_id}&select=*`, { headers: getSupabaseHeaders() });
            if (appsRes.ok) {
              const list = await appsRes.json();
              result = { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
            } else {
              result = { content: [{ type: "text", text: "Erreur" }], isError: true };
            }
          }

          else if (name === "signaler_offre") {
            if (!authData) {
              result = { content: [{ type: "text", text: "Authentification requise." }], isError: true };
              break;
            }
            const { user, token } = authData;
            const { job_offer_id, raison } = args || {};

            const reportPayload = {
              job_offer_id,
              reporter_user_id: user.id,
              raison,
              statut: "open",
              created_at: new Date().toISOString()
            };

            const reportRes = await fetch(`${supabaseUrl}/rest/v1/job_offer_reports`, {
              method: "POST",
              headers: getSupabaseHeaders(token),
              body: JSON.stringify(reportPayload)
            });

            if (reportRes.ok) {
              result = { content: [{ type: "text", text: "Offre d'emploi signalée avec succès aux modérateurs." }] };
            } else {
              result = { content: [{ type: "text", text: "Échec du signalement." }], isError: true };
            }
          }

          else if (name === "booster_post") {
            if (!authData) {
              result = { content: [{ type: "text", text: "Authentification requise." }], isError: true };
              break;
            }
            const { user } = authData;
            const { target_type, target_id, numeroSend, nomclient, montant } = args || {};

            const urlObj = new URL(request.url);
            const appUrl = env.APP_URL || `${urlObj.protocol}//${urlObj.host}`;

            const boostRes = await fetch(`${appUrl}/api/boost/create`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authData.token}`
              },
              body: JSON.stringify({ target_type, target_id, numeroSend, nomclient, montant })
            });

            if (boostRes.ok) {
              const r = await boostRes.json();
              result = { content: [{ type: "text", text: `Lien de paiement MoneyFusion Boost créé avec succès ! Veuillez vous rendre sur ce lien pour régler le montant : ${r.url}` }] };
            } else {
              const text = await boostRes.text();
              result = { content: [{ type: "text", text: `Erreur d'initialisation du paiement : ${text}` }], isError: true };
            }
          }

          else if (name === "telecharger_pdf") {
            const { reference } = args || {};
            const res = await fetch(`${supabaseUrl}/rest/v1/cvs?reference=eq.${reference}&select=pdf_url,is_public,user_id`, { headers: getSupabaseHeaders() });
            if (res.ok) {
              const list = await res.json();
              if (list.length === 0) {
                result = { content: [{ type: "text", text: "CV introuvable." }], isError: true };
              } else {
                const cv = list[0];
                if (!cv.is_public && (!authData || authData.user.id !== cv.user_id)) {
                  result = { content: [{ type: "text", text: "Accès refusé. Ce CV est privé." }], isError: true };
                } else {
                  result = { content: [{ type: "text", text: `Lien PDF : ${cv.pdf_url || "Aucun fichier PDF joint actuellement."}` }] };
                }
              }
            } else {
              result = { content: [{ type: "text", text: "Erreur" }], isError: true };
            }
          }

          else if (name === "sauvegarder_favori") {
            if (!authData) {
              result = { content: [{ type: "text", text: "Authentification requise." }], isError: true };
              break;
            }
            const { user, token } = authData;
            const { item_type, item_id } = args || {};

            const favPayload = {
              user_id: user.id,
              item_type,
              item_id,
              created_at: new Date().toISOString()
            };

            const favRes = await fetch(`${supabaseUrl}/rest/v1/saved_items`, {
              method: "POST",
              headers: getSupabaseHeaders(token),
              body: JSON.stringify(favPayload)
            });

            if (favRes.ok) {
              result = { content: [{ type: "text", text: "Élément ajouté à vos favoris !" }] };
            } else {
              result = { content: [{ type: "text", text: "Déjà dans vos favoris ou erreur." }], isError: true };
            }
          }

          else if (name === "lister_favoris") {
            if (!authData) {
              result = { content: [{ type: "text", text: "Authentification requise." }], isError: true };
              break;
            }
            const { user, token } = authData;
            const favsRes = await fetch(`${supabaseUrl}/rest/v1/saved_items?user_id=eq.${user.id}`, { headers: getSupabaseHeaders(token) });
            if (favsRes.ok) {
              const list = await favsRes.json();
              result = { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
            } else {
              result = { content: [{ type: "text", text: "Erreur de base de données." }], isError: true };
            }
          }

          else {
            error = { code: -32601, message: `Method not found: ${name}` };
          }
          break;
        }

        default:
          error = { code: -32601, message: `Method not found: ${method}` };
          break;
      }

      const responsePayload = { jsonrpc: "2.0", id };
      if (error) {
        responsePayload.error = error;
      } else {
        responsePayload.result = result;
      }

      return new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal error", data: err.message },
        id: null
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
    status: 405,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    }
  });
}
