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
      console.error("Token verification failed:", err);
    }
    return null;
  };

  // 1. Handle SSE GET request (establish transport)
  if (request.method === "GET") {
    const url = new URL(request.url);
    const sessionId = Math.random().toString(36).substring(2, 15);
    const postUrl = `${url.pathname}?session_id=${sessionId}`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send the endpoint event immediately
        controller.enqueue(encoder.encode(`event: endpoint\ndata: ${postUrl}\n\n`));
      },
      cancel() {
        console.log(`SSE connection closed for session: ${sessionId}`);
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // 2. Handle POST request (JSON-RPC 2.0 messages)
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

      // Handler for JSON-RPC methods
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
              name: "EbookStore Afrique MCP Server",
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
                description: "Recherche des CV publics par compétences, titre, nom ou résumé. Limité à 20 résultats.",
                inputSchema: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "Terme de recherche (ex: développeur, React, compétences...)"
                    }
                  },
                  required: ["query"]
                }
              },
              {
                name: "obtenir_cv",
                description: "Récupère le détail complet d'un CV public à partir de sa référence unique.",
                inputSchema: {
                  type: "object",
                  properties: {
                    reference: {
                      type: "string",
                      description: "La référence unique du CV (ex: CV-2026-X8F9)"
                    }
                  },
                  required: ["reference"]
                }
              },
              {
                name: "obtenir_bio",
                description: "Récupère le détail complet d'une biographie publique à partir de son slug unique.",
                inputSchema: {
                  type: "object",
                  properties: {
                    slug: {
                      type: "string",
                      description: "Le slug unique de la biographie (ex: jean-dupont-421)"
                    }
                  },
                  required: ["slug"]
                }
              },
              {
                name: "telecharger_pdf",
                description: "Récupère le lien de téléchargement PDF public d'un CV.",
                inputSchema: {
                  type: "object",
                  properties: {
                    reference: {
                      type: "string",
                      description: "La référence unique du CV"
                    }
                  },
                  required: ["reference"]
                }
              },
              {
                name: "creer_cv",
                description: "Crée un nouveau CV en mode privé pour l'utilisateur connecté. Nécessite un jeton d'authentification valide (JWT) de l'utilisateur.",
                inputSchema: {
                  type: "object",
                  properties: {
                    nom: {
                      type: "string",
                      description: "Nom complet du candidat"
                    },
                    titre: {
                      type: "string",
                      description: "Titre professionnel (ex: Développeur Fullstack React)"
                    },
                    competences: {
                      type: "array",
                      items: {
                        type: "string"
                      },
                      description: "Liste de compétences clés"
                    },
                    experience: {
                      type: "string",
                      description: "Description de l'expérience professionnelle (texte ou liste)"
                    },
                    formation: {
                      type: "string",
                      description: "Description de la formation (texte ou liste)"
                    }
                  },
                  required: ["nom", "titre", "competences"]
                }
              },
              {
                name: "acheter_ebook",
                description: "Initié un achat d'ebook et génère un lien de paiement sécurisé. Nécessite un jeton d'authentification valide (JWT).",
                inputSchema: {
                  type: "object",
                  properties: {
                    ebook_id: {
                      type: "string",
                      description: "L'identifiant unique de l'ebook à acheter"
                    },
                    numero_paiement: {
                      type: "string",
                      description: "Le numéro de téléphone pour le paiement (ex: 2250700000000)"
                    },
                    nom_client: {
                      type: "string",
                      description: "Le nom complet du client"
                    }
                  },
                  required: ["ebook_id", "numero_paiement", "nom_client"]
                }
              }
            ]
          };
          break;

        case "tools/call": {
          const { name, arguments: args } = params || {};

          if (name === "rechercher_cv") {
            const q = (args?.query || "").trim().toLowerCase();
            const headers = getSupabaseHeaders();
            const res = await fetch(`${supabaseUrl}/rest/v1/cvs?is_public=eq.true&select=reference,visibility,summary,data`, { headers });
            
            if (res.ok) {
              const cvs = await res.json();
              const filtered = cvs.map(cv => {
                const parsedData = typeof cv.data === "string" ? JSON.parse(cv.data) : cv.data;
                const isAnon = cv.visibility === "anonymous";
                const nom = isAnon ? "Profil Anonyme" : (parsedData?.nom || "Non spécifié");
                const titre = parsedData?.titre || "Non spécifié";
                const competences = parsedData?.competences || [];
                const summary = cv.summary || "";

                const matchStr = [cv.reference, nom, titre, summary, ...competences].join(" ").toLowerCase();
                if (matchStr.includes(q)) {
                  return {
                    reference: cv.reference,
                    nom,
                    titre,
                    resume_court: summary.length > 150 ? summary.substring(0, 150) + "..." : summary
                  };
                }
                return null;
              }).filter(Boolean).slice(0, 20);

              result = {
                content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
                isError: false
              };
            } else {
              result = {
                content: [{ type: "text", text: "Erreur lors de la recherche des CVs publics dans la base de données." }],
                isError: true
              };
            }
          } 
          
          else if (name === "obtenir_cv") {
            const ref = args?.reference;
            if (!ref) {
              result = { content: [{ type: "text", text: "Paramètre 'reference' manquant." }], isError: true };
              break;
            }

            const headers = getSupabaseHeaders();
            const res = await fetch(`${supabaseUrl}/rest/v1/cvs?reference=eq.${ref}&is_public=eq.true&select=*`, { headers });
            
            if (res.ok) {
              const data = await res.json();
              if (data && data.length > 0) {
                const cv = data[0];
                const parsedData = typeof cv.data === "string" ? JSON.parse(cv.data) : cv.data;
                let finalNom = parsedData?.nom || "Non spécifié";

                if (cv.visibility === "anonymous") {
                  const parts = finalNom.trim().split(/\s+/);
                  const firstName = parts[0] || "Prénom";
                  finalNom = `${firstName} (Profil Anonyme)`;
                }

                const resultData = {
                  reference: cv.reference,
                  nom: finalNom,
                  titre: parsedData?.titre || "Non spécifié",
                  competences: parsedData?.competences || [],
                  experiences: parsedData?.experiences || [],
                  formation: parsedData?.formation || [],
                  summary: cv.summary || "",
                  pdf_url: cv.pdf_url || ""
                };

                result = {
                  content: [{ type: "text", text: JSON.stringify(resultData, null, 2) }],
                  isError: false
                };
              } else {
                result = {
                  content: [{ type: "text", text: "CV introuvable ou non public" }],
                  isError: false // Return error friendly text without throwing JSON-RPC protocol error
                };
              }
            } else {
              result = { content: [{ type: "text", text: "Erreur lors de la récupération du CV." }], isError: true };
            }
          } 
          
          else if (name === "obtenir_bio") {
            const slug = args?.slug;
            if (!slug) {
              result = { content: [{ type: "text", text: "Paramètre 'slug' manquant." }], isError: true };
              break;
            }

            const headers = getSupabaseHeaders();
            const res = await fetch(`${supabaseUrl}/rest/v1/bios?slug=eq.${slug}&is_public=eq.true&select=*`, { headers });
            
            if (res.ok) {
              const data = await res.json();
              if (data && data.length > 0) {
                const bio = data[0];
                const resultData = {
                  slug: bio.slug,
                  content: bio.content || ""
                };
                result = {
                  content: [{ type: "text", text: JSON.stringify(resultData, null, 2) }],
                  isError: false
                };
              } else {
                result = {
                  content: [{ type: "text", text: "Biographie introuvable ou non publique" }],
                  isError: false
                };
              }
            } else {
              result = { content: [{ type: "text", text: "Erreur lors de la récupération de la biographie." }], isError: true };
            }
          } 
          
          else if (name === "telecharger_pdf") {
            const ref = args?.reference;
            if (!ref) {
              result = { content: [{ type: "text", text: "Paramètre 'reference' manquant." }], isError: true };
              break;
            }

            const headers = getSupabaseHeaders();
            const res = await fetch(`${supabaseUrl}/rest/v1/cvs?reference=eq.${ref}&is_public=eq.true&select=pdf_url`, { headers });
            
            if (res.ok) {
              const data = await res.json();
              if (data && data.length > 0) {
                const cv = data[0];
                if (cv.pdf_url) {
                  result = {
                    content: [{ type: "text", text: `Voici l'URL de téléchargement PDF : ${cv.pdf_url}` }],
                    isError: false
                  };
                } else {
                  result = {
                    content: [{ type: "text", text: "PDF non disponible pour ce CV" }],
                    isError: false
                  };
                }
              } else {
                result = {
                  content: [{ type: "text", text: "CV introuvable ou non public" }],
                  isError: false
                };
              }
            } else {
              result = { content: [{ type: "text", text: "Erreur lors de la recherche du PDF." }], isError: true };
            }
          } 
          
          else if (name === "creer_cv") {
            // VERIFY TOKEN - REQUIRED for write operation
            const authData = await verifyUserToken();
            if (!authData) {
              result = {
                content: [{ type: "text", text: "Authentification requise" }],
                isError: true
              };
              break;
            }
            const { user, token } = authData;

            const { nom, titre, competences, experience, formation } = args || {};
            if (!nom || !titre || !competences) {
              result = {
                content: [{ type: "text", text: "Informations manquantes. Les champs 'nom', 'titre' et 'competences' sont obligatoires." }],
                isError: true
              };
              break;
            }

            // Generate unique reference
            const generateRandomRef = () => {
              const year = new Date().getFullYear();
              const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
              let randomPart = "";
              for (let i = 0; i < 4; i++) {
                randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              return `CV-${year}-${randomPart}`;
            };

            let reference = "";
            let unique = false;
            for (let retry = 0; retry < 5; retry++) {
              reference = generateRandomRef();
              const checkRes = await fetch(`${supabaseUrl}/rest/v1/cvs?reference=eq.${reference}&select=reference`, {
                headers: getSupabaseHeaders(token)
              });
              if (checkRes.ok) {
                const existing = await checkRes.json();
                if (existing.length === 0) {
                  unique = true;
                  break;
                }
              }
            }

            if (!unique) {
              result = {
                content: [{ type: "text", text: "Impossible de générer une référence de CV unique après plusieurs essais." }],
                isError: true
              };
              break;
            }

            // Map experiences and formations
            let experiences = [];
            if (typeof experience === "string" && experience) {
              experiences = [{ entreprise: "", poste: experience, date_debut: "", date_fin: "", description: "" }];
            } else if (Array.isArray(experience)) {
              experiences = experience.map(exp => {
                if (typeof exp === "string") {
                  return { entreprise: "", poste: exp, date_debut: "", date_fin: "", description: "" };
                }
                return {
                  entreprise: exp.entreprise || "",
                  poste: exp.poste || "",
                  date_debut: exp.date_debut || "",
                  date_fin: exp.date_fin || "",
                  description: exp.description || ""
                };
              });
            }

            let formations = [];
            if (typeof formation === "string" && formation) {
              formations = [{ ecole: "", diplome: formation, annee: "" }];
            } else if (Array.isArray(formation)) {
              formations = formation.map(f => {
                if (typeof f === "string") {
                  return { ecole: "", diplome: f, annee: "" };
                }
                return {
                  ecole: f.ecole || f.school || "",
                  diplome: f.diplome || f.degree || "",
                  annee: f.annee || f.year || ""
                };
              });
            }

            const newCV = {
              user_id: user.id,
              reference,
              data: {
                nom,
                titre,
                photo: "",
                competences: Array.isArray(competences) ? competences : [],
                experiences,
                formation: formations
              },
              summary: "",
              pdf_url: "",
              is_public: false, // Strict requirement: always false on create via MCP
              visibility: "private" // Strict requirement: always private on create via MCP
            };

            const insertRes = await fetch(`${supabaseUrl}/rest/v1/cvs`, {
              method: "POST",
              headers: {
                ...getSupabaseHeaders(token),
                "Prefer": "return=representation"
              },
              body: JSON.stringify(newCV)
            });

            if (insertRes.ok) {
              result = {
                content: [{ 
                  type: "text", 
                  text: `Félicitations ! Votre CV a bien été créé en mode privé avec la référence : ${reference}\n\nMessage de confirmation : CV créé en mode privé. Connectez-vous sur ebookstore-73b.pages.dev/dashboard pour le personnaliser et le publier si vous le souhaitez.` 
                }],
                isError: false
              };
            } else {
              const errText = await insertRes.text();
              result = {
                content: [{ type: "text", text: `Échec de l'insertion dans la base de données : ${errText}` }],
                isError: true
              };
            }
          } 
          
          else if (name === "acheter_ebook") {
            // VERIFY TOKEN - REQUIRED for write operation
            const authData = await verifyUserToken();
            if (!authData) {
              result = {
                content: [{ type: "text", text: "Authentification requise pour effectuer un achat" }],
                isError: true
              };
              break;
            }
            const { user } = authData;

            const { ebook_id, numero_paiement, nom_client } = args || {};
            if (!ebook_id || !numero_paiement || !nom_client) {
              result = {
                content: [{ type: "text", text: "Informations manquantes. Les champs 'ebook_id', 'numero_paiement' et 'nom_client' sont obligatoires." }],
                isError: true
              };
              break;
            }

            const urlObj = new URL(request.url);
            const appUrl = env.APP_URL || `${urlObj.protocol}//${urlObj.host}`;

            try {
              const createPaymentRes = await fetch(`${appUrl}/api/payments/create`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  ebookId: ebook_id,
                  userId: user.id,
                  numeroSend: numero_paiement,
                  nomclient: nom_client,
                  userEmail: user.email || ""
                })
              });

              if (createPaymentRes.ok) {
                const payData = await createPaymentRes.json();
                if (payData.statut && payData.url) {
                  result = {
                    content: [{ 
                      type: "text", 
                      text: `Voici votre lien de paiement sécurisé. Cliquez dessus pour confirmer et finaliser votre achat : ${payData.url}` 
                    }],
                    isError: false
                  };
                } else {
                  result = {
                    content: [{ type: "text", text: `Échec de l'initialisation du paiement : ${payData.error || "Réponse invalide du service de paiement"}` }],
                    isError: true
                  };
                }
              } else {
                const errText = await createPaymentRes.text();
                result = {
                  content: [{ type: "text", text: `Erreur de communication avec le serveur de paiement : ${errText}` }],
                  isError: true
                };
              }
            } catch (err) {
              result = {
                content: [{ type: "text", text: `Erreur interne lors de la création du paiement : ${err.message}` }],
                isError: true
              };
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
