import React, { useState } from "react";
import { X, AlertCircle, LogIn, Shield, Chrome } from "lucide-react";
import { supabase } from "../supabaseClient";

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: { id: string; email: string }, role: string) => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    if (!supabase) {
      setError("Le client Supabase n'est pas initialisé.");
      setLoading(false);
      return;
    }

    try {
      const { error: authErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (authErr) throw authErr;
    } catch (err: any) {
      setError(err.message || "Une erreur s'est produite lors de la connexion avec Google.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-sans" id="auth-modal">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      {/* Modal Wrapper */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200 flex flex-col p-6 sm:p-8 space-y-6">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Form Header */}
          <div className="text-center space-y-2">
            <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100">
              <Shield className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-black text-xl text-slate-900 tracking-tight">
                Authentification unique
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                Connectez-vous instantanément avec votre compte Google pour gérer votre profil candidat, générer votre biographie par IA ou publier vos offres d'emploi en toute sécurité.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Single Google Sign-In Button */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 disabled:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow text-sm font-bold text-slate-700"
            >
              <Chrome className="h-5 w-5 text-indigo-600 shrink-0" />
              <span>{loading ? "Connexion en cours..." : "Continuer avec Google"}</span>
            </button>

            <p className="text-[10px] text-slate-400 text-center leading-relaxed font-mono">
              Connexion sécurisée SSL • Vos données personnelles restent protégées
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
