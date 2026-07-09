import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Enable CORS for frontend clients (e.g. Cloudflare Pages or custom domains)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

const PORT = 3000;

// ==========================================
// SUPABASE CLIENT INITIALIZATION (FAIL-CLOSED)
// ==========================================
let supabaseClient: any = null;

function getSupabase(): any {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Configuration manquante : VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY n'est pas définie.");
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

// Helper to determine if we are in real Supabase production mode
function isProductionMode() {
  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return !!(url && key);
  } catch {
    return false;
  }
}

// Middleware to verify if the requesting user has the 'admin' role
async function verifyAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Accès non autorisé : Token manquant." });
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const client = getSupabase();
    const { data: { user }, error: userErr } = await client.auth.getUser(token);
    if (userErr || !user) {
      return res.status(401).json({ error: "Session d'administration invalide ou expirée." });
    }

    if (user.email === "techsen237@gmail.com") {
      return next(); // Always allow the super-admin email
    }

    const { data: profile, error: profileErr } = await client
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      return res.status(500).json({ error: "Erreur lors de la vérification du profil d'administration." });
    }

    if (profile?.role === "admin") {
      return next();
    }

    return res.status(403).json({ error: "Accès refusé. Droits d'administrateur requis." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Check configuration status & diagnose missing environment variables
app.get("/api/config-status", async (req, res) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? "Configuré" : "";
  const moneyfusionUrl = process.env.MONEYFUSION_API_URL || "";

  let supabaseUrlStatus = "Non configuré";
  let supabaseServiceKeyStatus = "Non configuré";
  let moneyfusionStatus = "Non configuré";

  const missingServerVars: string[] = [];
  if (!supabaseUrl) missingServerVars.push("VITE_SUPABASE_URL");
  if (!supabaseServiceKey) missingServerVars.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!moneyfusionUrl) missingServerVars.push("MONEYFUSION_API_URL");

  // 1. Live Check Supabase and Key connection
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const client = getSupabase();
      // Probe by selecting 1 row from ebooks (safely proves endpoint & service role bypass are working)
      const { data, error } = await client
        .from("ebooks")
        .select("id")
        .limit(1);

      if (error) {
        supabaseUrlStatus = `Erreur : ${error.message}`;
        supabaseServiceKeyStatus = `Erreur : ${error.message}`;
      } else {
        supabaseUrlStatus = `${supabaseUrl} (Connecté)`;
        supabaseServiceKeyStatus = "Connecté (Service Role Actif)";
      }
    } catch (err: any) {
      supabaseUrlStatus = `Erreur de connexion : ${err.message || err}`;
      supabaseServiceKeyStatus = `Erreur : ${err.message || err}`;
    }
  } else {
    if (!supabaseUrl) supabaseUrlStatus = "Erreur : URL manquante";
    if (!supabaseServiceKey) supabaseServiceKeyStatus = "Erreur : Clé de service manquante";
  }

  // 2. Live Check MoneyFusion endpoint
  if (moneyfusionUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const probeRes = await fetch(moneyfusionUrl, {
        method: "GET",
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Any HTTP response means the host resolved and responded
      moneyfusionStatus = `${moneyfusionUrl} (Connecté)`;
    } catch (err: any) {
      if (err.name === "AbortError") {
        moneyfusionStatus = `${moneyfusionUrl} (Erreur : Délai d'attente de connexion dépassé)`;
      } else {
        moneyfusionStatus = `${moneyfusionUrl} (Erreur de connexion)`;
      }
    }
  } else {
    moneyfusionStatus = "Erreur : URL MoneyFusion manquante";
  }

  res.json({
    supabaseUrl: supabaseUrlStatus,
    supabaseServiceKey: supabaseServiceKeyStatus,
    moneyfusionUrl: moneyfusionStatus,
    isRealProduction: missingServerVars.length === 0 && !supabaseServiceKeyStatus.includes("Erreur"),
    missingServerVars,
  });
});

