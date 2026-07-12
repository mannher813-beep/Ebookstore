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
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

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

  // Helper to verify token (supports both Supabase JWT and Google OAuth token)
  const verifyUserToken = async () => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.split(" ")[1];
    if (!token) return null;

    // 1. Try verifying as Supabase JWT
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
      console.error("Supabase token verification failed:", err);
    }

    // 2. Fallback: Try verifying as Google OAuth Access/ID Token
    try {
      let email = null;
      let name = null;

      // Check via Google UserInfo API (Access Token)
      const gUserInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (gUserInfoRes.ok) {
        const gData = await gUserInfoRes.json();
        email = gData.email;
        name = gData.name;
      } else {
        // Check via Google TokenInfo API (ID Token)
        const gTokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
        if (gTokenInfoRes.ok) {
          const gData = await gTokenInfoRes.json();
          email = gData.email;
          name = gData.name;
        }
      }

      if (email) {
        let foundUser = null;

        if (supabaseServiceKey) {
          // List users via Supabase Admin API
          const usersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
            headers: {
              "apikey": supabaseServiceKey,
              "Authorization": `Bearer ${supabaseServiceKey}`
            }
          });
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            const usersList = Array.isArray(usersData) ? usersData : (usersData.users || []);
            foundUser = usersList.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
          }

          // Auto-provision user if they don't exist in Supabase yet
          if (!foundUser) {
            const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
              method: "POST",
              headers: {
                "apikey": supabaseServiceKey,
                "Authorization": `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                email: email,
                email_confirm: true,
                user_metadata: { name: name || "" }
              })
            });
            if (createRes.ok) {
              foundUser = await createRes.json();
              console.log("Auto-created Supabase user for Google OAuth:", email);
            }
          }
        }

        if (foundUser) {
          return {
            user: {
              id: foundUser.id,
              email: foundUser.email
            },
            token: supabaseServiceKey // return service key so that REST queries can bypass RLS on behalf of this verified user
          };
        }
      }
    } catch (err) {
      console.error("Google token verification/mapping failed:", err);
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

  // Helper to check recruiter status and verification
  const checkRecruiterStatus = async (userId, token) => {
    const role = await getUserRole(userId, token);
    if (role === "admin") {
      return { ok: true, role };
    }
    if (role !== "recruiter") {
      return { ok: false, error: "Seuls les recruteurs peuvent effectuer cette action." };
    }
    try {
      const compRes = await fetch(`${supabaseUrl}/rest/v1/recruiter_profiles?id=eq.${userId}&select=verification_status`, {
        headers: getSupabaseHeaders(token)
      });
      if (compRes.ok) {
        const compData = await compRes.json();
        if (compData.length === 0 || compData[0].verification_status !== "verified") {
          return { ok: false, error: "Votre entreprise doit être vérifiée pour effectuer cette action." };
        }
        return { ok: true, role };
      }
    } catch (err) {
      console.error("Error checking recruiter profile:", err);
    }
    return { ok: false, error: "Erreur lors de la vérification de votre compte recruteur." };
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
                description: "Recherche des CV publics ou anonymes par mot-clé et critères structurés.",
                inputSchema: {
                  type: "object",
                  properties: {
                    mot_cle: { type: "string", description: "Mot-clé de recherche (titre, résumé, etc.)" },
                    competences: { type: "array", items: { type: "string" }, description: "Liste des compétences recherchées" },
                    lieu: { type: "string", description: "Filtre par pays ou ville" },
                    secteur: { type: "string", description: "Secteur d'activité recherché" },
                    annees_experience_min: { type: "number", description: "Nombre d'années d'expérience minimum" },
                    disponible: { type: "boolean", description: "Rechercher uniquement les candidats immédiatement disponibles" }
                  }
                }
              },
              {
                name: "obtenir_cv",
                description: "Affiche le détail complet d'un Curriculum Vitae en respectant sa visibilité.",
                inputSchema: {
                  type: "object",
                  properties: {
                    reference: { type: "string", description: "Référence unique du CV (ex: CV-2026-XYZ)" },
                    id: { type: "string", description: "Identifiant de la table du CV" }
                  }
                }
              },
              {
                name: "rechercher_bio",
                description: "Recherche des biographies professionnelles publiques de candidats.",
                inputSchema: {
                  type: "object",
                  properties: {
                    mot_cle: { type: "string", description: "Recherche de mots-clés dans le contenu" },
                    lieu: { type: "string", description: "Ville ou pays de recherche" },
                    secteur: { type: "string", description: "Secteur d'activité" }
                  }
                }
              },
              {
                name: "obtenir_bio",
                description: "Récupère la biographie complète d'un candidat à partir de son slug.",
                inputSchema: {
                  type: "object",
                  properties: {
                    slug: { type: "string", description: "Slug unique de la biographie (ex: john-doe)" }
                  },
                  required: ["slug"]
                }
              },
              {
                name: "rechercher_offres",
                description: "Recherche des offres d'emploi actives et approuvées.",
                inputSchema: {
                  type: "object",
                  properties: {
                    mot_cle: { type: "string", description: "Recherche par mots-clés (titre, description)" },
                    lieu: { type: "string", description: "Filtre par localisation géographique" },
                    secteur: { type: "string", description: "Filtre par secteur professionnel" },
                    type_contrat: { type: "string", enum: ["cdi", "cdd", "stage", "freelance", "temps_partiel", "alternance"], description: "Type de contrat" },
                    salaire_min: { type: "number", description: "Salaire minimal recherché" },
                    remote: { type: "boolean", description: "Filtre pour le télétravail uniquement" },
                    competences: { type: "array", items: { type: "string" }, description: "Liste des compétences clés requises" }
                  }
                }
              },
              {
                name: "obtenir_offre",
                description: "Obtient la fiche complète d'une offre d'emploi et incrémente son compteur de vues.",
                inputSchema: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "ID technique de l'offre d'emploi" },
                    slug: { type: "string", description: "Slug unique de l'offre" }
                  }
                }
              },
              {
                name: "creer_cv",
                description: "Crée le CV professionnel de l'utilisateur connecté (privé par défaut).",
                inputSchema: {
                  type: "object",
                  properties: {
                    titre_poste: { type: "string", description: "Titre du poste visé" },
                    competences: { type: "array", items: { type: "string" }, description: "Compétences professionnelles clés" },
                    experiences: { type: "array", items: { type: "object" }, description: "Expériences professionnelles" },
                    formation: { type: "array", items: { type: "object" }, description: "Formations et diplômes obtenus" },
                    summary: { type: "string", description: "Accroche ou résumé professionnel" },
                    lieu: { type: "string", description: "Lieu de résidence" },
                    secteur: { type: "string", description: "Secteur d'activité" },
                    annees_experience: { type: "number", description: "Nombre d'années d'expérience" },
                    disponible: { type: "boolean", description: "Disponibilité immédiate" },
                    nom: { type: "string", description: "Nom complet du candidat" },
                    pdf_url: { type: "string", description: "URL éventuelle du fichier PDF lié" }
                  },
                  required: ["titre_poste", "competences"]
                }
              },
              {
                name: "mettre_a_jour_cv",
                description: "Modifie le Curriculum Vitae de l'utilisateur connecté.",
                inputSchema: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "ID technique du CV" },
                    titre_poste: { type: "string" },
                    competences: { type: "array", items: { type: "string" } },
                    experiences: { type: "array", items: { type: "object" } },
                    formation: { type: "array", items: { type: "object" } },
                    summary: { type: "string" },
                    lieu: { type: "string" },
                    secteur: { type: "string" },
                    annees_experience: { type: "number" },
                    disponible: { type: "boolean" },
                    nom: { type: "string" },
                    visibility: { type: "string", enum: ["private", "public", "anonymous"], description: "Type de visibilité" },
                    pdf_url: { type: "string" }
                  },
                  required: ["id"]
                }
              },
              {
                name: "creer_bio",
                description: "Crée la biographie professionnelle de l'utilisateur connecté.",
                inputSchema: {
                  type: "object",
                  properties: {
                    slug: { type: "string", description: "Slug unique de l'URL de votre biographie" },
                    content: { type: "string", description: "Contenu de la biographie rédigée en Markdown" },
                    is_public: { type: "boolean", description: "Rendre la biographie publique" },
                    secteur: { type: "string" },
                    lieu: { type: "string" }
                  },
                  required: ["slug", "content"]
                }
              },
              {
                name: "mettre_a_jour_bio",
                description: "Met à jour la biographie professionnelle de l'utilisateur connecté.",
                inputSchema: {
                  type: "object",
                  properties: {
                    slug: { type: "string", description: "Nouveau slug unique" },
                    content: { type: "string", description: "Nouveau texte rédigé" },
                    is_public: { type: "boolean" },
                    secteur: { type: "string" },
                    lieu: { type: "string" }
                  }
                }
              },
              {
                name: "telecharger_pdf",
                description: "Génère un lien de téléchargement sécurisé pour un CV PDF.",
                inputSchema: {
                  type: "object",
                  properties: {
                    cv_id: { type: "string", description: "ID technique du CV" }
                  },
                  required: ["cv_id"]
                }
              },
              {
                name: "sauvegarder_favori",
                description: "Sauvegarde un item (cv, bio ou job_offer) dans les favoris de l'utilisateur connecté.",
                inputSchema: {
                  type: "object",
                  properties: {
                    item_type: { type: "string", enum: ["cv", "bio", "job_offer"], description: "Type d'élément à sauvegarder" },
                    item_id: { type: "string", description: "ID de l'élément ciblé" }
                  },
                  required: ["item_type", "item_id"]
                }
              },
              {
                name: "lister_favoris",
                description: "Liste tous les éléments sauvegardés par l'utilisateur connecté avec leurs détails complets.",
                inputSchema: {
                  type: "object",
                  properties: {}
                }
              },
              {
                name: "postuler_offre",
                description: "Envoie une candidature officielle liée à une offre d'emploi active.",
                inputSchema: {
                  type: "object",
                  properties: {
                    job_offer_id: { type: "string", description: "ID technique de l'offre d'emploi" },
                    cv_id: { type: "string", description: "ID de votre CV à transmettre" },
                    bio_id: { type: "string", description: "ID de votre biographie à transmettre" },
                    message: { type: "string", description: "Message d'accompagnement ou lettre de motivation" }
                  },
                  required: ["job_offer_id"]
                }
              },
              {
                name: "signaler_offre",
                description: "Signale une offre suspecte ou inappropriée aux modérateurs.",
                inputSchema: {
                  type: "object",
                  properties: {
                    job_offer_id: { type: "string", description: "ID de l'offre concernée" },
                    raison: { type: "string", description: "Description ou motif du signalement" }
                  },
                  required: ["job_offer_id", "raison"]
                }
              },
              {
                name: "booster_post",
                description: "Crée une demande de Boost et génère le lien de paiement sécurisé MoneyFusion.",
                inputSchema: {
                  type: "object",
                  properties: {
                    target_type: { type: "string", enum: ["cv", "bio", "job_offer"], description: "Type de publication à booster" },
                    target_id: { type: "string", description: "ID de la publication à booster" },
                    duree_jours: { type: "number", description: "Durée en jours du boost (défaut: 7)" },
                    numeroSend: { type: "string", description: "Numéro Mobile Money (format international sans +, ex: 228xxxxxx)" },
                    nomclient: { type: "string", description: "Nom complet de l'acheteur" },
                    montant: { type: "number", description: "Montant à payer en Francs CFA (défaut: 5000)" }
                  },
                  required: ["target_type", "target_id", "numeroSend", "nomclient"]
                }
              },
              {
                name: "publier_offre",
                description: "Publie une nouvelle offre d'emploi de recrutement (Réservé aux recruteurs certifiés).",
                inputSchema: {
                  type: "object",
                  properties: {
                    titre: { type: "string", description: "Intitulé du poste" },
                    description: { type: "string", description: "Description de l'offre (Markdown accepté)" },
                    entreprise: { type: "string", description: "Nom de l'entreprise" },
                    lieu: { type: "string", description: "Localisation (Ville, Pays)" },
                    secteur: { type: "string", description: "Secteur d'activité" },
                    type_contrat: { type: "string", enum: ["cdi", "cdd", "stage", "freelance", "temps_partiel", "alternance"], description: "Type de contrat" },
                    remote: { type: "boolean", description: "Poste ouvert au télétravail" },
                    salaire_min: { type: "number", description: "Salaire minimal proposé" },
                    salaire_max: { type: "number", description: "Salaire maximal proposé" },
                    devise: { type: "string", description: "Devise du salaire (défaut: XAF)" },
                    competences: { type: "array", items: { type: "string" }, description: "Compétences clés requises" },
                    publier_immediatement: { type: "boolean", description: "Publier directement ou laisser en brouillon" }
                  },
                  required: ["titre", "description", "entreprise", "lieu", "secteur", "type_contrat"]
                }
              },
              {
                name: "generer_offre_ia",
                description: "Rédige de façon automatisée un brouillon d'offre d'emploi optimisé grâce à l'intelligence artificielle.",
                inputSchema: {
                  type: "object",
                  properties: {
                    points_bruts: { type: "string", description: "Notes rapides, exigences, missions clés rédigées en vrac" },
                    poste: { type: "string", description: "Intitulé précis du poste" },
                    entreprise: { type: "string", description: "Nom de l'entreprise" }
                  },
                  required: ["points_bruts", "poste", "entreprise"]
                }
              },
              {
                name: "lister_candidatures",
                description: "Liste les candidatures soumises à vos offres d'emploi (Réservé au recruteur auteur).",
                inputSchema: {
                  type: "object",
                  properties: {
                    job_offer_id: { type: "string", description: "ID technique de votre offre d'emploi" }
                  },
                  required: ["job_offer_id"]
                }
              },
              {
                name: "mettre_a_jour_candidature",
                description: "Met à jour l'état de traitement d'une candidature reçue.",
                inputSchema: {
                  type: "object",
                  properties: {
                    application_id: { type: "string", description: "ID de la candidature reçue" },
                    statut: { type: "string", enum: ["vue", "acceptee", "refusee"], description: "Nouvel état de la candidature" }
                  },
                  required: ["application_id", "statut"]
                }
              }
            ]
          };
          break;

        case "tools/call": {
          const { name, arguments: args } = params || {};

          // Protect highly sensitive actions that are strictly Web UI-only
          const webOnlyActions = [
            "valider_recruteur",
            "moderer_offre",
            "modifier_role",
            "lister_logs",
            "inviter_utilisateur"
          ];
          if (webOnlyActions.includes(name)) {
            error = { code: -32002, message: "Cette action n'est disponible que depuis l'interface web." };
            break;
          }

          const authData = await verifyUserToken();

          // ====================
          // 1. PUBLIC TOOLS
          // ====================

          if (name === "rechercher_cv") {
            const { mot_cle, competences, lieu, secteur, annees_experience_min, disponible } = args || {};
            let dbUrl = `${supabaseUrl}/rest/v1/cvs?is_public=eq.true&select=*`;
            
            if (secteur) dbUrl += `&secteur=eq.${encodeURIComponent(secteur)}`;
            if (lieu) dbUrl += `&lieu=eq.${encodeURIComponent(lieu)}`;
            if (disponible !== undefined) dbUrl += `&disponible=eq.${disponible}`;
            if (annees_experience_min !== undefined) dbUrl += `&annees_experience=gte.${annees_experience_min}`;
            if (mot_cle) dbUrl += `&search_vector=wfts.${encodeURIComponent(mot_cle)}`;

            const res = await fetch(dbUrl, { headers: getSupabaseHeaders() });
            if (res.ok) {
              let list = await res.json();

              // Fallback programmatic text search in case search_vector fts returns empty during indexing
              if (mot_cle && list.length === 0) {
                const relaxedRes = await fetch(`${supabaseUrl}/rest/v1/cvs?is_public=eq.true&select=*`, { headers: getSupabaseHeaders() });
                if (relaxedRes.ok) {
                  const allPublic = await relaxedRes.json();
                  const q = mot_cle.toLowerCase();
                  list = allPublic.filter(cv => 
                    (cv.summary && cv.summary.toLowerCase().includes(q)) ||
                    (cv.reference && cv.reference.toLowerCase().includes(q)) ||
                    (cv.titre_poste && cv.titre_poste.toLowerCase().includes(q)) ||
                    (JSON.stringify(cv.data || {}).toLowerCase().includes(q))
                  );
                }
              }

              // Post-filter competences
              if (competences && Array.isArray(competences) && competences.length > 0) {
                list = list.filter(cv => {
                  const cvComps = cv.competences || cv.data?.competences || [];
                  const cvCompsLower = cvComps.map(c => c.toLowerCase());
                  return competences.every(reqComp => cvCompsLower.includes(reqComp.toLowerCase()));
                });
              }

              // Format outcomes to respect anonymity
              const cleanList = list.map(cv => {
                const parsedData = typeof cv.data === "string" ? JSON.parse(cv.data) : cv.data;
                const isAnonymous = cv.visibility === "anonymous";
                return {
                  id: cv.id,
                  reference: cv.reference,
                  summary: cv.summary,
                  disponible: cv.disponible,
                  annees_experience: cv.annees_experience,
                  titre: cv.titre_poste || parsedData?.titre || "Tech Expert",
                  competences: cv.competences || parsedData?.competences || [],
                  nom: isAnonymous ? "Anonyme" : (parsedData?.nom || "Candidat"),
                  is_boosted: cv.is_boosted,
                  lieu: cv.lieu || "Non localisé",
                  secteur: cv.secteur
                };
              });

              result = { content: [{ type: "text", text: JSON.stringify(cleanList, null, 2) }] };
            } else {
              const errText = await res.text();
              result = { content: [{ type: "text", text: `Erreur lors de la récupération des CV: ${errText}` }], isError: true };
            }
          }

          else if (name === "obtenir_cv") {
            const { reference, id } = args || {};
            if (!reference && !id) {
              result = { content: [{ type: "text", text: "Paramètre 'reference' ou 'id' requis." }], isError: true };
              break;
            }

            const queryParam = reference ? `reference=eq.${reference}` : `id=eq.${id}`;
            const res = await fetch(`${supabaseUrl}/rest/v1/cvs?${queryParam}&select=*`, { headers: getSupabaseHeaders() });
            if (res.ok) {
              const data = await res.json();
              if (data.length === 0) {
                result = { content: [{ type: "text", text: "Curriculum Vitae introuvable." }], isError: true };
              } else {
                const cv = data[0];
                if (cv.visibility === "private" && (!authData || authData.user.id !== cv.user_id)) {
                  result = { content: [{ type: "text", text: "Ce Curriculum Vitae est privé." }], isError: true };
                } else {
                  // Hide personal contact name if anonymous
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

          else if (name === "rechercher_bio") {
            const { mot_cle, lieu, secteur } = args || {};
            let dbUrl = `${supabaseUrl}/rest/v1/bios?is_public=eq.true&select=*`;
            
            if (lieu) dbUrl += `&lieu=eq.${encodeURIComponent(lieu)}`;
            if (secteur) dbUrl += `&secteur=eq.${encodeURIComponent(secteur)}`;
            if (mot_cle) dbUrl += `&search_vector=wfts.${encodeURIComponent(mot_cle)}`;

            const res = await fetch(dbUrl, { headers: getSupabaseHeaders() });
            if (res.ok) {
              let list = await res.json();

              // Local fallback for quick text indexing
              if (mot_cle && list.length === 0) {
                const relaxedRes = await fetch(`${supabaseUrl}/rest/v1/bios?is_public=eq.true&select=*`, { headers: getSupabaseHeaders() });
                if (relaxedRes.ok) {
                  const allPublic = await relaxedRes.json();
                  const q = mot_cle.toLowerCase();
                  list = allPublic.filter(b => 
                    (b.content && b.content.toLowerCase().includes(q)) ||
                    (b.slug && b.slug.toLowerCase().includes(q))
                  );
                }
              }

              const cleanList = list.map(b => ({
                id: b.id,
                slug: b.slug,
                content: b.content,
                secteur: b.secteur,
                lieu: b.lieu,
                nom: b.slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
              }));

              result = { content: [{ type: "text", text: JSON.stringify(cleanList, null, 2) }] };
            } else {
              result = { content: [{ type: "text", text: "Erreur lors de la recherche de biographies." }], isError: true };
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
              result = { content: [{ type: "text", text: "Erreur technique de récupération de la biographie." }], isError: true };
            }
          }

          else if (name === "rechercher_offres") {
            const { mot_cle, lieu, secteur, type_contrat, salaire_min, remote, competences } = args || {};
            let dbUrl = `${supabaseUrl}/rest/v1/job_offers?statut=eq.active&moderation_status=eq.approved&select=*`;
            
            if (lieu) dbUrl += `&lieu=eq.${encodeURIComponent(lieu)}`;
            if (secteur) dbUrl += `&secteur=eq.${encodeURIComponent(secteur)}`;
            if (type_contrat) dbUrl += `&type_contrat=eq.${encodeURIComponent(type_contrat)}`;
            if (remote !== undefined) dbUrl += `&remote=eq.${remote}`;
            if (salaire_min !== undefined) dbUrl += `&salaire_max=gte.${salaire_min}`;
            if (mot_cle) dbUrl += `&search_vector=wfts.${encodeURIComponent(mot_cle)}`;

            const res = await fetch(dbUrl, { headers: getSupabaseHeaders() });
            if (res.ok) {
              let list = await res.json();

              // Local manual fallback
              if (mot_cle && list.length === 0) {
                const relaxedRes = await fetch(`${supabaseUrl}/rest/v1/job_offers?statut=eq.active&moderation_status=eq.approved&select=*`, { headers: getSupabaseHeaders() });
                if (relaxedRes.ok) {
                  const allActive = await relaxedRes.json();
                  const q = mot_cle.toLowerCase();
                  list = allActive.filter(o => 
                    (o.titre && o.titre.toLowerCase().includes(q)) ||
                    (o.description && o.description.toLowerCase().includes(q)) ||
                    (o.entreprise && o.entreprise.toLowerCase().includes(q))
                  );
                }
              }

              // Post-filter competences
              if (competences && Array.isArray(competences) && competences.length > 0) {
                list = list.filter(o => {
                  const oComps = o.competences || [];
                  const oCompsLower = oComps.map(c => c.toLowerCase());
                  return competences.every(reqComp => oCompsLower.includes(reqComp.toLowerCase()));
                });
              }

              result = { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
            } else {
              result = { content: [{ type: "text", text: "Erreur lors de la recherche des offres d'emploi." }], isError: true };
            }
          }

          else if (name === "obtenir_offre") {
            const { id, slug } = args || {};
            if (!id && !slug) {
              result = { content: [{ type: "text", text: "Paramètre 'id' ou 'slug' requis." }], isError: true };
              break;
            }

            const queryParam = id ? `id=eq.${id}` : `slug=eq.${slug}`;
            const res = await fetch(`${supabaseUrl}/rest/v1/job_offers?${queryParam}&select=*`, { headers: getSupabaseHeaders() });
            if (res.ok) {
              const data = await res.json();
              if (data.length === 0) {
                result = { content: [{ type: "text", text: "Offre d'emploi introuvable." }], isError: true };
              } else {
                const offer = data[0];
                
                // Increment views in background synchronously
                await fetch(`${supabaseUrl}/rest/v1/job_offers?id=eq.${offer.id}`, {
                  method: "PATCH",
                  headers: getSupabaseHeaders(),
                  body: JSON.stringify({ vues: (offer.vues || 0) + 1 })
                });

                result = { content: [{ type: "text", text: JSON.stringify(offer, null, 2) }] };
              }
            } else {
              result = { content: [{ type: "text", text: "Erreur lors de la récupération de l'offre d'emploi." }], isError: true };
            }
          }

          // ====================
          // 2. AUTHENTICATED TOOLS
          // ====================

          else {
            // All subsequent tools require authentication
            if (!authData) {
              result = { content: [{ type: "text", text: "Cette action nécessite une authentification. Veuillez fournir un jeton d'autorisation valide." }], isError: true };
              break;
            }
            const { user, token } = authData;

            if (name === "creer_cv") {
              const { titre_poste, competences, experiences, formation, summary, lieu, secteur, annees_experience, disponible, nom, pdf_url } = args || {};

              const reference = "CV-" + new Date().getFullYear() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
              const cvPayload = {
                user_id: user.id,
                reference,
                data: {
                  nom: nom || "Candidat",
                  titre: titre_poste,
                  competences: competences || [],
                  experiences: experiences || [],
                  formation: formation || []
                },
                summary: summary || "",
                pdf_url: pdf_url || "",
                is_public: false, // FORCED to false by default as mandated
                visibility: "private", // Always starts as private when public is false
                titre_poste,
                competences: competences || [],
                lieu: lieu || "",
                secteur: secteur || "",
                annees_experience: Number(annees_experience) || 0,
                disponible: disponible !== false,
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
                result = { content: [{ type: "text", text: `CV créé avec succès ! Référence unique : ${reference}` }] };
              } else {
                const errText = await insertRes.text();
                result = { content: [{ type: "text", text: `Échec de l'insertion de CV : ${errText}` }], isError: true };
              }
            }

            else if (name === "mettre_a_jour_cv") {
              const { id, titre_poste, competences, experiences, formation, summary, lieu, secteur, annees_experience, disponible, nom, visibility, pdf_url } = args || {};

              // Check ownership first
              const checkRes = await fetch(`${supabaseUrl}/rest/v1/cvs?id=eq.${id}&select=user_id,data`, { headers: getSupabaseHeaders(token) });
              if (!checkRes.ok) {
                result = { content: [{ type: "text", text: "CV introuvable ou erreur de requête." }], isError: true };
                break;
              }
              const checkData = await checkRes.json();
              if (checkData.length === 0) {
                result = { content: [{ type: "text", text: "CV introuvable." }], isError: true };
                break;
              }
              if (checkData[0].user_id !== user.id) {
                result = { content: [{ type: "text", text: "Accès refusé. Vous n'êtes pas propriétaire de ce Curriculum Vitae." }], isError: true };
                break;
              }

              const oldData = checkData[0].data || {};
              const updatedData = {
                nom: nom !== undefined ? nom : (oldData.nom || "Candidat"),
                titre: titre_poste !== undefined ? titre_poste : (oldData.titre || ""),
                competences: competences !== undefined ? competences : (oldData.competences || []),
                experiences: experiences !== undefined ? experiences : (oldData.experiences || []),
                formation: formation !== undefined ? formation : (oldData.formation || [])
              };

              const updatedPayload = {
                data: updatedData,
                updated_at: new Date().toISOString()
              };

              if (titre_poste !== undefined) updatedPayload.titre_poste = titre_poste;
              if (competences !== undefined) updatedPayload.competences = competences;
              if (summary !== undefined) updatedPayload.summary = summary;
              if (lieu !== undefined) updatedPayload.lieu = lieu;
              if (secteur !== undefined) updatedPayload.secteur = secteur;
              if (annees_experience !== undefined) updatedPayload.annees_experience = Number(annees_experience);
              if (disponible !== undefined) updatedPayload.disponible = disponible;
              if (pdf_url !== undefined) updatedPayload.pdf_url = pdf_url;
              if (visibility !== undefined) {
                updatedPayload.visibility = visibility;
                updatedPayload.is_public = (visibility === "public" || visibility === "anonymous");
              }

              const updateRes = await fetch(`${supabaseUrl}/rest/v1/cvs?id=eq.${id}`, {
                method: "PATCH",
                headers: getSupabaseHeaders(token),
                body: JSON.stringify(updatedPayload)
              });

              if (updateRes.ok) {
                result = { content: [{ type: "text", text: "Votre Curriculum Vitae a été mis à jour avec succès !" }] };
              } else {
                const errText = await updateRes.text();
                result = { content: [{ type: "text", text: `Échec de mise à jour du CV : ${errText}` }], isError: true };
              }
            }

            else if (name === "creer_bio") {
              const { slug, content, is_public, secteur, lieu } = args || {};

              const bioPayload = {
                id: user.id, // Match user ID
                user_id: user.id,
                slug,
                content,
                is_public: !!is_public,
                secteur: secteur || "",
                lieu: lieu || "",
                created_at: new Date().toISOString()
              };

              const insertRes = await fetch(`${supabaseUrl}/rest/v1/bios`, {
                method: "POST",
                headers: getSupabaseHeaders(token),
                body: JSON.stringify(bioPayload)
              });

              if (insertRes.ok) {
                result = { content: [{ type: "text", text: "Votre biographie professionnelle a été créée avec succès !" }] };
              } else {
                const errText = await insertRes.text();
                result = { content: [{ type: "text", text: `Échec de création de la biographie : ${errText}` }], isError: true };
              }
            }

            else if (name === "mettre_a_jour_bio") {
              const { slug, content, is_public, secteur, lieu } = args || {};

              // Check ownership
              const checkRes = await fetch(`${supabaseUrl}/rest/v1/bios?user_id=eq.${user.id}&select=id`, { headers: getSupabaseHeaders(token) });
              if (!checkRes.ok) {
                result = { content: [{ type: "text", text: "Biographie introuvable ou erreur technique." }], isError: true };
                break;
              }
              const checkData = await checkRes.json();
              if (checkData.length === 0) {
                result = { content: [{ type: "text", text: "Aucune biographie existante pour votre profil. Veuillez d'abord en créer une." }], isError: true };
                break;
              }

              const updatedPayload = {
                updated_at: new Date().toISOString()
              };

              if (slug !== undefined) updatedPayload.slug = slug;
              if (content !== undefined) updatedPayload.content = content;
              if (is_public !== undefined) updatedPayload.is_public = !!is_public;
              if (secteur !== undefined) updatedPayload.secteur = secteur;
              if (lieu !== undefined) updatedPayload.lieu = lieu;

              const updateRes = await fetch(`${supabaseUrl}/rest/v1/bios?user_id=eq.${user.id}`, {
                method: "PATCH",
                headers: getSupabaseHeaders(token),
                body: JSON.stringify(updatedPayload)
              });

              if (updateRes.ok) {
                result = { content: [{ type: "text", text: "Votre biographie professionnelle a été mise à jour avec succès !" }] };
              } else {
                const errText = await updateRes.text();
                result = { content: [{ type: "text", text: `Échec de modification : ${errText}` }], isError: true };
              }
            }

            else if (name === "telecharger_pdf") {
              const { cv_id } = args || {};
              const res = await fetch(`${supabaseUrl}/rest/v1/cvs?id=eq.${cv_id}&select=pdf_url,is_public,user_id,reference`, { headers: getSupabaseHeaders(token) });
              if (res.ok) {
                const list = await res.json();
                if (list.length === 0) {
                  result = { content: [{ type: "text", text: "CV introuvable." }], isError: true };
                } else {
                  const cv = list[0];
                  if (!cv.is_public && user.id !== cv.user_id) {
                    result = { content: [{ type: "text", text: "Accès refusé. Ce Curriculum Vitae est privé." }], isError: true };
                  } else if (!cv.pdf_url) {
                    result = { content: [{ type: "text", text: "Aucun fichier PDF joint actuellement pour ce Curriculum Vitae." }], isError: true };
                  } else {
                    // Try generating signed URL
                    let downloadUrl = cv.pdf_url;
                    if (cv.pdf_url.includes("/storage/v1/object/")) {
                      try {
                        const parts = cv.pdf_url.split("/storage/v1/object/");
                        if (parts.length > 1) {
                          const pathPart = parts[1];
                          const subParts = pathPart.split("/");
                          if (subParts.length >= 3) {
                            const bucket = subParts[1];
                            const path = subParts.slice(2).join("/");

                            const signRes = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucket}/${path}`, {
                              method: "POST",
                              headers: {
                                "apikey": supabaseServiceKey || supabaseAnonKey,
                                "Authorization": `Bearer ${supabaseServiceKey || supabaseAnonKey}`,
                                "Content-Type": "application/json"
                              },
                              body: JSON.stringify({ expiresIn: 3600 })
                            });

                            if (signRes.ok) {
                              const signData = await signRes.json();
                              const signedPath = signData.signedURL || signData.signedUrl;
                              if (signedPath) {
                                downloadUrl = signedPath.startsWith("http") ? signedPath : `${supabaseUrl}${signedPath}`;
                              }
                            }
                          }
                        }
                      } catch (err) {
                        console.error("Signed URL creation failed:", err);
                      }
                    }

                    result = { content: [{ type: "text", text: `Voici votre lien de téléchargement sécurisé (valide 1 heure) : ${downloadUrl}` }] };
                  }
                }
              } else {
                result = { content: [{ type: "text", text: "Erreur technique de communication avec la base de données." }], isError: true };
              }
            }

            else if (name === "sauvegarder_favori") {
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
                // If unique constraint violated, it's already a favorite. Just return success.
                result = { content: [{ type: "text", text: "Cet élément est déjà enregistré dans vos favoris !" }] };
              }
            }

            else if (name === "lister_favoris") {
              const favsRes = await fetch(`${supabaseUrl}/rest/v1/saved_items?user_id=eq.${user.id}`, { headers: getSupabaseHeaders(token) });
              if (favsRes.ok) {
                const list = await favsRes.json();
                
                // For each saved item, fetch detailed content in parallel to return full context
                const enrichedList = await Promise.all(list.map(async (item) => {
                  let details = null;
                  try {
                    let detailRes;
                    if (item.item_type === "cv") {
                      detailRes = await fetch(`${supabaseUrl}/rest/v1/cvs?id=eq.${item.item_id}&select=*`, { headers: getSupabaseHeaders(token) });
                    } else if (item.item_type === "bio") {
                      detailRes = await fetch(`${supabaseUrl}/rest/v1/bios?id=eq.${item.item_id}&select=*`, { headers: getSupabaseHeaders(token) });
                    } else if (item.item_type === "job_offer") {
                      detailRes = await fetch(`${supabaseUrl}/rest/v1/job_offers?id=eq.${item.item_id}&select=*`, { headers: getSupabaseHeaders(token) });
                    }
                    if (detailRes && detailRes.ok) {
                      const detailData = await detailRes.json();
                      details = detailData[0] || null;
                    }
                  } catch (e) {
                    console.error("Enrich error:", e);
                  }
                  return {
                    id: item.id,
                    item_type: item.item_type,
                    item_id: item.item_id,
                    created_at: item.created_at,
                    details
                  };
                }));

                result = { content: [{ type: "text", text: JSON.stringify(enrichedList, null, 2) }] };
              } else {
                result = { content: [{ type: "text", text: "Erreur de chargement des favoris." }], isError: true };
              }
            }

            else if (name === "postuler_offre") {
              const { job_offer_id, cv_id, bio_id, message } = args || {};

              // 1. Verify offer is active and approved
              const offerRes = await fetch(`${supabaseUrl}/rest/v1/job_offers?id=eq.${job_offer_id}&select=statut,moderation_status`, { headers: getSupabaseHeaders(token) });
              if (!offerRes.ok) {
                result = { content: [{ type: "text", text: "Impossible de valider l'offre d'emploi." }], isError: true };
                break;
              }
              const offerData = await offerRes.json();
              if (offerData.length === 0) {
                result = { content: [{ type: "text", text: "Offre d'emploi introuvable." }], isError: true };
                break;
              }
              if (offerData[0].statut !== "active" || offerData[0].moderation_status !== "approved") {
                result = { content: [{ type: "text", text: "Cette offre d'emploi n'est plus active ou est en attente de modération." }], isError: true };
                break;
              }

              // 2. Check if already applied
              const checkRes = await fetch(`${supabaseUrl}/rest/v1/job_applications?job_offer_id=eq.${job_offer_id}&user_id=eq.${user.id}`, { headers: getSupabaseHeaders(token) });
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
                result = { content: [{ type: "text", text: "Votre candidature a été transmise au recruteur avec succès ! 🚀" }] };
              } else {
                const errText = await postRes.text();
                result = { content: [{ type: "text", text: `Échec de l'envoi de candidature : ${errText}` }], isError: true };
              }
            }

            else if (name === "signaler_offre") {
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
                result = { content: [{ type: "text", text: "Offre d'emploi signalée avec succès aux modérateurs de la plateforme." }] };
              } else {
                result = { content: [{ type: "text", text: "Échec du signalement de l'offre." }], isError: true };
              }
            }

            else if (name === "booster_post") {
              const { target_type, target_id, duree_jours, numeroSend, nomclient, montant } = args || {};

              const activeDays = Number(duree_jours) || 7;
              const payAmount = Number(montant) || (activeDays * 1000); // 1000 XAF/day fallback

              // Check existing boost
              const checkRes = await fetch(`${supabaseUrl}/rest/v1/boosts?target_type=eq.${target_type}&target_id=eq.${target_id}&statut=eq.paid&expires_at=gt.${new Date().toISOString()}&select=id`, { headers: getSupabaseHeaders(token) });
              if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.length > 0) {
                  result = { content: [{ type: "text", text: "Ce contenu possède déjà un Boost actif." }], isError: true };
                  break;
                }
              }

              const tokenPay = "BOOST-" + Math.random().toString(36).substring(2, 12).toUpperCase();
              const expiresAt = new Date(Date.now() + activeDays * 24 * 60 * 60 * 1000).toISOString();

              const boostPayload = {
                user_id: user.id,
                target_type,
                target_id,
                token_pay: tokenPay,
                statut: "pending",
                montant: payAmount,
                duree_jours: activeDays,
                expires_at: expiresAt,
                created_at: new Date().toISOString()
              };

              // Insert boost row
              const insertBoostRes = await fetch(`${supabaseUrl}/rest/v1/boosts`, {
                method: "POST",
                headers: getSupabaseHeaders(token),
                body: JSON.stringify(boostPayload)
              });

              if (!insertBoostRes.ok) {
                const errText = await insertBoostRes.text();
                result = { content: [{ type: "text", text: `Impossible d'initier la ligne de transaction Boost: ${errText}` }], isError: true };
                break;
              }

              // Call MoneyFusion payment API
              const mfUrl = env.MONEYFUSION_API_URL;
              if (!mfUrl) {
                result = { content: [{ type: "text", text: "Passerelle de paiement MoneyFusion non configurée par l'administrateur. Transaction en attente." }] };
                break;
              }

              const siteUrl = env.SITE_URL || env.APP_URL || "https://ebookstore-73b.pages.dev";
              const webhookUrl = `${siteUrl}/api/webhook/moneyfusion`;
              const callbackUrl = `${siteUrl}/?boost=success`;

              const mfPayload = {
                totalPrice: payAmount,
                article: [{ [`Boost ${activeDays} jours`]: payAmount }],
                personal_Info: [{ userId: user.id, boostId: target_id, targetType: target_type }],
                numeroSend,
                nomclient,
                return_url: callbackUrl,
                webhook_url: webhookUrl
              };

              try {
                const mfResponse = await fetch(mfUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(mfPayload)
                });

                if (mfResponse.ok) {
                  const mfBody = await mfResponse.json();
                  const payUrl = mfBody.url || callbackUrl;
                  result = { content: [{ type: "text", text: `Lien de paiement MoneyFusion Boost créé ! Veuillez vous rendre sur ce lien sécurisé pour valider votre achat de ${payAmount} XAF : ${payUrl}` }] };
                } else {
                  const errText = await mfResponse.text();
                  result = { content: [{ type: "text", text: `La passerelle MoneyFusion a rejeté la requête : ${errText}. Boost enregistré en attente.` }] };
                }
              } catch (mfErr) {
                result = { content: [{ type: "text", text: `Erreur de connexion avec MoneyFusion: ${mfErr.message}. Boost enregistré en attente.` }] };
              }
            }

            // ===================================
            // 3. RECRUITER VERIFIED ONLY TOOLS
            // ===================================

            else {
              const recruiterCheck = await checkRecruiterStatus(user.id, token);
              if (!recruiterCheck.ok) {
                result = { content: [{ type: "text", text: recruiterCheck.error }], isError: true };
                break;
              }

              if (name === "publier_offre") {
                const { titre, description, entreprise, lieu, secteur, type_contrat, remote, salaire_min, salaire_max, devise, competences, publier_immediatement } = args || {};

                // Generate unique slug
                const slugify = (text) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
                const randomSuffix = Math.random().toString(36).substring(2, 6);
                const slug = `${slugify(titre)}-${randomSuffix}`;

                const offerPayload = {
                  recruiter_id: user.id,
                  titre,
                  slug,
                  description,
                  entreprise,
                  lieu,
                  secteur,
                  type_contrat,
                  remote: !!remote,
                  salaire_min: salaire_min || null,
                  salaire_max: salaire_max || null,
                  devise: devise || "XAF",
                  competences: competences || [],
                  statut: publier_immediatement === false ? "draft" : "active",
                  moderation_status: "pending", // ALWAYS starts in pending
                  vues: 0,
                  created_at: new Date().toISOString()
                };

                const publishRes = await fetch(`${supabaseUrl}/rest/v1/job_offers`, {
                  method: "POST",
                  headers: getSupabaseHeaders(token),
                  body: JSON.stringify(offerPayload)
                });

                if (publishRes.ok) {
                  result = { content: [{ type: "text", text: `Offre d'emploi '${titre}' créée avec succès ! Elle est en attente de modération. Slug : ${slug}` }] };
                } else {
                  const errText = await publishRes.text();
                  result = { content: [{ type: "text", text: `Échec de publication de l'offre d'emploi : ${errText}` }], isError: true };
                }
              }

              else if (name === "generer_offre_ia") {
                const { points_bruts, poste, entreprise } = args || {};
                const extApiUrl = env.AI_JOB_GENERATION_API_URL;
                let success = false;
                let finalTitre = "";
                let finalDesc = "";

                if (extApiUrl) {
                  try {
                    const response = await fetch(extApiUrl, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ points_bruts, poste, entreprise })
                    });

                    if (response.ok) {
                      const body = await response.json();
                      finalTitre = body.titre;
                      finalDesc = body.description;
                      success = true;
                    }
                  } catch (err) {
                    console.warn("External AI job API failed, falling back to Gemini:", err);
                  }
                }

                if (!success) {
                  const groqKey = env.GROQ_API_KEY;
                  if (groqKey) {
                    try {
                      const prompt = `Tu es un rédacteur d'offres d'emploi exceptionnel pour le marché Africain.
Génère une offre d'emploi attrayante, bien structurée en français pour le poste de "${poste}" chez "${entreprise}".

Points clés bruts fournis :
${points_bruts}

Consignes :
1. Rédige un titre professionnel clair et accrocheur.
2. Structure la description avec une introduction sur l'entreprise, les responsabilités principales, le profil recherché et les compétences.
3. Utilise une mise en page Markdown propre avec des puces.
4. Réponds exclusivement avec un objet JSON structuré comme suit :
{
  "titre": "Le titre de l'offre d'emploi généré",
  "description": "La description complète rédigée au format Markdown"
}
Ne mets aucun commentaire, aucune balise de code markdown de type \`\`\`json, retourne UNIQUEMENT le JSON pur valide.`;

                      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${groqKey}`
                        },
                        body: JSON.stringify({
                          model: "llama-3.3-70b-versatile",
                          messages: [
                            {
                              role: "user",
                              content: prompt
                            }
                          ],
                          temperature: 0.5,
                          response_format: { type: "json_object" }
                        })
                      });

                      if (response.ok) {
                        const data = await response.json();
                        const text = data.choices?.[0]?.message?.content?.trim();
                        if (text) {
                          const cleanText = text.trim().replace(/^```json/, "").replace(/```$/, "").trim();
                          const parsed = JSON.parse(cleanText);
                          finalTitre = parsed.titre;
                          finalDesc = parsed.description;
                          success = true;
                        }
                      }
                    } catch (err) {
                      console.error("Groq fallback inside MCP failed:", err);
                    }
                  }
                }

                if (!success) {
                  const geminiKey = env.GEMINI_API_KEY;
                  if (geminiKey) {
                    try {
                      const prompt = `Tu es un rédacteur d'offres d'emploi exceptionnel pour le marché Africain.
Génère une offre d'emploi attrayante, bien structurée en français pour le poste de "${poste}" chez "${entreprise}".

Points clés bruts fournis :
${points_bruts}

Consignes :
1. Rédige un titre professionnel clair et accrocheur.
2. Structure la description avec une introduction sur l'entreprise, les responsabilités principales, le profil recherché et les compétences.
3. Utilise une mise en page Markdown propre avec des puces.
4. Réponds exclusivement avec un objet JSON structuré comme suit :
{
  "titre": "Le titre de l'offre d'emploi généré",
  "description": "La description complète rédigée au format Markdown"
}`;

                      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          contents: [{ parts: [{ text: prompt }] }],
                          generationConfig: { responseMimeType: "application/json" }
                        })
                      });

                      if (response.ok) {
                        const data = await response.json();
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) {
                          const cleanText = text.trim().replace(/^```json/, "").replace(/```$/, "").trim();
                          const parsed = JSON.parse(cleanText);
                          finalTitre = parsed.titre;
                          finalDesc = parsed.description;
                          success = true;
                        }
                      }
                    } catch (err) {
                      console.error("Gemini fallback failed:", err);
                    }
                  }
                }

                if (success) {
                  result = {
                    content: [{
                      type: "text",
                      text: JSON.stringify({ titre: finalTitre, description: finalDesc, ai_generated: true }, null, 2)
                    }]
                  };
                } else {
                  result = { content: [{ type: "text", text: "Impossible de générer l'offre d'emploi avec l'IA (aucune clé API configurée ou services indisponibles)." }], isError: true };
                }
              }

              else if (name === "lister_candidatures") {
                const { job_offer_id } = args || {};

                // Verify owner of the offer
                const offerRes = await fetch(`${supabaseUrl}/rest/v1/job_offers?id=eq.${job_offer_id}&select=recruiter_id`, { headers: getSupabaseHeaders(token) });
                if (!offerRes.ok) {
                  result = { content: [{ type: "text", text: "Erreur lors de la vérification de propriété de l'offre." }], isError: true };
                  break;
                }
                const offerData = await offerRes.json();
                if (offerData.length === 0 || offerData[0].recruiter_id !== user.id) {
                  result = { content: [{ type: "text", text: "Accès non autorisé (Vous n'êtes pas le recruteur auteur de cette offre)." }], isError: true };
                  break;
                }

                const appsRes = await fetch(`${supabaseUrl}/rest/v1/job_applications?job_offer_id=eq.${job_offer_id}&select=*`, { headers: getSupabaseHeaders(token) });
                if (appsRes.ok) {
                  const list = await appsRes.json();
                  result = { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
                } else {
                  result = { content: [{ type: "text", text: "Erreur lors du chargement des candidatures." }], isError: true };
                }
              }

              else if (name === "mettre_a_jour_candidature") {
                const { application_id, statut } = args || {};

                // Get application
                const appRes = await fetch(`${supabaseUrl}/rest/v1/job_applications?id=eq.${application_id}&select=job_offer_id`, { headers: getSupabaseHeaders(token) });
                if (!appRes.ok) {
                  result = { content: [{ type: "text", text: "Candidature introuvable." }], isError: true };
                  break;
                }
                const appData = await appRes.json();
                if (appData.length === 0) {
                  result = { content: [{ type: "text", text: "Candidature introuvable." }], isError: true };
                  break;
                }

                // Verify recruiter owns the associated job offer
                const offerRes = await fetch(`${supabaseUrl}/rest/v1/job_offers?id=eq.${appData[0].job_offer_id}&select=recruiter_id`, { headers: getSupabaseHeaders(token) });
                const offerData = await offerRes.json();
                if (offerData.length === 0 || offerData[0].recruiter_id !== user.id) {
                  result = { content: [{ type: "text", text: "Accès non autorisé. Vous n'êtes pas le recruteur lié à cette offre d'emploi." }], isError: true };
                  break;
                }

                const updateRes = await fetch(`${supabaseUrl}/rest/v1/job_applications?id=eq.${application_id}`, {
                  method: "PATCH",
                  headers: getSupabaseHeaders(token),
                  body: JSON.stringify({ statut, updated_at: new Date().toISOString() })
                });

                if (updateRes.ok) {
                  result = { content: [{ type: "text", text: "Statut de la candidature mis à jour avec succès !" }] };
                } else {
                  result = { content: [{ type: "text", text: "Impossible de modifier le statut de la candidature." }], isError: true };
                }
              }

              else {
                error = { code: -32601, message: `Method not found: ${name}` };
              }
            }
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
