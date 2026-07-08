export interface Ebook {
  id: string;
  titre: string;
  description: string;
  prix: number; // in CFA Francs or currency of choice
  url_couverture: string;
  url_fichier_storage: string;
  categorie: string;
  created_at?: string;
}

export interface Profile {
  id: string;
  role: 'user' | 'admin';
  email?: string;
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILURE = 'failure',
  NO_PAID = 'no paid',
}

export interface Achat {
  id: string;
  user_id: string;
  ebook_id: string;
  token_pay: string;
  statut: PaymentStatus;
  montant: number;
  created_at?: string;
  ebook?: Ebook; // Joined info
  affiliate_id?: string | null;
}

export interface Affiliate {
  id: string;
  user_id: string;
  parent_affiliate_id: string | null;
  referral_code: string;
  status: 'pending' | 'approved' | 'rejected';
  activated: boolean;
  nom_complet: string;
  telephone: string;
  moyen_promotion: string;
  lien_audience?: string | null;
  motif_rejet?: string | null;
  applied_at: string;
  reviewed_at?: string | null;
}

export interface AffiliateClick {
  id: string;
  affiliate_id: string;
  ebook_id: string | null;
  converted: boolean;
  created_at: string;
}

export interface AffiliateCommission {
  id: string;
  achat_id: string;
  affiliate_id: string;
  niveau: 1 | 2 | 3;
  montant: number;
  statut: 'pending' | 'paid';
  created_at: string;
  achat?: Achat; // joined
}

export interface AffiliateMessage {
  id: string;
  affiliate_id: string;
  sender: 'admin' | 'affiliate';
  message: string;
  created_at: string;
  read_at?: string | null;
}


export interface MoneyFusionPaymentRequest {
  totalPrice: number;
  article: Array<{ [key: string]: number }>;
  personal_Info: Array<{ userId: string; orderId: string; ebookId: string }>;
  numeroSend: string;
  nomclient: string;
  return_url?: string;
  webhook_url?: string;
}

export interface MoneyFusionPaymentResponse {
  statut: boolean;
  token: string;
  message: string;
  url: string;
}

export interface MoneyFusionWebhookPayload {
  event: 'payin.session.pending' | 'payin.session.completed' | 'payin.session.cancelled';
  personal_Info: Array<{ userId: string; orderId: string; ebookId: string }>;
  tokenPay: string;
  numeroSend: string;
  nomclient: string;
  numeroTransaction: string;
  Montant: number;
  frais: number;
  return_url?: string;
  webhook_url?: string;
  createdAt: string;
}
