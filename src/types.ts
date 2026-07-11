export interface Profile {
  id: string;
  role: 'user' | 'recruiter' | 'moderator' | 'admin';
  email?: string;
  secteur_interet?: string | null;
  competences_interet?: string[] | null;
  lieu_preference?: string | null;
  updated_at?: string;
}

export interface Experience {
  entreprise: string;
  poste: string;
  date_debut: string;
  date_fin: string;
  description: string;
}

export interface Formation {
  ecole: string;
  diplome: string;
  annee: string;
}

export interface CVData {
  nom: string;
  titre: string;
  photo: string;
  competences: string[];
  experiences: Experience[];
  formation: Formation[];
}

export interface CV {
  id: string;
  user_id: string;
  reference: string;
  data: CVData;
  summary: string;
  pdf_url: string;
  is_public: boolean;
  visibility: 'private' | 'public' | 'anonymous';
  titre_poste?: string | null;
  competences?: string[] | null;
  lieu?: string | null;
  secteur?: string | null;
  annees_experience?: number | null;
  disponible?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface Bio {
  id: string;
  user_id: string;
  slug: string;
  content: string;
  is_public: boolean;
  secteur?: string | null;
  lieu?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RecruiterProfile {
  id: string;
  nom_entreprise: string;
  secteur: string;
  site_web?: string | null;
  description: string;
  logo_url?: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_documents?: string[] | null; // JSONB storage of URLs
  verification_note?: string | null;
  verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface JobOffer {
  id: string;
  recruiter_id: string;
  titre: string;
  slug: string;
  description: string;
  entreprise: string;
  lieu: string;
  secteur: string;
  type_contrat: 'cdi' | 'cdd' | 'stage' | 'freelance' | 'temps_partiel' | 'alternance';
  remote: boolean;
  salaire_min?: number | null;
  salaire_max?: number | null;
  devise: string; // default 'XAF'
  competences?: string[] | null;
  statut: 'active' | 'closed' | 'draft';
  moderation_status: 'pending' | 'approved' | 'rejected';
  moderation_note?: string | null;
  ai_generated?: boolean;
  is_boosted?: boolean;
  boosted_until?: string | null;
  vues: number;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface JobApplication {
  id: string;
  job_offer_id: string;
  user_id: string;
  cv_id?: string | null;
  bio_id?: string | null;
  message?: string | null;
  statut: 'envoyee' | 'vue' | 'acceptee' | 'refusee';
  created_at?: string;
  // joined properties
  job_offer?: JobOffer;
  profile?: Profile;
  cv?: CV;
  bio?: Bio;
}

export interface JobOfferReport {
  id: string;
  job_offer_id: string;
  reporter_user_id: string;
  raison: string;
  statut: 'open' | 'resolved' | 'dismissed';
  created_at?: string;
  job_offer?: JobOffer;
}

export interface Boost {
  id: string;
  user_id: string;
  target_type: 'cv' | 'bio' | 'job_offer';
  target_id: string;
  token_pay: string;
  statut: 'pending' | 'paid' | 'failed';
  montant: number;
  duree_jours: number; // default 7
  expires_at?: string | null;
  created_at?: string;
}

export interface SavedItem {
  id: string;
  user_id: string;
  item_type: 'cv' | 'bio' | 'job_offer';
  item_id: string;
  created_at?: string;
  cv?: CV;
  bio?: Bio;
  job_offer?: JobOffer;
}

export interface AdminInvitation {
  id: string;
  email: string;
  role_invited: 'recruiter' | 'moderator' | 'admin';
  invited_by: string;
  token: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  created_at?: string;
  accepted_at?: string | null;
}

export interface AdminActionLog {
  id: string;
  actor_id: string;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  details?: any;
  created_at?: string;
}
