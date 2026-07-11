import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  AlertCircle, 
  Users, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Database, 
  Search, 
  Building, 
  Briefcase, 
  FileText, 
  Settings, 
  Activity, 
  RefreshCw, 
  Clock, 
  ArrowUpRight, 
  Lock,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Trash2,
  Check,
  Send,
  X
} from "lucide-react";
import { API_BASE_URL } from "../supabaseClient";

interface AdminPanelProps {
  currentUser: any;
  userRole: string;
}

export default function AdminPanel({ currentUser, userRole }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"recruiters" | "offers" | "reports" | "roles" | "audit">("recruiters");
  
  // Lists
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  // Loading & statuses
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [diagStatus, setDiagStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Invitation
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("recruiter");
  const [invitations, setInvitations] = useState<any[]>([]);

  // Fetch functions
  const getAuthHeader = () => {
    const token = localStorage.getItem("sb-token") || "";
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const fetchRecruiters = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/moderator/recruiters`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setRecruiters(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOffers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/moderator/offers`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setOffers(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/moderator/reports`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setReports(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/roles`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/actions-log`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInvitations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/invitations`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setInvitations(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/config-status`);
      if (res.ok) {
        const data = await res.json();
        setDiagStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchRecruiters(),
        fetchOffers(),
        fetchReports(),
        fetchDiagnostics()
      ]);
      if (userRole === "admin") {
        await Promise.all([
          fetchUsers(),
          fetchAuditLogs(),
          fetchInvitations()
        ]);
      }
    } catch (e: any) {
      setError("Erreur de chargement des données de modération.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [userRole]);

  // Moderate Recruiter Profile
  const handleVerifyRecruiter = async (recruiterId: string, status: "verified" | "rejected") => {
    setActionLoading(`recruiter-${recruiterId}`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/moderator/recruiters/${recruiterId}/verify`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ verification_status: status, verification_note: `Profil entreprise traité le ${new Date().toLocaleDateString()}` })
      });

      if (res.ok) {
        setMsg(`Le recruteur a été marqué comme ${status === "verified" ? "Vérifié" : "Rejeté"} avec succès.`);
        fetchRecruiters();
        if (userRole === "admin") fetchAuditLogs();
      } else {
        const err = await res.json();
        setError(err.error || "Une erreur est survenue.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Moderate Job Offer
  const handleVerifyOffer = async (offerId: string, status: "approved" | "rejected") => {
    setActionLoading(`offer-${offerId}`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/moderator/offers/${offerId}/verify`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ moderation_status: status, moderation_note: `Offre modérée le ${new Date().toLocaleDateString()}` })
      });

      if (res.ok) {
        setMsg(`L'offre d'emploi a été ${status === "approved" ? "Approuvée" : "Refusée"} avec succès.`);
        fetchOffers();
        if (userRole === "admin") fetchAuditLogs();
      } else {
        const err = await res.json();
        setError(err.error || "Une erreur est survenue.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Resolve Alert / Report
  const handleResolveReport = async (reportId: string, status: "resolved" | "dismissed") => {
    setActionLoading(`report-${reportId}`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/moderator/reports/${reportId}/resolve`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ statut: status })
      });

      if (res.ok) {
        setMsg(`Signalement traité (${status === "resolved" ? "Résolu" : "Classé sans suite"}).`);
        fetchReports();
        fetchOffers();
        if (userRole === "admin") fetchAuditLogs();
      } else {
        const err = await res.json();
        setError(err.error || "Une erreur est survenue.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Super-admin Change Role
  const handleChangeRole = async (targetUserId: string, newRole: string) => {
    setActionLoading(`role-${targetUserId}`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/roles/${targetUserId}`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ role: newRole })
      });

      if (res.ok) {
        setMsg("Rôle de l'utilisateur mis à jour.");
        fetchUsers();
        fetchAuditLogs();
      } else {
        const err = await res.json();
        setError(err.error || "Une erreur est survenue.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Super-admin Create Invitation
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/invite`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ email: inviteEmail, role_invited: inviteRole })
      });

      if (res.ok) {
        setMsg(`Invitation créée et envoyée avec succès à ${inviteEmail}.`);
        setInviteEmail("");
        fetchInvitations();
        fetchAuditLogs();
      } else {
        const err = await res.json();
        setError(err.error || "Échec d'envoi de l'invitation.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Revoke Invitation
  const handleRevokeInvitation = async (invitationId: string) => {
    setActionLoading(`invite-${invitationId}`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/invitations/${invitationId}/revoke`, {
        method: "POST",
        headers: getAuthHeader()
      });

      if (res.ok) {
        setMsg("Invitation révoquée.");
        fetchInvitations();
        fetchAuditLogs();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Stats Counters
  const pendingRecruiters = recruiters.filter(r => r.verification_status === "pending").length;
  const pendingOffers = offers.filter(o => o.moderation_status === "pending").length;
  const openReports = reports.filter(r => r.statut === "open").length;

  return (
    <div id="admin_panel_wrapper" className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Title & Back-office Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase bg-amber-500/15 text-amber-500 rounded border border-amber-500/20">
              Espace Modération
            </span>
            {userRole === "admin" && (
              <span className="px-2 py-0.5 text-xs font-semibold uppercase bg-red-500/15 text-red-500 rounded border border-red-500/20">
                Super Administrateur
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-950 dark:text-white tracking-tight">
            Panneau de Contrôle & Modération
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gérez les habilitations, validez les fiches entreprises, modérez les offres d'emploi et traitez les alertes communautaires.
          </p>
        </div>
        
        <button 
          onClick={loadAllData}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Actualiser les flux
        </button>
      </div>

      {/* Messages banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto font-semibold hover:underline">Fermer</button>
        </div>
      )}

      {msg && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="ml-auto font-semibold hover:underline">Fermer</button>
        </div>
      )}

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Building className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            {pendingRecruiters > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
            )}
          </div>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Entreprises en attente</span>
          <h3 className="text-2xl font-bold text-slate-950 dark:text-white mt-1">{pendingRecruiters}</h3>
          <p className="text-xs text-slate-400 mt-1">Secteurs et documents justificatifs à valider</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Briefcase className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            {pendingOffers > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
            )}
          </div>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Offres en modération</span>
          <h3 className="text-2xl font-bold text-slate-950 dark:text-white mt-1">{pendingOffers}</h3>
          <p className="text-xs text-slate-400 mt-1">Offres publiées nécessitant vérification</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <ShieldAlert className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            {openReports > 0 && (
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            )}
          </div>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Signalements ouverts</span>
          <h3 className="text-2xl font-bold text-slate-950 dark:text-white mt-1">{openReports}</h3>
          <p className="text-xs text-slate-400 mt-1">Alertes communautaires pour fraudes ou abus</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Candidats / Recruteurs</span>
          <h3 className="text-2xl font-bold text-slate-950 dark:text-white mt-1">
            {userRole === "admin" ? users.length : recruiters.length + reports.length}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Membres inscrits sur la plateforme Afrique</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab("recruiters")}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-all ${
            activeTab === "recruiters"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Building className="h-4 w-4" /> Entreprises ({recruiters.length})
        </button>

        <button
          onClick={() => setActiveTab("offers")}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-all ${
            activeTab === "offers"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Briefcase className="h-4 w-4" /> Offres d'emploi ({offers.length})
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-all ${
            activeTab === "reports"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <ShieldAlert className="h-4 w-4" /> Signalements ({reports.length})
        </button>

        {userRole === "admin" && (
          <>
            <button
              onClick={() => setActiveTab("roles")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === "roles"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" /> Rôles & Invitations ({users.length})
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === "audit"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Activity className="h-4 w-4" /> Diagnostics & Logs ({auditLogs.length})
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500 mt-2">Chargement des données de modération...</p>
        </div>
      ) : (
        <div id="admin_tab_content">
          
          {/* TAB: RECRUITERS */}
          {activeTab === "recruiters" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Fiches Entreprises</h3>
                <span className="text-xs text-slate-400">{recruiters.length} fiches chargées</span>
              </div>

              {recruiters.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Building className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">Aucun profil d'entreprise n'est enregistré pour le moment.</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        <th className="px-6 py-4">Entreprise / Logo</th>
                        <th className="px-6 py-4">Secteur</th>
                        <th className="px-6 py-4">Site Web</th>
                        <th className="px-6 py-4">Documents</th>
                        <th className="px-6 py-4">Statut</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                      {recruiters.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {rec.logo_url ? (
                                <img src={rec.logo_url} alt="Logo" className="h-10 w-10 rounded object-cover border border-slate-200 dark:border-slate-800" />
                              ) : (
                                <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold">
                                  {rec.nom_entreprise?.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-semibold text-slate-950 dark:text-white block">{rec.nom_entreprise}</span>
                                <span className="text-xs text-slate-400">ID: {rec.id.substring(0, 8)}...</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{rec.secteur}</td>
                          <td className="px-6 py-4 text-indigo-600 dark:text-indigo-400">
                            {rec.site_web ? (
                              <a href={rec.site_web} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                Visiter <ArrowUpRight className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400 text-xs">Non spécifié</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-indigo-600 dark:text-indigo-400">
                            {rec.verification_documents ? (
                              <a href={rec.verification_documents} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1 font-semibold">
                                <FileText className="h-4 w-4" /> Voir PJ
                              </a>
                            ) : (
                              <span className="text-slate-400 text-xs">Aucun document</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {rec.verification_status === "verified" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 rounded border border-emerald-500/20">
                                <CheckCircle className="h-3 w-3" /> Vérifié
                              </span>
                            ) : rec.verification_status === "rejected" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/20 rounded border border-rose-500/20">
                                <XCircle className="h-3 w-3" /> Rejeté
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 rounded border border-amber-500/20 animate-pulse">
                                <Clock className="h-3 w-3" /> En attente
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {rec.verification_status === "pending" ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  disabled={actionLoading !== null}
                                  onClick={() => handleVerifyRecruiter(rec.id, "verified")}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                                >
                                  {actionLoading === `recruiter-${rec.id}` ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )} Approuver
                                </button>
                                <button
                                  disabled={actionLoading !== null}
                                  onClick={() => handleVerifyRecruiter(rec.id, "rejected")}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors"
                                >
                                  Refuser
                                </button>
                              </div>
                            ) : (
                              <button
                                disabled={actionLoading !== null}
                                onClick={() => handleVerifyRecruiter(rec.id, rec.verification_status === "verified" ? "rejected" : "verified")}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs underline font-medium"
                              >
                                Changer le statut
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: OFFERS */}
          {activeTab === "offers" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Offres d'emploi déposées</h3>
                <span className="text-xs text-slate-400">{offers.length} offres enregistrées</span>
              </div>

              {offers.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">Aucune offre d'emploi n'a encore été déposée.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {offers.map((offer) => (
                    <div 
                      key={offer.id} 
                      className={`p-6 bg-white dark:bg-slate-900 border ${
                        offer.moderation_status === "pending" 
                          ? "border-amber-200 dark:border-amber-900/40 bg-amber-50/5" 
                          : "border-slate-200 dark:border-slate-800"
                      } rounded-xl shadow-sm`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                              {offer.type_contrat?.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-400">• Posté le {new Date(offer.created_at).toLocaleDateString()}</span>
                            {offer.is_boosted && (
                              <span className="px-2 py-0.5 text-[11px] font-semibold uppercase bg-amber-500/10 text-amber-500 rounded border border-amber-500/20 animate-pulse">
                                BOOSTÉ ⚡
                              </span>
                            )}
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white">{offer.titre}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Entreprise : <span className="font-medium text-slate-700 dark:text-slate-300">{offer.entreprise}</span> ({offer.lieu})
                          </p>
                          
                          {/* Competencies badges */}
                          {offer.competences && offer.competences.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-3">
                              {offer.competences.map((c: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-300 font-medium">
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Collapsible/readable description */}
                          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                            {offer.description}
                          </div>
                        </div>

                        {/* Verification controls */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400">Modération :</span>
                            {offer.moderation_status === "approved" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 rounded border border-emerald-500/20">
                                <CheckCircle className="h-3 w-3" /> Approuvée
                              </span>
                            ) : offer.moderation_status === "rejected" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/20 rounded border border-rose-500/20">
                                <XCircle className="h-3 w-3" /> Refusée
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 rounded border border-amber-500/20 animate-pulse">
                                <Clock className="h-3 w-3" /> En attente
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            {offer.moderation_status === "pending" ? (
                              <>
                                <button
                                  disabled={actionLoading !== null}
                                  onClick={() => handleVerifyOffer(offer.id, "approved")}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                                >
                                  {actionLoading === `offer-${offer.id}` ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )} Approuver l'offre
                                </button>
                                <button
                                  disabled={actionLoading !== null}
                                  onClick={() => handleVerifyOffer(offer.id, "rejected")}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                                >
                                  Refuser
                                </button>
                              </>
                            ) : (
                              <button
                                disabled={actionLoading !== null}
                                onClick={() => handleVerifyOffer(offer.id, offer.moderation_status === "approved" ? "rejected" : "approved")}
                                className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:underline"
                              >
                                Basculer l'état
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: REPORTS */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Signalements d'offres suspectes</h3>
                <span className="text-xs text-slate-400">{reports.length} rapports de signalement</span>
              </div>

              {reports.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">Aucun signalement d'abus n'a été signalé par la communauté.</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        <th className="px-6 py-4">Offre signalée</th>
                        <th className="px-6 py-4">Raison du signalement</th>
                        <th className="px-6 py-4">Date du signalement</th>
                        <th className="px-6 py-4">Statut</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                      {reports.map((rep) => (
                        <tr key={rep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-950 dark:text-white block">
                              {rep.job_offer?.titre || "Offre d'emploi supprimée"}
                            </span>
                            <span className="text-xs text-slate-400">Entreprise : {rep.job_offer?.entreprise}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-xs text-slate-700 dark:text-slate-300 font-medium">
                              {rep.raison}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {new Date(rep.created_at).toLocaleDateString()} {new Date(rep.created_at).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4">
                            {rep.statut === "resolved" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 rounded border border-emerald-500/20">
                                <CheckCircle className="h-3 w-3" /> Résolu
                              </span>
                            ) : rep.statut === "dismissed" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-50 dark:text-slate-400 dark:bg-slate-950/20 rounded border border-slate-500/20">
                                Classé
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/20 rounded border border-rose-500/20 animate-pulse">
                                <AlertCircle className="h-3 w-3" /> Ouvert
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {rep.statut === "open" ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  disabled={actionLoading !== null}
                                  onClick={() => handleResolveReport(rep.id, "resolved")}
                                  className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors"
                                >
                                  Suspendre l'offre
                                </button>
                                <button
                                  disabled={actionLoading !== null}
                                  onClick={() => handleResolveReport(rep.id, "dismissed")}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 rounded transition-colors"
                                >
                                  Classer
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Traité</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: ROLES & INVITATIONS */}
          {activeTab === "roles" && userRole === "admin" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left : User List with Role Selector */}
              <div className="lg:col-span-2 space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Droits & Habilitations</h3>
                
                <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        <th className="px-6 py-4">Utilisateur</th>
                        <th className="px-6 py-4">Rôle Actuel</th>
                        <th className="px-6 py-4 text-right">Modifier le Rôle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-950 dark:text-white block">{u.email || "Utilisateur"}</span>
                            <span className="text-xs text-slate-400">UID: {u.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase ${
                              u.role === "admin" 
                                ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400" 
                                : u.role === "moderator" 
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400" 
                                : u.role === "recruiter" 
                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400" 
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}>
                              {u.role || "user"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {currentUser?.id === u.id ? (
                              <span className="text-xs text-slate-400 italic">C'est vous</span>
                            ) : (
                              <select
                                disabled={actionLoading !== null}
                                value={u.role || "user"}
                                onChange={(e) => handleChangeRole(u.id, e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded text-xs p-1 font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                              >
                                <option value="user">Candidat (User)</option>
                                <option value="recruiter">Recruteur</option>
                                <option value="moderator">Modérateur</option>
                                <option value="admin">Administrateur</option>
                              </select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right: Invitations and role invitations form */}
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <h3 className="text-md font-bold text-slate-900 dark:text-white mb-4">Inviter un Collaborateur</h3>
                  
                  <form onSubmit={handleCreateInvite} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Email du collaborateur</label>
                      <input 
                        required
                        type="email" 
                        value={inviteEmail} 
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="co-mod@afriquerecrutement.com" 
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Rôle assigné par défaut</label>
                      <select 
                        value={inviteRole} 
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-950 dark:text-white"
                      >
                        <option value="recruiter">Recruteur d'office</option>
                        <option value="moderator">Modérateur système</option>
                        <option value="admin">Super Administrateur</option>
                      </select>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Inviter par email
                    </button>
                  </form>
                </div>

                {/* Invitations List */}
                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                  <h3 className="text-md font-bold text-slate-900 dark:text-white mb-4">Invitations Actives</h3>
                  
                  {invitations.length === 0 ? (
                    <p className="text-xs text-slate-400">Aucune invitation envoyée.</p>
                  ) : (
                    <div className="space-y-3">
                      {invitations.map((inv) => (
                        <div key={inv.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-white">{inv.email}</span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold uppercase text-[9px]">
                              {inv.role_invited}
                            </span>
                          </div>
                          <div className="text-slate-400">Statut : {inv.status}</div>
                          {inv.status === "pending" && (
                            <button
                              onClick={() => handleRevokeInvitation(inv.id)}
                              className="text-rose-600 font-semibold hover:underline mt-1 block"
                            >
                              Révoquer
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: DIAGNOSTICS & AUDIT LOGS */}
          {activeTab === "audit" && userRole === "admin" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Diagnostics Système & Journal d'Audit</h3>
              
              {/* Diagnostics Grid */}
              {diagStatus && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-slate-400 uppercase">Database Link</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-1 break-all">{diagStatus.supabaseUrl}</p>
                    <span className="inline-block px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded mt-2 font-medium">
                      {diagStatus.supabaseStatus}
                    </span>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-slate-400 uppercase">MoneyFusion API Gateway</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-1 break-all">
                      {diagStatus.moneyfusionStatus || "Inactif"}
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-slate-400 uppercase">AI Job Generator API</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-1 break-all">
                      {diagStatus.aiJobUrl || "Local Gemini Fallback"}
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-slate-400 uppercase">Production Status</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">Real-Time Sync Activated</p>
                    <span className={`inline-block px-1.5 py-0.5 rounded mt-2 font-semibold ${
                      diagStatus.isRealProduction ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
                    }`}>
                      {diagStatus.isRealProduction ? "PRODUCTION" : "PREVIEW MODE"}
                    </span>
                  </div>
                </div>
              )}

              {/* Audit Logs */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" /> Actions Administrateurs Récentes
                  </span>
                  <button onClick={fetchAuditLogs} className="text-xs text-indigo-600 hover:underline">Rafraîchir les logs</button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-96 overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <p className="p-6 text-sm text-slate-400 text-center">Aucune action n'a été loggée pour l'instant.</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-xs flex items-start gap-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded flex-shrink-0">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                        <div>
                          <p className="text-slate-800 dark:text-slate-200">
                            <strong>{log.action}</strong> par Admin (ID: {log.actor_id.substring(0, 8)}...)
                          </p>
                          {log.target_type && (
                            <span className="text-[10px] text-indigo-600 block mt-0.5 font-semibold uppercase">
                              Cible : {log.target_type} (ID: {log.target_id?.substring(0, 8)})
                            </span>
                          )}
                          {log.details && (
                            <pre className="mt-2 p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono text-[10px] overflow-x-auto text-slate-600 dark:text-slate-400">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
