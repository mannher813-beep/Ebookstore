import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = 3000;

// ==========================================
// SUPABASE CLIENT (LAZY INITIALIZATION)
// ==========================================
let supabaseClient: any = null;

function getSupabase(): any {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

// In-Memory Fallback State for Simulator Mode (when keys are missing)
let mockEbooks = [
  {
    id: "eb130f14-722a-4428-ba20-ef8005b67a51",
    titre: "Devenir Développeur Full-Stack Moderne",
    description: "Le guide ultime pour maîtriser React, Express, TypeScript et les bases de données SQL / NoSQL. Inclus des projets réels pas-à-pas.",
    prix: 5000, // 5000 FCFA
    url_couverture: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=400",
    url_fichier_storage: "fullstack_guide_2026.pdf",
    categorie: "Programmation",
    created_at: new Date().toISOString(),
  },
  {
    id: "eb130f14-722a-4428-ba20-ef8005b67a52",
    titre: "L'art du Design System avec Tailwind CSS",
    description: "Apprenez à concevoir des interfaces professionnelles, fluides, et extrêmement polies sans écrire un seul fichier CSS personnalisé.",
    prix: 3500, // 3500 FCFA
    url_couverture: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=400",
    url_fichier_storage: "tailwind_design_system.pdf",
    categorie: "Design",
    created_at: new Date().toISOString(),
  },
  {
    id: "eb130f14-722a-4428-ba20-ef8005b67a53",
    titre: "SaaS Blueprint: Lancer son projet en Afrique",
    description: "Un guide stratégique pour monétiser vos services sur le continent. Intégration mobile money, réglementation et stratégies de croissance.",
    prix: 7500, // 7500 FCFA
    url_couverture: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=400",
    url_fichier_storage: "saas_blueprint_africa.pdf",
    categorie: "Business",
    created_at: new Date().toISOString(),
  }
];

let mockAchats: any[] = [];
let mockProfiles: any[] = [
  { id: "mock-user-123", role: "admin", email: "techsen237@gmail.com" }
];

// Helper to determine if we are in real Supabase production mode
function isProductionMode() {
  return getSupabase() !== null;
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Check configuration status
app.get("/api/config-status", (req, res) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "Non configuré";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? "Configuré (Masqué)" : "Non configuré";
  const moneyfusionUrl = process.env.MONEYFUSION_API_URL || "Non configuré";

  res.json({
    supabaseUrl,
    supabaseServiceKey,
    moneyfusionUrl,
    isRealProduction: isProductionMode(),
  });
});

// 1. Catalogue d'ebooks (List ebooks)
app.get("/api/ebooks", async (req, res) => {
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from("ebooks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(data);
    } catch (err: any) {
      console.error("Supabase select ebooks error:", err);
      return res.status(500).json({ error: err.message });
    }
  } else {
    // Simulator Mode
    return res.json(mockEbooks);
  }
});

// Add ebook (Admin role)
app.post("/api/ebooks", async (req, res) => {
  const { titre, description, prix, url_couverture, url_fichier_storage, categorie } = req.body;

  if (!titre || !description || !prix || !url_couverture || !url_fichier_storage || !categorie) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  }

  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from("ebooks")
        .insert([{ titre, description, prix: Number(prix), url_couverture, url_fichier_storage, categorie }])
        .select();

      if (error) throw error;
      return res.status(201).json(data[0]);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    // Simulator Mode
    const newEbook = {
      id: "eb-" + Math.random().toString(36).substr(2, 9),
      titre,
      description,
      prix: Number(prix),
      url_couverture,
      url_fichier_storage,
      categorie,
      created_at: new Date().toISOString(),
    };
    mockEbooks.unshift(newEbook);
    return res.status(201).json(newEbook);
  }
});