// 1. Catalogue d'ebooks (List ebooks)
app.get("/api/ebooks", async (req, res) => {
  try {
    const client = getSupabase();
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
});

// Add ebook (Admin role)
app.post("/api/ebooks", verifyAdmin, async (req, res) => {
  const { titre, description, prix, url_couverture, url_fichier_storage, categorie } = req.body;

  if (!titre || !description || !prix || !url_couverture || !url_fichier_storage || !categorie) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  }

  try {
    const client = getSupabase();
    const { data, error } = await client
      .from("ebooks")
      .insert([{ titre, description, prix: Number(prix), url_couverture, url_fichier_storage, categorie }])
      .select();

    if (error) throw error;
    return res.status(201).json(data[0]);
  } catch (err: any) {
    console.error("Supabase insert ebook error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Delete ebook (Admin role)
app.delete("/api/ebooks/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const client = getSupabase();
    const { error } = await client.from("ebooks").delete().eq("id", id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Supabase delete ebook error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Get profile and purchases of connected user
app.get("/api/user-data", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const client = getSupabase();
    
    // Decode user auth via Supabase
    const { data: { user }, error: authErr } = await client.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ error: "Token invalide ou expiré" });
    }

    // Fetch Profile safely using maybeSingle to avoid throwing exceptions
    const { data: profile, error: profileErr } = await client
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      console.warn("Could not fetch profile, falling back to 'user':", profileErr.message);
    }

    // Fetch Purchases with joined ebook info
    const { data: purchases } = await client
      .from("achats")
      .select("*, ebook:ebook_id(*)")
      .eq("user_id", user.id);

    // Hardcoded fallback for the admin email to guarantee back-office access
    let finalRole = profile?.role || "user";
    if (user.email === "techsen237@gmail.com") {
      finalRole = "admin";
    }

    return res.json({
      user: { id: user.id, email: user.email },
      role: finalRole,
      purchases: purchases || [],
    });
  } catch (err: any) {
    console.error("Supabase user-data fetch error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Fetch transaction history (Admin only)
app.get("/api/transactions", verifyAdmin, async (req, res) => {
  try {
    const client = getSupabase();
    const { data, error } = await client
      .from("achats")
      .select("*, ebook:ebook_id(titre)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    console.error("Supabase fetch transactions error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 2. Création d'une demande de paiement MoneyFusion
app.post("/api/payments/create", async (req, res) => {
  const { ebookId, userId, numeroSend, nomclient, userEmail } = req.body;

  if (!ebookId || !userId || !numeroSend || !nomclient) {
    return res.status(400).json({ error: "Informations manquantes." });
  }

  const client = getSupabase();
  const moneyfusionApiUrl = process.env.MONEYFUSION_API_URL;

  if (!moneyfusionApiUrl) {
    return res.status(500).json({ error: "Service de paiement MoneyFusion non configuré (MONEYFUSION_API_URL manquant)." });
  }

  try {
    // Find price of ebook
    const { data: ebook } = await client
      .from("ebooks")
      .select("prix, titre")
      .eq("id", ebookId)
      .single();

    if (!ebook) {
      return res.status(404).json({ error: "Ebook non trouvé" });
    }
    const price = Number(ebook.prix);
    const ebookTitle = ebook.titre;

    const orderId = "order_" + Math.random().toString(36).substr(2, 9);
    const tokenPay = "mf_tok_" + Math.random().toString(36).substr(2, 14);

    // Register the transaction entry with status 'pending'
    const { error: insertErr } = await client.from("achats").insert([
      {
        user_id: userId,
        ebook_id: ebookId,
        token_pay: tokenPay,
        statut: "pending",
        montant: price,
      }
    ]);
    if (insertErr) throw insertErr;

    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

    // Build MoneyFusion payload as specified in documentation
    const payload = {
      totalPrice: price,
      article: [{ [ebookTitle]: price }],
      personal_Info: [{ userId, orderId, ebookId }],
      numeroSend,
      nomclient,
      return_url: "https://ebookstore-73b.pages.dev/?payment=success",
      webhook_url: `${appUrl}/api/webhook/moneyfusion`,
    };

    console.log("Sending real payment request to MoneyFusion API:", moneyfusionApiUrl, payload);
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
        await client
          .from("achats")
          .update({ token_pay: returnedToken })
          .eq("token_pay", tokenPay);
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
    console.error("MoneyFusion payment creation error:", err);
    return res.status(502).json({ error: "Erreur de communication avec la plateforme de paiement : " + err.message });
  }
});

// 3. Webhook MoneyFusion (`POST /api/webhook/moneyfusion`)
app.post("/api/webhook/moneyfusion", async (req, res) => {
  const payload = req.body;
  console.log("RECEIVED MONEYFUSION WEBHOOK:", JSON.stringify(payload, null, 2));

  const { event, tokenPay } = payload;

  if (!tokenPay) {
    return res.status(400).json({ error: "tokenPay requis" });
  }

  try {
    const client = getSupabase();

    // Find transaction
    const { data: existingAchat } = await client
      .from("achats")
      .select("*")
      .eq("token_pay", tokenPay)
      .maybeSingle();

    if (!existingAchat) {
      console.warn(`Webhook Error: Transaction with tokenPay ${tokenPay} not found in database.`);
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
    const { error: updateErr } = await client
      .from("achats")
      .update({ statut: targetStatus })
      .eq("token_pay", tokenPay);

    if (updateErr) throw updateErr;
    console.log(`Transaction ${tokenPay} status updated to ${targetStatus} in Supabase.`);
    return res.json({ message: "Statut mis à jour avec succès", success: true });
  } catch (err: any) {
    console.error("Database update error during webhook:", err);
    return res.status(500).json({ error: "Erreur de mise à jour de la transaction : " + err.message });
  }
});

// 4. Vérification de statut (GET /api/payments/status/:token)
app.get("/api/payments/status/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const client = getSupabase();

    const { data: existingAchat } = await client
      .from("achats")
      .select("*, ebook:ebook_id(*)")
      .eq("token_pay", token)
      .maybeSingle();

    if (!existingAchat) {
      return res.status(404).json({ error: "Transaction non trouvée" });
    }

    // Query MoneyFusion server directly to sync statuses if pending
    const moneyfusionUrl = process.env.MONEYFUSION_API_URL;
    if (existingAchat.statut === "pending" && moneyfusionUrl) {
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
            await client
              .from("achats")
              .update({ statut: targetStatus })
              .eq("token_pay", token);
          }
        }
      } catch (err) {
        console.error("Failed to fetch direct status from MoneyFusion endpoint:", err);
      }
    }

    return res.json(existingAchat);
  } catch (err: any) {
    console.error("Error checking payment status:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 5. Génération d'URL de téléchargement sécurisée et signée Supabase Storage
app.get("/api/download/:ebookId", async (req, res) => {
  const { ebookId } = req.params;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Veuillez vous connecter pour télécharger cet ebook." });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const client = getSupabase();
    
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
    const bucketName = "ebooks-fichiers";
    console.log(`[DOWNLOAD DEBUG] Génération URL signée - Bucket: "${bucketName}", Path du fichier: "${ebook.url_fichier_storage}"`);
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
      const indexExist = fs.existsSync(path.join(distPath, "index.html"));
      const fallbackFile = indexExist ? "index.html" : "app.html";
      res.sendFile(path.join(distPath, fallbackFile));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started. Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
