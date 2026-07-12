import React from "react";
import { ArrowLeft, Calendar, FileText, Scale, ShoppingBag, Coins, ShieldAlert } from "lucide-react";

interface LegalPageProps {
  setView: (view: string) => void;
}

export default function ConditionsGenerales({ setView }: LegalPageProps) {
  // Ensure the page loads scrolled to top
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8 font-sans" id="conditions-generales-page">
      {/* Back button */}
      <button
        onClick={() => setView("home")}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Retourner à l'accueil
      </button>

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border border-indigo-150">
          <Scale className="h-4 w-4" /> Cadre Réglementaire
        </div>
        <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-slate-950 tracking-tight leading-none">
          Conditions Générales d'Utilisation
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Calendar className="h-3.5 w-3.5" />
          <span>Dernière mise à jour : 11 Juillet 2026</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed pt-2">
          Bienvenue sur la plateforme de recrutement d'<strong>EbookStore Recrutement</strong>. Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès au site, la création de profils candidats, la publication d'offres d'emploi, et l'utilisation de nos fonctionnalités d'intelligence artificielle et de visibilité (boost). En utilisant notre plateforme, vous acceptez pleinement ces conditions.
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8 text-slate-650 text-xs sm:text-sm leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">1.</span> Services pour les candidats et génération de CV / Bio
          </h3>
          <div className="flex gap-4 p-4 bg-slate-50 border border-slate-150 rounded-2xl items-start">
            <FileText className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                Création de Profils et de CV Professionnels
              </h4>
              <p className="text-xs text-slate-500">
                Les candidats peuvent créer gratuitement un profil professionnel, rédiger une biographie professionnelle avec l'aide facultative de nos services d'intelligence artificielle, et générer ou héberger un Curriculum Vitae au format PDF. Les informations soumises doivent être exactes et fidèles à la réalité du parcours professionnel du candidat. L'éditeur ne peut être tenu responsable d'éventuelles inexactitudes.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">2.</span> Services pour les recruteurs et publication d'offres
          </h3>
          <p>
            Les recruteurs professionnels peuvent s'inscrire, soumettre et publier des offres d'emploi (job_offers) ciblées sur des talents qualifiés en Afrique.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Vérification obligatoire :</strong> L'éditeur se réserve le droit de vérifier les informations relatives à l'entreprise recruteuse et d'approuver ou refuser la publication de certaines offres d'emploi.
            </li>
            <li>
              <strong>Exactitude des offres :</strong> Les offres d'emploi doivent être réelles, de bonne foi et exemptes de déclarations mensongères ou discriminatoires.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">3.</span> Système d'options de visibilité (Boost) et paiement
          </h3>
          <p>
            La plateforme propose un système de visibilité prioritaire optionnel ("Boost") pour mettre en avant certains profils de candidats ou des offres d'emploi actives auprès de l'audience.
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong>Paiement via passerelles :</strong> Les options de boost payantes sont réglées de manière sécurisée en Francs CFA (FCFA) par Mobile Money (Orange Money, MTN MoMo, Wave, etc.) via la passerelle tierce <strong>MoneyFusion</strong>.
            </li>
            <li>
              <strong>Pas de remboursement :</strong> Les boosts de visibilité numérique étant exécutés instantanément, l'utilisateur accepte qu'aucun remboursement ou rétractation ne soit possible une fois le paiement validé.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">4.</span> Signalements d'offres abusives et suspensions de compte
          </h3>
          <div className="flex gap-4 p-4 bg-rose-50 border border-rose-150 rounded-2xl items-start">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                Signalement et Modération Rigoureuse
              </h4>
              <p className="text-xs text-rose-800">
                La plateforme dispose d'un outil de signalement d'offres d'emploi suspectes ou frauduleuses. Tout recruteur publiant de fausses annonces, demandant des frais de participation indus aux candidats ou se livrant à des pratiques trompeuses verra son offre supprimée et son compte définitivement banni sans aucun préavis ni droit à indemnisation.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">5.</span> Disponibilité technique et traitement tiers
          </h3>
          <p>
            EbookStore Recrutement s'efforce de garantir une disponibilité maximale de ses services d'évaluation, de génération de CV et de soumission d'offres. Cependant, l'exploitant décline toute responsabilité en cas de pannes de réseaux internet ou de coupures dues à nos hébergeurs techniques ou à la passerelle de paiement MoneyFusion.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">6.</span> Clause de responsabilité limitée & droit applicable
          </h3>
          <p>
            Les présentes CGU sont régies par les lois nationales et le cadre juridique du commerce électronique de la CEMAC et de la CEDEAO. En cas de litige et après échec de toute tentative de résolution amiable, les tribunaux du ressort de domiciliation de l'activité commerciale de l'exploitant seront seuls compétents.
          </p>
        </section>
      </div>

      {/* Action Footer */}
      <div className="text-center">
        <button
          onClick={() => setView("home")}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
        >
          Retourner à l'accueil de la plateforme
        </button>
      </div>
    </div>
  );
}