// Delete ebook (Admin role)
app.delete("/api/ebooks/:id", async (req, res) => {
  const { id } = req.params;
  const client = getSupabase();
  if (client) {
    try {
      const { error } = await client.from("ebooks").delete().eq("id", id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    // Simulator Mode
    mockEbooks = mockEbooks.filter(b => b.id !== id);
    return res.json({ success: true });
  }
});

// Get profile and purchases of connected user
app.get("/api/user-data", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  const token = authHeader.replace("Bearer ", "");
  const client = getSupabase();

  if (client) {
    try {
      // Decode user auth via Supabase
      const { data: { user }, error: authErr } = await client.auth.getUser(token);
      if (authErr || !user) {
        return res.status(401).json({ error: "Token invalide ou expiré" });
      }

      // Fetch Profile
      const { data: profile } = await client
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      // Fetch Purchases with joined ebook info
      const { data: purchases } = await client
        .from("achats")
        .select("*, ebook:ebook_id(*)")
        .eq("user_id", user.id);

      return res.json({
        user: { id: user.id, email: user.email },
        role: profile?.role || "user",
        purchases: purchases || [],
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    // Simulator Mode
    // For simplicity, we decode a simulated token e.g. "mock-token-user" or "mock-token-admin"
    const isAdmin = token.includes("admin");
    const userId = isAdmin ? "mock-user-123" : "mock-user-456";
    const userEmail = isAdmin ? "techsen237@gmail.com" : "customer@example.com";

    const userPurchases = mockAchats
      .filter(a => a.user_id === userId)
      .map(a => {
        const ebook = mockEbooks.find(eb => eb.id === a.ebook_id);
        return { ...a, ebook };
      });

    return res.json({
      user: { id: userId, email: userEmail },
      role: isAdmin ? "admin" : "user",
      purchases: userPurchases,
    });
  }
});

// Fetch transaction history (Admin only)
app.get("/api/transactions", async (req, res) => {
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from("achats")
        .select("*, ebook:ebook_id(titre)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    // Simulator Mode
    return res.json(mockAchats.map(a => {
      const ebook = mockEbooks.find(eb => eb.id === a.ebook_id);
      return { ...a, ebook: { titre: ebook?.titre || "Inconnu" } };
    }));
  }
});

// 2. Création d'une demande de paiement MoneyFusion
app.post("/api/payments/create", async (req, res) => {
  const { ebookId, userId, numeroSend, nomclient, userEmail } = req.body;

  if (!ebookId || !userId || !numeroSend || !nomclient) {
    return res.status(400).json({ error: "Informations manquantes." });
  }

  // Find price of ebook
  let price = 0;
  let ebookTitle = "";
  const client = getSupabase();

  if (client) {
    const { data: ebook } = await client
      .from("ebooks")
      .select("prix, titre")
      .eq("id", ebookId)
      .single();

    if (!ebook) {
      return res.status(404).json({ error: "Ebook non trouvé" });
    }
    price = Number(ebook.prix);
    ebookTitle = ebook.titre;
  } else {
    const ebook = mockEbooks.find(b => b.id === ebookId);
    if (!ebook) {
      return res.status(404).json({ error: "Ebook non trouvé" });
    }
    price = ebook.prix;
    ebookTitle = ebook.titre;
  }

  const orderId = "order_" + Math.random().toString(36).substr(2, 9);
  const tokenPay = "mf_tok_" + Math.random().toString(36).substr(2, 14);

  // Register the transaction entry with status 'pending'
  if (client) {
    try {
      const { error } = await client.from("achats").insert([
        {
          user_id: userId,
          ebook_id: ebookId,
          token_pay: tokenPay,
          statut: "pending",
          montant: price,
        }
      ]);
      if (error) throw error;
    } catch (err: any) {
      console.error("Error writing transaction to Supabase:", err);
      return res.status(500).json({ error: "Impossible de créer la transaction" });
    }
  } else {
    // Simulator Mode
    mockAchats.push({
      id: "ach-" + Math.random().toString(36).substr(2, 9),
      user_id: userId,
      ebook_id: ebookId,
      token_pay: tokenPay,
      statut: "pending",
      montant: price,
      created_at: new Date().toISOString(),
    });
  }

  const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

  // Build MoneyFusion payload as specified in documentation
  const payload = {
    totalPrice: price,
    article: [{ [ebookTitle]: price }],
    personal_Info: [{ userId, orderId, ebookId }],
    numeroSend,
    nomclient,
    return_url: `${appUrl}/mes-achats?token=${tokenPay}`,
    webhook_url: `${appUrl}/api/webhook/moneyfusion`,
  };

  const moneyfusionApiUrl = process.env.MONEYFUSION_API_URL;

  if (moneyfusionApiUrl && moneyfusionApiUrl !== "Non configuré") {
    // REAL PRODUCTION PAYMENT CALL TO MONEYFUSION API
    try {
      console.log("Sending payment request to MoneyFusion API:", moneyfusionApiUrl, payload);
      const response = await fetch(moneyfusionApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": process.env.MONEYFUSION_PRIVATE_KEY ? `Bearer ${process.env.MONEYFUSION_PRIVATE_KEY}` : "",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("MoneyFusion API Response:", data);

      if (data.statut) {
        // Update local purchase record with the actual token returned if different
        const returnedToken = data.token || tokenPay;
        if (returnedToken !== tokenPay) {
          if (client) {
            await client
              .from("achats")
              .update({ token_pay: returnedToken })
              .eq("token_pay", tokenPay);
          } else {
            const achObj = mockAchats.find(a => a.token_pay === tokenPay);
            if (achObj) achObj.token_pay = returnedToken;
          }
        }

        return res.json({
          statut: true,
          token: returnedToken,
          message: "paiement en cours",
          url: data.url, // Redirect URL to MoneyFusion Checkout
        });
      } else {
        return res.status(400).json({ error: data.message || "Échec de l'initialisation du paiement MoneyFusion" });
      }
    } catch (err: any) {
      console.error("MoneyFusion API connection error:", err);
      // Fallback inside production: If server-side API call crashes, notify user
      return res.status(502).json({ error: "Erreur de communication avec la plateforme de paiement MoneyFusion: " + err.message });
    }
  } else {
    // SIMULATOR ROUTE: Provide an URL that takes user to our simulated payment gateway page in the frontend
    console.log("Simulator mode active. MoneyFusion API URL not set.");
    const simulatedCheckoutUrl = `/simulateur-paiement?token=${tokenPay}&price=${price}&ebook=${encodeURIComponent(ebookTitle)}&client=${encodeURIComponent(nomclient)}`;

    return res.json({
      statut: true,
      token: tokenPay,
      message: "paiement en cours (SIMULATEUR ACTIVÉ)",
      url: simulatedCheckoutUrl,
    });
  }
});

// 3. Webhook MoneyFusion (`POST /api/webhook/moneyfusion`)
app.post("/api/webhook/moneyfusion", async (req, res) => {
  const payload = req.body;
  console.log("RECEIVED MONEYFUSION WEBHOOK:", JSON.stringify(payload, null, 2));

  const { event, tokenPay, personal_Info } = payload;

  if (!tokenPay) {
    return res.status(400).json({ error: "tokenPay requis" });
  }

  const client = getSupabase();

  // Find transaction
  let existingAchat: any = null;
  if (client) {
    const { data } = await client
      .from("achats")
      .select("*")
      .eq("token_pay", tokenPay)
      .maybeSingle();
    existingAchat = data;
  } else {
    existingAchat = mockAchats.find(a => a.token_pay === tokenPay);
  }

  if (!existingAchat) {
    console.warn(`Webhook Error: Transaction with tokenPay ${tokenPay} not found in database.`);
    // In production we should return 404 but some systems retry so we output 200 or 404
    return res.status(404).json({ error: "Transaction non trouvée" });
  }

  // Status mapping from MoneyFusion events
  let targetStatus = "pending";
  if (event === "payin.session.completed") {
    targetStatus = "paid";
  } else if (event === "payin.session.cancelled") {
    targetStatus = "failure";
  }

  // Avoid duplicate updates (MoneyFusion redundant notifications handler as specified)
  if (existingAchat.statut === targetStatus) {
    console.log(`Webhook Ignored: Redundant status update for tokenPay ${tokenPay} (${targetStatus})`);
    return res.json({ message: "Notification redondante ignorée", success: true });
  }

  // Update status
  if (client) {
    try {
      const { error } = await client
        .from("achats")
        .update({ statut: targetStatus })
        .eq("token_pay", tokenPay);

      if (error) throw error;
      console.log(`Transaction ${tokenPay} status updated to ${targetStatus} in Supabase.`);
    } catch (err: any) {
      console.error("Database update error during webhook:", err);
      return res.status(500).json({ error: "Erreur de mise à jour de la transaction" });
    }
  } else {
    // Simulator Mode
    existingAchat.statut = targetStatus;
    console.log(`Transaction ${tokenPay} status updated to ${targetStatus} in Simulator memory.`);
  }

  return res.json({ message: "Statut mis à jour avec succès", success: true });
});

// 4. Vérification de statut (GET /api/payments/status/:token)
app.get("/api/payments/status/:token", async (req, res) => {
  const { token } = req.params;
  const client = getSupabase();

  let existingAchat: any = null;
  if (client) {
    const { data } = await client
      .from("achats")
      .select("*, ebook:ebook_id(*)")
      .eq("token_pay", token)
      .maybeSingle();
    existingAchat = data;
  } else {
    const ach = mockAchats.find(a => a.token_pay === token);
    if (ach) {
      const ebook = mockEbooks.find(eb => eb.id === ach.ebook_id);
      existingAchat = { ...ach, ebook };
    }
  }

  if (!existingAchat) {
    return res.status(404).json({ error: "Transaction non trouvée" });
  }

  // Optional: Query MoneyFusion server directly to sync statuses if pending
  const moneyfusionUrl = process.env.MONEYFUSION_API_URL;
  if (existingAchat.statut === "pending" && moneyfusionUrl && moneyfusionUrl !== "Non configuré") {
    try {
      const statusApiUrl = `https://www.pay.moneyfusion.net/paiementNotif/${token}`;
      console.log(`Polling MoneyFusion API status directly for token: ${token} at ${statusApiUrl}`);
      const checkRes = await fetch(statusApiUrl);
      const data = await checkRes.json();

      if (data.statut && data.data) {
        let externalStatus = data.data.statut; // pending, failure, no paid, paid
        let targetStatus = "pending";

        if (externalStatus === "paid") targetStatus = "paid";
        else if (externalStatus === "failure" || externalStatus === "no paid") targetStatus = "failure";

        if (existingAchat.statut !== targetStatus) {
          existingAchat.statut = targetStatus;
          // Sync with db
          if (client) {
            await client
              .from("achats")
              .update({ statut: targetStatus })
              .eq("token_pay", token);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch direct status from MoneyFusion endpoint:", err);
    }
  }

  return res.json(existingAchat);
});

// 5. Génération d'URL de téléchargement sécurisée et signée Supabase Storage
app.get("/api/download/:ebookId", async (req, res) => {
  const { ebookId } = req.params;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Veuillez vous connecter pour télécharger cet ebook." });
  }

  const token = authHeader.replace("Bearer ", "");
  const client = getSupabase();

  if (client) {
    try {
      // Decode user auth
      const { data: { user }, error: authErr } = await client.auth.getUser(token);
      if (authErr || !user) {
        return res.status(401).json({ error: "Session expirée. Veuillez vous reconnecter." });
      }

      // Check if user has purchased this ebook with 'paid' status
      const { data: purchase, error: purchaseErr } = await client
        .from("achats")
        .select("*")
        .eq("user_id", user.id)
        .eq("ebook_id", ebookId)
        .eq("statut", "paid")
        .maybeSingle();

      if (purchaseErr || !purchase) {
        return res.status(403).json({ error: "Vous n'avez pas acheté cet ebook ou le paiement est toujours en cours." });
      }

      // Retrieve ebook record for file storage path
      const { data: ebook } = await client
        .from("ebooks")
        .select("url_fichier_storage")
        .eq("id", ebookId)
        .single();

      if (!ebook || !ebook.url_fichier_storage) {
        return res.status(404).json({ error: "Fichier d'ebook non trouvé sur notre serveur." });
      }

      // Generate a signed URL for the private bucket "ebooks-fichiers" that expires in 60 seconds
      // Path format should match your storage: e.g. "my-folder/ebook.pdf" or just "ebook.pdf"
      const bucketName = "ebooks-fichiers";
      const { data: signedUrlData, error: storageErr } = await client.storage
        .from(bucketName)
        .createSignedUrl(ebook.url_fichier_storage, 60);

      if (storageErr || !signedUrlData) {
        throw storageErr || new Error("Échec de la génération du lien sécurisé.");
      }

      return res.json({
        url: signedUrlData.signedUrl,
        expiresIn: 60,
        filename: ebook.url_fichier_storage,
      });
    } catch (err: any) {
      console.error("Download signer error:", err);
      return res.status(500).json({ error: "Une erreur est survenue lors de la signature : " + err.message });
    }
  } else {
    // Simulator Mode
    const ebook = mockEbooks.find(eb => eb.id === ebookId);
    if (!ebook) {
      return res.status(404).json({ error: "Ebook non trouvé" });
    }

    // Check if purchased in mock memory
    const tokenParts = token.split("-");
    const isAdmin = token.includes("admin");
    const userId = isAdmin ? "mock-user-123" : "mock-user-456";

    const hasPurchase = mockAchats.some(
      a => a.user_id === userId && a.ebook_id === ebookId && a.statut === "paid"
    );

    if (!hasPurchase) {
      return res.status(403).json({ error: "Achat non trouvé dans le simulateur ou statut non payé." });
    }

    // Return a beautiful simulation PDF download URL
    return res.json({
      url: `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`, // A harmless public sample PDF
      expiresIn: 60,
      filename: ebook.url_fichier_storage,
      isSimulated: true,
    });
  }
});


// ==========================================
// VITE AND STATIC ASSETS HANDLERS
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite Dev Middleware Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Static Files serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));

    // Support client SPA routing fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started. Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
