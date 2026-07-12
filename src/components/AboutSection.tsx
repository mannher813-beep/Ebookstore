import React from "react";
import { Briefcase, UserCheck, Sparkles, ArrowRight, ShieldCheck, Award } from "lucide-react";

interface AboutSectionProps {
  onJoinRecruitment?: () => void;
  user: any;
}

export default function AboutSection({ onJoinRecruitment, user }: AboutSectionProps) {
  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-sans mt-12" id="about-ebookstore-recrutement">
      <div className="p-6 sm:p-10 space-y-8">
        {/* Header Title */}
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border border-indigo-150">
            <Briefcase className="h-3.5 w-3.5" /> Présentation de la Plateforme
          </div>
          <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight leading-tight">
            Qu'est-ce qu'EbookStore Recrutement ?
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            EbookStore Recrutement est la plateforme de référence pour connecter les talents qualifiés avec les meilleures opportunités professionnelles à travers le continent africain. Notre mission est d'optimiser l'employabilité grâce à la puissance des profils interactifs et de l'intelligence artificielle.
          </p>
        </div>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Feature 1 */}
          <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-4 hover:border-slate-200 hover:bg-slate-50 transition-all duration-300">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-sm text-slate-900">Espace Candidat Optimisé</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Créez un profil interactif complet, téléchargez votre CV d'origine au format PDF, et bénéficiez de notre IA avancée pour générer des biographies professionnelles percutantes qui captivent l'attention des recruteurs.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-150 space-y-4 hover:border-slate-200 hover:bg-slate-50 transition-all duration-300">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-sm text-slate-900">Offres d'Emploi Ciblées</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Les recruteurs publient des offres d'emploi attractives et gèrent les candidatures reçues de manière centralisée. Les opportunités d'emploi couvrent un large éventail de domaines professionnels en pleine expansion.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-4 hover:border-slate-200 hover:bg-slate-50 transition-all duration-300">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-sm text-slate-900">Boosts de Visibilité</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Maximisez vos chances de réussite ! Mettez en avant votre offre d'emploi ou votre profil candidat grâce à nos options de boost ultra-performantes, payables de manière sécurisée par Mobile Money via la plateforme <strong>MoneyFusion</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white border border-indigo-950 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-3 max-w-xl text-center md:text-left relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-bold uppercase tracking-widest font-mono border border-indigo-500/30">
              <Award className="h-3 w-3" /> Propulsez votre carrière dès aujourd'hui
            </div>
            <h4 className="font-display font-black text-lg sm:text-xl tracking-tight">
              Rejoignez EbookStore Recrutement
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Que vous soyez un talent à la recherche d'une nouvelle aventure professionnelle ou un recruteur en quête du profil parfait, notre plateforme vous fournit tous les outils nécessaires pour exceller.
            </p>
          </div>

          {onJoinRecruitment && (
            <button
              onClick={onJoinRecruitment}
              className="px-5 py-2.5 bg-white hover:bg-indigo-50 text-indigo-950 font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 duration-150 shrink-0 relative z-10"
            >
              <span>{user ? "Accéder à mon espace" : "Créer mon compte"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
