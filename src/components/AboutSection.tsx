import React from "react";
import { BookOpen, Smartphone, Coins, ArrowRight, ShieldCheck, Award } from "lucide-react";

interface AboutSectionProps {
  onJoinAffiliate: () => void;
  user: any;
}

export default function AboutSection({ onJoinAffiliate, user }: AboutSectionProps) {
  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-sans mt-12" id="about-ebookstore-afrique">
      <div className="p-6 sm:p-10 space-y-8">
        {/* Header Title */}
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border border-indigo-150">
            <BookOpen className="h-3.5 w-3.5" /> Présentation de la Plateforme
          </div>
          <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight leading-tight">
            Qu'est-ce qu'EbookStore Afrique ?
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            EbookStore Afrique est la plateforme de référence pour l'acquisition et le partage d'œuvres littéraires numériques de haute qualité à travers le continent africain. Notre mission est de démocratiser l'accès au savoir grâce à la puissance du numérique et à l'immédiateté des réseaux de paiement mobile.
          </p>
        </div>

        {/* 3 Steps / Key features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Feature 1 */}
          <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-4 hover:border-slate-200 hover:bg-slate-50 transition-all duration-300">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-sm text-slate-900">Un Catalogue Diversifié</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Parcourez une sélection de livres électroniques de qualité supérieure au format PDF, couvrant le développement personnel, l'entrepreneuriat, la technologie et la programmation, dont de nombreux titres gratuits offerts par nos auteurs.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-4 hover:border-slate-200 hover:bg-slate-50 transition-all duration-300">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-sm text-slate-900">Paiement Mobile Instantané</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Achetez vos ebooks de manière 100% sécurisée en utilisant votre compte <strong>Orange Money, MTN MoMo, Moov ou Wave</strong> via notre passerelle de paiement intégrée <strong>MoneyFusion</strong>. Pas besoin de carte bancaire !
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-4 hover:border-slate-200 hover:bg-slate-50 transition-all duration-300">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-sm text-slate-900">Téléchargement Sécurisé</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Après confirmation de votre commande, accédez instantanément à vos fichiers depuis votre espace personnel. Nos liens de téléchargement sont cryptés, sécurisés et disponibles à vie pour les acheteurs.
              </p>
            </div>
          </div>
        </div>

        {/* Affiliate Program Call to Action Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white border border-indigo-950 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          {/* Subtle decorative glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-3 max-w-xl text-center md:text-left relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-bold uppercase tracking-widest font-mono border border-indigo-500/30">
              <Award className="h-3 w-3" /> Rejoignez notre communauté de partenaires
            </div>
            <h4 className="font-display font-black text-lg sm:text-xl tracking-tight">
              Gagnez de l'argent avec le Programme d'Affiliation à 3 niveaux
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Devenez un partenaire affilié d'EbookStore Afrique. Partagez vos liens d'affiliation uniques et recevez des commissions sur chaque vente générée, avec un système de parrainage structuré sur 3 niveaux d'affiliation pour maximiser vos revenus passifs.
            </p>
          </div>

          <button
            onClick={onJoinAffiliate}
            className="px-5 py-2.5 bg-white hover:bg-indigo-50 text-indigo-950 font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 duration-150 shrink-0 relative z-10"
          >
            <span>{user ? "Accéder à l'Espace Affilié" : "Commencer l'Affiliation"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
