import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGoogleGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Configuration manquante : GEMINI_API_KEY n'est pas définie dans l'environnement.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Enable CORS
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
// SUPABASE CLIENT INITIALIZATION
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

// Middleware to verify user token and populate req.user
async function verifyUser(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authentification requise : Token manquant." });
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Session invalide ou expirée." });
    }
    req.user = user;
    req.token = token;
    next();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// Middleware to verify moderator role
async function verifyModerator(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Accès non autorisé : Token manquant." });
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const supabase = getSupabase();
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return res.status(401).json({ error: "Session expirée." });
    }

    req.user = user;
    if (user.email === "techsen237@gmail.com") {
      return next(); // Super Admin
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "moderator" || profile?.role === "admin") {
      return next();
    }

    return res.status(403).json({ error: "Droits de modérateur requis." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// Middleware to verify admin role
async function verifyAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Accès non autorisé : Token manquant." });
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const supabase = getSupabase();
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return res.status(401).json({ error: "Session expirée." });
    }

    req.user = user;
    if (user.email === "techsen237@gmail.com") {
      return next(); // Super Admin
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "admin") {
      return next();
    }

    return res.status(403).json({ error: "Droits d'administrateur requis." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// Helper to log admin actions
async function logAdminAction(actorId: string, action: string, targetType?: string, targetId?: string, details?: any) {
  try {
    const supabase = getSupabase();
    await supabase.from("admin_actions_log").insert({
      actor_id: actorId,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      details: details || null
    });
  } catch (err) {
    console.error("Failed to log admin action:", err);
  }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Config status diagnostic
app.get("/api/config-status", async (req, res) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? "Configuré" : "";
  const moneyfusionUrl = process.env.MONEYFUSION_API_URL || "";
  const aiJobUrl = process.env.AI_JOB_GENERATION_API_URL || "";

  let supabaseStatus = "Non connecté";
  let moneyfusionStatus = "Non configuré";

  if (supabaseUrl && supabaseServiceKey) {
    try {
      const client = getSupabase();
      const { error } = await client.from("profiles").select("id").limit(1);
      if (error) {
        supabaseStatus = `Erreur : ${error.message}`;
      } else {
        supabaseStatus = "Connecté (Service Role Actif)";
      }
    } catch (err: any) {
      supabaseStatus = `Erreur de connexion : ${err.message || err}`;
    }
  }

  if (moneyfusionUrl) {
    moneyfusionStatus = `${moneyfusionUrl} (Configuré)`;
  }

  res.json({
    supabaseUrl,
    supabaseStatus,
    moneyfusionStatus,
    aiJobUrl,
    isRealProduction: supabaseStatus.includes("Connecté") && !!moneyfusionUrl
  });
});

// Get user profile & recruiter data
app.get("/api/user-data", verifyUser, async (req: any, res) => {
  try {
    const supabase = getSupabase();
    const userId = req.user.id;

    // Load Profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    // Fetch recruiter profile
    const { data: recruiterProfile } = await supabase
      .from("recruiter_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    // Check superadmin email overriding
    let finalRole = profile?.role || "user";
    if (req.user.email === "techsen237@gmail.com") {
      finalRole = "admin";
    }

    return res.json({
      user: { id: userId, email: req.user.email },
      role: finalRole,
      profile: profile || { id: userId, role: finalRole },
      recruiterProfile
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RECRUITER PROFILES
// ==========================================

// Get recruiter profile
app.get("/api/recruiter/profile", verifyUser, async (req: any, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("recruiter_profiles")
      .select("*")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create or update recruiter profile
app.post("/api/recruiter/profile", verifyUser, async (req: any, res) => {
  const { nom_entreprise, secteur, site_web, description, logo_url, verification_documents } = req.body;

  if (!nom_entreprise || !secteur || !description) {
    return res.status(400).json({ error: "Le nom de l'entreprise, le secteur et la description sont requis." });
  }

  try {
    const supabase = getSupabase();

    // Check if profile exists to determine if we overwrite verification_status
    const { data: existing } = await supabase
      .from("recruiter_profiles")
      .select("verification_status")
      .eq("id", req.user.id)
      .maybeSingle();

    const status = existing ? existing.verification_status : "pending";

    const payload = {
      id: req.user.id,
      nom_entreprise,
      secteur,
      site_web: site_web || null,
      description,
      logo_url: logo_url || null,
      verification_status: status,
      verification_documents: verification_documents || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("recruiter_profiles")
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;

    // Automatically trigger role update to 'recruiter' if user role is 'user'
    const { data: currentProf } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", req.user.id)
      .maybeSingle();

    if (currentProf?.role === "user") {
      await supabase
        .from("profiles")
        .update({ role: "recruiter" })
        .eq("id", req.user.id);
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get candidates matching recruiter's posted offers
app.get("/api/recruiter/candidates", verifyUser, async (req: any, res) => {
  try {
    const supabase = getSupabase();

    // Fetch active job offers posted by recruiter
    const { data: offers } = await supabase
      .from("job_offers")
      .select("competences, secteur")
      .eq("recruiter_id", req.user.id)
      .eq("statut", "active");

    // Fetch public CVs
    const { data: cvs, error } = await supabase
      .from("cvs")
      .select("*")
      .eq("is_public", true);

    if (error) throw error;

    if (!offers || offers.length === 0) {
      // Just return standard order CVs
      return res.json(cvs || []);
    }

    // Match algorithm: prioritize CVs that have matching sector or competencies
    const matchedCvs = (cvs || []).map((cv: any) => {
      let score = 0;
      const cvComps = cv.competences || cv.data?.competences || [];

      for (const offer of offers) {
        if (cv.secteur && offer.secteur && cv.secteur.toLowerCase() === offer.secteur.toLowerCase()) {
          score += 10;
        }
        const offerComps = offer.competences || [];
        const overlap = cvComps.filter((c: string) => offerComps.some((o: string) => o.toLowerCase() === c.toLowerCase()));
        score += overlap.length * 5;
      }

      return { ...cv, score };
    }).sort((a: any, b: any) => b.score - a.score);

    return res.json(matchedCvs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// JOB OFFERS
// ==========================================

// Get all active & approved job offers
app.get("/api/jobs", async (req, res) => {
  try {
    const supabase = getSupabase();
    // Public offers: active status AND approved moderation status
    const { data, error } = await supabase
      .from("job_offers")
      .select("*, recruiter:recruiter_profiles(*)")
      .eq("statut", "active")
      .eq("moderation_status", "approved")
      .order("is_boosted", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get recruiter's own job offers
app.get("/api/jobs/my", verifyUser, async (req: any, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("job_offers")
      .select("*")
      .eq("recruiter_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Single job detail (and increment views)
app.get("/api/jobs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("job_offers")
      .select("*, recruiter:recruiter_profiles(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "Offre d'emploi introuvable." });
    }

    // Increment views asynchronously
    await supabase.rpc("increment_job_views", { job_id: id }).catch(() => {
      // Fallback update if RPC not present
      supabase.from("job_offers").update({ vues: (data.vues || 0) + 1 }).eq("id", id);
    });

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create/Update Job Offer
app.post("/api/jobs", verifyUser, async (req: any, res) => {
  const {
    id,
    titre,
    description,
    entreprise,
    lieu,
    secteur,
    type_contrat,
    remote,
    salaire_min,
    salaire_max,
    devise,
    competences,
    statut,
  } = req.body;

  if (!titre || !description || !entreprise || !lieu || !secteur || !type_contrat) {
    return res.status(400).json({ error: "Tous les champs principaux de l'offre d'emploi sont obligatoires." });
  }

  try {
    const supabase = getSupabase();

    // Verify company profile is set
    const { data: recProfile } = await supabase
      .from("recruiter_profiles")
      .select("verification_status")
      .eq("id", req.user.id)
      .maybeSingle();

    if (!recProfile) {
      return res.status(403).json({ error: "Veuillez configurer votre fiche entreprise avant de publier." });
    }

    // A recruiter can only publish active offers if they are verified
    if (statut === "active" && recProfile.verification_status !== "verified") {
      return res.status(403).json({ error: "Votre entreprise n'est pas encore vérifiée par un modérateur. Vous pouvez enregistrer l'offre en 'brouillon' (draft)." });
    }

    // Generate unique slug
    const cleanSlug = titre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).substring(2, 7);

    const payload = {
      recruiter_id: req.user.id,
      titre,
      slug: cleanSlug,
      description,
      entreprise,
      lieu,
      secteur,
      type_contrat,
      remote: !!remote,
      salaire_min: salaire_min ? Number(salaire_min) : null,
      salaire_max: salaire_max ? Number(salaire_max) : null,
      devise: devise || "XAF",
      competences: competences || [],
      statut: statut || "draft",
      moderation_status: statut === "active" ? "pending" : "approved", // published starts in pending
      updated_at: new Date().toISOString()
    };

    let result;
    if (id) {
      // Update
      const { data, error } = await supabase
        .from("job_offers")
        .update(payload)
        .eq("id", id)
        .eq("recruiter_id", req.user.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from("job_offers")
        .insert([{ ...payload, id: undefined, created_at: new Date().toISOString() }])
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Apply to a Job Offer
app.post("/api/jobs/:id/apply", verifyUser, async (req: any, res) => {
  const { id } = req.params;
  const { cv_id, bio_id, message } = req.body;

  try {
    const supabase = getSupabase();

    // Verify job exists
    const { data: job } = await supabase
      .from("job_offers")
      .select("id, titre")
      .eq("id", id)
      .maybeSingle();

    if (!job) {
      return res.status(404).json({ error: "Offre d'emploi introuvable." });
    }

    // Check unique constraint (user can apply only once per job)
    const { data: existingApp } = await supabase
      .from("job_applications")
      .select("id")
      .eq("job_offer_id", id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (existingApp) {
      return res.status(400).json({ error: "Vous avez déjà postulé à cette offre." });
    }

    const payload = {
      job_offer_id: id,
      user_id: req.user.id,
      cv_id: cv_id || null,
      bio_id: bio_id || null,
      message: message || "",
      statut: "envoyee",
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("job_applications")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Report a Job Offer
app.post("/api/jobs/:id/report", verifyUser, async (req: any, res) => {
  const { id } = req.params;
  const { raison } = req.body;

  if (!raison) {
    return res.status(400).json({ error: "Veuillez fournir une raison pour le signalement." });
  }

  try {
    const supabase = getSupabase();
    const payload = {
      job_offer_id: id,
      reporter_user_id: req.user.id,
      raison,
      statut: "open",
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("job_offer_reports")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    // Check count of open reports for this job. If > 3, return offer back to pending moderation
    const { data: countData } = await supabase
      .from("job_offer_reports")
      .select("id", { count: "exact" })
      .eq("job_offer_id", id)
      .eq("statut", "open");

    const count = countData ? countData.length : 0;
    if (count >= 3) {
      await supabase
        .from("job_offers")
        .update({ moderation_status: "pending", moderation_note: "Offre temporairement suspendue suite à de multiples signalements." })
        .eq("id", id);
    }

    return res.json({ success: true, report: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// CANDIDATURES (JOB APPLICATIONS)
// ==========================================

// Candidate: List my applications
app.get("/api/applications/my", verifyUser, async (req: any, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("job_applications")
      .select("*, job_offer:job_offers(*)")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Recruiter: List applications received
app.get("/api/applications/recruiter", verifyUser, async (req: any, res) => {
  try {
    const supabase = getSupabase();

    // Fetch recruiter's offers
    const { data: offers } = await supabase
      .from("job_offers")
      .select("id")
      .eq("recruiter_id", req.user.id);

    if (!offers || offers.length === 0) {
      return res.json([]);
    }

    const offerIds = offers.map((o: any) => o.id);

    // Fetch applications linked to recruiter's offers
    const { data: apps, error } = await supabase
      .from("job_applications")
      .select("*, job_offer:job_offers(*), cv:cvs(*), bio:bios(*)")
      .in("job_offer_id", offerIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Mark apps as 'vue' if they are 'envoyee' when recruiter queries them
    const pendingIds = apps.filter((a: any) => a.statut === "envoyee").map((a: any) => a.id);
    if (pendingIds.length > 0) {
      await supabase
        .from("job_applications")
        .update({ statut: "vue" })
        .in("id", pendingIds);
    }

    return res.json(apps);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Recruiter: Update application status
app.post("/api/applications/:id/status", verifyUser, async (req: any, res) => {
  const { id } = req.params;
  const { statut } = req.body; // 'acceptee' | 'refusee' | 'vue'

  if (!["acceptee", "refusee", "vue"].includes(statut)) {
    return res.status(400).json({ error: "Statut invalide." });
  }

  try {
    const supabase = getSupabase();

    // Verify the applicant's offer belongs to the requesting recruiter
    const { data: application } = await supabase
      .from("job_applications")
      .select("*, job_offer:job_offers(recruiter_id)")
      .eq("id", id)
      .maybeSingle();

    if (!application) {
      return res.status(404).json({ error: "Candidature introuvable." });
    }

    if (application.job_offer?.recruiter_id !== req.user.id) {
      return res.status(403).json({ error: "Non autorisé à modifier cette candidature." });
    }

    const { data, error } = await supabase
      .from("job_applications")
      .update({ statut })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// MODERATOR / ADMIN INTERFACES
// ==========================================

// Moderator/Admin: List recruiters for validation
app.get("/api/moderator/recruiters", verifyModerator, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("recruiter_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Moderator/Admin: Verify recruiter
app.post("/api/moderator/recruiters/:id/verify", verifyModerator, async (req: any, res) => {
  const { id } = req.params;
  const { verification_status, verification_note } = req.body; // 'verified' | 'rejected'

  if (!["verified", "rejected"].includes(verification_status)) {
    return res.status(400).json({ error: "Statut de vérification invalide." });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("recruiter_profiles")
      .update({
        verification_status,
        verification_note: verification_note || null,
        verified_at: verification_status === "verified" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(req.user.id, `Vérification recruteur : ${verification_status}`, "recruiter_profiles", id, { verification_note });

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Moderator/Admin: List offers for moderation
app.get("/api/moderator/offers", verifyModerator, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("job_offers")
      .select("*, recruiter:recruiter_profiles(*)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Moderator/Admin: Moderation of job offer
app.post("/api/moderator/offers/:id/verify", verifyModerator, async (req: any, res) => {
  const { id } = req.params;
  const { moderation_status, moderation_note } = req.body; // 'approved' | 'rejected'

  if (!["approved", "rejected"].includes(moderation_status)) {
    return res.status(400).json({ error: "Statut de modération invalide." });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("job_offers")
      .update({
        moderation_status,
        moderation_note: moderation_note || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(req.user.id, `Modération offre d'emploi : ${moderation_status}`, "job_offers", id, { moderation_note });

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Moderator/Admin: List reports
app.get("/api/moderator/reports", verifyModerator, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("job_offer_reports")
      .select("*, job_offer:job_offers(*)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Moderator/Admin: Resolve report
app.post("/api/moderator/reports/:id/resolve", verifyModerator, async (req: any, res) => {
  const { id } = req.params;
  const { statut } = req.body; // 'resolved' | 'dismissed'

  if (!["resolved", "dismissed"].includes(statut)) {
    return res.status(400).json({ error: "Statut invalide." });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("job_offer_reports")
      .update({ statut })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(req.user.id, `Résolution de signalement : ${statut}`, "job_offer_reports", id);

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// ADMIN: ROLE MANAGEMENT & AUDIT LOGS
// ==========================================

// Admin: Invite user to a role
app.post("/api/admin/invite", verifyAdmin, async (req: any, res) => {
  const { email, role_invited } = req.body;

  if (!email || !role_invited || !["recruiter", "moderator", "admin"].includes(role_invited)) {
    return res.status(400).json({ error: "Email et rôle invité (recruiter|moderator|admin) requis." });
  }

  try {
    const supabase = getSupabase();
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const payload = {
      email,
      role_invited,
      invited_by: req.user.id,
      token,
      status: "pending",
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("admin_invitations")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    // Send invitation email using Supabase Auth Admin API if user does not exist
    try {
      await supabase.auth.admin.inviteUserByEmail(email);
    } catch (e: any) {
      console.warn("Could not invite user via Supabase auth admin, user might already exist:", e.message);
    }

    await logAdminAction(req.user.id, `Création d'invitation pour : ${email}`, "admin_invitations", data.id, { role_invited });

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: List invitations
app.get("/api/admin/invitations", verifyAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("admin_invitations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: Revoke invitation
app.post("/api/admin/invitations/:id/revoke", verifyAdmin, async (req: any, res) => {
  const { id } = req.params;
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("admin_invitations")
      .update({ status: "revoked" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(req.user.id, `Révocation invitation`, "admin_invitations", id);

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: Audit actions log
app.get("/api/admin/actions-log", verifyAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("admin_actions_log")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: Get all profiles
app.get("/api/admin/roles", verifyAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: Change user role
app.post("/api/admin/roles/:id", verifyAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { role } = req.body; // 'user' | 'recruiter' | 'moderator' | 'admin'

  if (!["user", "recruiter", "moderator", "admin"].includes(role)) {
    return res.status(400).json({ error: "Rôle invalide." });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(req.user.id, `Mise à jour rôle : ${role}`, "profiles", id);

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// AI-POWERED JOB DESCRIPTION REFINE (NGROK / GEMINI)
// ==========================================
app.post("/api/job/generate-desc", verifyUser, async (req, res) => {
  const { points_bruts, poste, entreprise } = req.body;

  if (!points_bruts || !poste || !entreprise) {
    return res.status(400).json({ error: "Les points bruts, le poste et l'entreprise sont requis." });
  }

  // Attempt external endpoint if configured
  const extApiUrl = process.env.AI_JOB_GENERATION_API_URL;
  if (extApiUrl) {
    try {
      console.log(`Forwarding AI job generation to external ngrok: ${extApiUrl}`);
      const response = await fetch(extApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points_bruts, poste, entreprise })
      });

      if (response.ok) {
        const body = await response.json();
        return res.json({ titre: body.titre, description: body.description });
      }
      console.warn("External AI job API returned error code:", response.status);
    } catch (err) {
      console.warn("Could not connect to external AI job API, falling back to local Gemini:", err);
    }
  }

  // Fallback: Gemini 3.5 Flash direct call
  try {
    const ai = getGoogleGenAI();
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

    const aiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    let rawText = aiResponse.text?.trim() || "";
    // strip markdown wrappers if AI didn't follow the instructions
    if (rawText.startsWith("```json")) {
      rawText = rawText.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const result = JSON.parse(rawText);
    return res.json({ titre: result.titre, description: result.description });
  } catch (err: any) {
    console.error("Gemini description generation error:", err);
    return res.status(500).json({ error: "Échec de l'assistance de rédaction par l'IA : " + err.message });
  }
});


// ==========================================
// CV PROFESSIONAL SUMMARY (GEMINI)
// ==========================================
app.post("/api/cv/generate-summary", verifyUser, async (req: any, res) => {
  const { data } = req.body;

  if (!data) {
    return res.status(400).json({ error: "Les données du CV sont manquantes." });
  }

  try {
    const { nom, titre, competences, experiences, formation } = data;
    
    const prompt = `Tu es un expert en recrutement et en rédaction de CV professionnels de haut niveau pour le marché de l'emploi technologique en Afrique.
Ta mission est de rédiger un résumé ou une accroche professionnelle percutante, inspirante et de qualité supérieure pour le CV suivant.

Informations du candidat :
- Nom : ${nom || "Non spécifié"}
- Titre professionnel visé : ${titre || "Développeur / Professionnel de la Tech"}

Compétences clés :
${competences && competences.length > 0 ? competences.join(", ") : "Non spécifiées"}

Expériences professionnelles :
${experiences && experiences.length > 0 ? experiences.map((exp: any) => `- ${exp.poste} chez ${exp.entreprise} (${exp.date_debut} à ${exp.date_fin}) : ${exp.description}`).join("\n") : "Non spécifiées"}

Formations et diplômes :
${formation && formation.length > 0 ? formation.map((form: any) => `- ${form.diplome} à ${form.ecole} (Année: ${form.annee})`).join("\n") : "Non spécifiées"}

Directives strictes :
1. Rédige un paragraphe unique, fluide et captivant (environ 3 à 4 phrases, maximum 150 mots).
2. Adopte un ton professionnel, dynamique et confiant qui valorise l'expertise locale et le potentiel du candidat.
3. Mets en avant la synergie entre les compétences techniques et l'expérience pratique.
4. Rédige exclusivement en français.
5. Ne mets aucun titre, aucune introduction (comme "Voici le résumé :"), aucun commentaire ou métadonnée. Donne UNIQUEMENT le texte final rédigé.
`;

    const ai = getGoogleGenAI();
    const aiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const summary = aiResponse.text?.trim() || "";
    return res.json({ summary });
  } catch (err: any) {
    console.error("Gemini summary generation error:", err);
    return res.status(500).json({ error: "Échec de la génération du résumé par l'IA : " + err.message });
  }
});


// ==========================================
// MONEYFUSION MOBILE MONEY BOOST SYSTEM
// ==========================================

// Create Boost Payment Request
app.post("/api/boost/create", verifyUser, async (req: any, res) => {
  const { target_type, target_id, numeroSend, nomclient, montant } = req.body;

  if (!target_type || !target_id || !numeroSend || !nomclient || !montant) {
    return res.status(400).json({ error: "Tous les champs de paiement (cible, téléphone, nom, montant) sont requis." });
  }

  const mfUrl = process.env.MONEYFUSION_API_URL;
  if (!mfUrl) {
    return res.status(501).json({ error: "Service de paiement MoneyFusion non configuré." });
  }

  try {
    const supabase = getSupabase();
    
    // Check if there is already an active boost for this target
    const { data: existingBoost } = await supabase
      .from("boosts")
      .select("id")
      .eq("target_type", target_type)
      .eq("target_id", target_id)
      .eq("statut", "paid")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingBoost) {
      return res.status(400).json({ error: "Ce contenu possède déjà un Boost actif." });
    }

    // Insert pending boost transaction record
    const tokenPay = "BOOST-" + Math.random().toString(36).substring(2, 12).toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default 7 days

    const { error: insertErr } = await supabase.from("boosts").insert([{
      user_id: req.user.id,
      target_type,
      target_id,
      token_pay: tokenPay,
      statut: "pending",
      montant: Number(montant),
      duree_jours: 7,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    }]);

    if (insertErr) throw insertErr;

    // Call external MoneyFusion payment API
    const webhookUrl = `${process.env.SITE_URL || process.env.APP_URL || "https://ebookstore-73b.pages.dev"}/api/webhook/moneyfusion`;
    const callbackUrl = `${process.env.SITE_URL || process.env.APP_URL || "https://ebookstore-73b.pages.dev"}/?boost=success`;

    const payload = {
      totalPrice: Number(montant),
      article: [{ "Boost 7 jours": Number(montant) }],
      personal_Info: [{ userId: req.user.id, boostId: target_id, targetType: target_type }],
      numeroSend,
      nomclient,
      return_url: callbackUrl,
      webhook_url: webhookUrl
    };

    console.log("Sending boost request to MoneyFusion API:", mfUrl);

    const mfResponse = await fetch(mfUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!mfResponse.ok) {
      const errText = await mfResponse.text();
      return res.status(502).json({ error: "Échec de la communication avec MoneyFusion : " + errText });
    }

    const body = await mfResponse.json();
    return res.json({
      statut: true,
      token: tokenPay,
      url: body.url || callbackUrl // return payment redirection url
    });
  } catch (err: any) {
    console.error("Boost creation failed:", err);
    return res.status(500).json({ error: "Échec de l'initialisation du Boost : " + err.message });
  }
});

// MoneyFusion Webhook Notification
app.post("/api/webhook/moneyfusion", async (req, res) => {
  const { event, personal_Info, tokenPay, Montant } = req.body;

  console.log("MoneyFusion webhook received payload:", JSON.stringify(req.body));

  if (!tokenPay) {
    return res.status(400).json({ error: "tokenPay manquant" });
  }

  try {
    const supabase = getSupabase();

    // Check if this transaction is already processed to avoid duplicates
    const { data: existingBoost } = await supabase
      .from("boosts")
      .select("statut, target_type, target_id, user_id, duree_jours")
      .eq("token_pay", tokenPay)
      .maybeSingle();

    if (!existingBoost) {
      console.warn("Webhook transaction tokenPay not found in local boosts log:", tokenPay);
      return res.status(404).json({ error: "Boost transaction not found." });
    }

    // Ignore if already paid or failed
    if (existingBoost.statut === "paid") {
      console.log("Transaction already processed. Ignoring notification duplicate.");
      return res.json({ status: "ignored_duplicate" });
    }

    const { target_type, target_id, user_id, duree_jours } = existingBoost;

    if (event === "payin.session.completed") {
      // 1. Update boost record to paid
      await supabase
        .from("boosts")
        .update({ statut: "paid" })
        .eq("token_pay", tokenPay);

      // 2. Set boosted flags on targeted item
      const expiryDate = new Date(Date.now() + (duree_jours || 7) * 24 * 60 * 60 * 1000).toISOString();
      let updateTable = "";
      if (target_type === "cv") updateTable = "cvs";
      else if (target_type === "bio") updateTable = "bios";
      else if (target_type === "job_offer") updateTable = "job_offers";

      if (updateTable) {
        const { error: boostErr } = await supabase
          .from(updateTable)
          .update({
            is_boosted: true,
            boosted_until: expiryDate
          })
          .eq("id", target_id);

        if (boostErr) {
          console.error(`Failed to apply boosted flag on ${updateTable}:`, boostErr.message);
        } else {
          console.log(`Successfully activated Boost on ${updateTable} ID ${target_id} until ${expiryDate}`);
        }
      }

      await logAdminAction(user_id, `Activation Boost payé`, target_type, target_id, { tokenPay, Montant });
    } else if (event === "payin.session.cancelled") {
      await supabase
        .from("boosts")
        .update({ statut: "failed" })
        .eq("token_pay", tokenPay);
    }

    return res.json({ status: "success" });
  } catch (err: any) {
    console.error("Webhook processing failed:", err);
    return res.status(500).json({ error: err.message });
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
    console.log(`Recruitment Server started. Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
