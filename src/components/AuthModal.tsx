import React, { useState } from "react";
import { X, Mail, Lock, Sparkles, AlertCircle, Info, LogIn, CheckCircle } from "lucide-react";
import { hasSupabaseKeys } from "../supabaseClient";

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: { id: string; email: string }, role: string) => void;
}

export default function AuthModal({ onClose, onLoginSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Simulated logins (one-click simulation for testing)
  const handleSimulatedLogin = (type: "user" | "admin") => {
    setLoading(true);
    setTimeout(() => {
      const simulatedUser = {
        id: type === "admin" ? "mock-user-123" : "mock-user-456",
        email: type === "admin" ? "techsen237@gmail.com" : "customer@example.com",
        role: type,
      };
      onLoginSuccess(simulatedUser, type);
      setLoading(false);
      onClose();
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email) {
      setError("Veuillez saisir votre adresse email.");
      setLoading(false);
      return;
    }

    if (!isMagicLink && !password) {
      setError("Veuillez saisir votre mot de passe.");
      setLoading(false);
      return;
    }

    // REAL SUPABASE AUTH INTEGRATION
    if (hasSupabaseKeys) {
      const { supabase } = await import("../supabaseClient");
      if (!supabase) return;

      try {
        if (isMagicLink) {
          // Magic Link flow
          const { error: authErr } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: window.location.origin + "/mes-achats",
            }
          });
          if (authErr) throw authErr;
          setMagicLinkSent(true);
        } else if (isSignUp) {
          // Normal SignUp flow
          const { data, error: authErr } = await supabase.auth.signUp({
            email,
            password,
          });
          if (authErr) throw authErr;
          if (data.user) {
            // Fetch default role (usually 'user' created via DB trigger)
            onLoginSuccess({ id: data.user.id, email: data.user.email! }, "user");
            onClose();
          }
        } else {
          // Normal SignIn flow
          const { data, error: authErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (authErr) throw authErr;
          if (data.user) {
            // Retrieve actual role from database
            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", data.user.id)
              .single();

            onLoginSuccess({ id: data.user.id, email: data.user.email! }, profile?.role || "user");
            onClose();
          }
        }
      } catch (err: any) {
        setError(err.message || "Une erreur d'authentification s'est produite.");
      } finally {
        setLoading(false);
      }
    } else {
      // SIMULATOR MODE SUBMISSION
      setTimeout(() => {
        const isAdmin = email.toLowerCase() === "techsen237@gmail.com" || email.includes("admin");
        const role = isAdmin ? "admin" : "user";
        const simulatedUser = {
          id: isAdmin ? "mock-user-123" : "mock-user-456",
          email: email,
          role: role,
        };
        onLoginSuccess(simulatedUser, role);
        setLoading(false);
        onClose();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-sans" id="auth-modal">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      {/* Modal Wrapper */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200 flex flex-col p-6 sm:p-8">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Form Header */}
          <div className="text-center mb-6">
            <h3 className="font-display font-black text-xl sm:text-2xl text-slate-900 tracking-tight">
              {isSignUp ? "Créer un compte" : "Se connecter"}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Pour acheter des ebooks et accéder à votre espace de téléchargement sécurisé.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Magic Link Sent Alert */}
          {magicLinkSent ? (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center space-y-3">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-800">Lien Magique Envoyé !</h4>
              <p className="text-xs text-emerald-600 leading-relaxed">
                Veuillez consulter votre boîte de réception à l'adresse <strong>{email}</strong> et cliquer sur le lien sécurisé pour vous connecter automatiquement.
              </p>
              <button
                onClick={onClose}
                className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all"
              >
                Fermer la fenêtre
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1.5">
                  Adresse Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="votre-adresse@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Password - Hidden if Magic Link is active */}
              {!isMagicLink && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1.5">
                    Mot de passe
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
                    />
                  </div>
                </div>
              )}

              {/* Mode Toggle (Magic Link / Password) */}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setIsMagicLink(!isMagicLink)}
                  className="text-indigo-600 hover:text-indigo-700 hover:underline font-semibold cursor-pointer"
                >
                  {isMagicLink ? "Connexion par mot de passe" : "Se connecter par Lien Magique (Magic Link)"}
                </button>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 text-white disabled:text-slate-400 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow hover:shadow-md"
              >
                <LogIn className="h-4 w-4" />
                <span>
                  {loading
                    ? "En cours..."
                    : isMagicLink
                    ? "Envoyer le Lien Magique"
                    : isSignUp
                    ? "Créer mon compte"
                    : "Se connecter"}
                </span>
              </button>

              {/* SignUp Toggle */}
              <div className="text-center text-xs text-slate-500 pt-2">
                {isSignUp ? "Déjà membre ?" : "Nouveau client ?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-indigo-600 hover:text-indigo-700 hover:underline font-bold ml-1 cursor-pointer"
                >
                  {isSignUp ? "Se connecter" : "Créer un compte"}
                </button>
              </div>
            </form>
          )}

          {/* SIMULATOR QUICK ACCORDION */}
          {!hasSupabaseKeys && !magicLinkSent && (
            <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
              <div className="flex items-start gap-2 text-[11px] text-indigo-700 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/50 leading-relaxed">
                <Info className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
                <span>
                  <strong>Information de test :</strong> Puisque Supabase n'est pas encore connecté, le système utilise l'<strong>Authentification Simulée</strong>. Entrez n'importe quelle adresse email, ou utilisez les connexions rapides ci-dessous :
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSimulatedLogin("user")}
                  disabled={loading}
                  className="py-2 px-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Client Simulé</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulatedLogin("admin")}
                  disabled={loading}
                  className="py-2 px-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-bounce" />
                  <span>Admin Simulé</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
