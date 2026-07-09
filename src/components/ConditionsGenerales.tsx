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
        onClick={() => setView("catalog")}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Retourner au catalogue
      </button>

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border border-indigo-150">
          <Scale className="h-4 w-4" /> Cadre Réglementaire
        </div>
        <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-slate-950 tracking-tight leading-none">
          Conditions Générales d'Utilisation & de Vente
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Calendar className="h-3.5 w-3.5" />
          <span>Dernière mise à jour : 9 Juillet 2026</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed pt-2">
          Bienvenue sur <strong>EbookStore Afrique</strong>. Les présentes Conditions Générales d'Utilisation et de Vente (CGU/CGV) régissent l'accès au site, l'acquisition d'ebooks numériques (gratuits ou payants) ainsi que l'inscription et la participation à notre Programme d'Affiliation. En accédant ou en commandant sur la plateforme, vous acceptez pleinement ces règles de fonctionnement.
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8 text-slate-650 text-xs sm:text-sm leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">1.</span> Nature numérique des produits et absence de rétractation
          </h3>
          <div className="flex gap-4 p-4 bg-slate-50 border border-slate-150 rounded-2xl items-start">
            <ShoppingBag className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                Produits Numériques Livrés Immédiatement
              </h4>
              <p className="text-xs text-slate-500">
                Les œuvres littéraires et documentations techniques vendues sur EbookStore Afrique sont des fichiers numériques intangibles livrés immédiatement après confirmation du paiement sous format PDF. En conséquence, conformément aux règles du commerce électronique mondial, <strong>l'utilisateur renonce expressément à tout droit de rétractation et de remboursement dès qu'il initie ou débloque le téléchargement effectif du fichier numérique.</strong> Aucun échange ni retour ne peut être accordé après livraison.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">2.</span> Licence d'utilisation personnelle et droits d'auteur
          </h3>
          <p>
            Tous les ebooks achetés ou téléchargés gratuitement sur EbookStore Afrique restent protégés par le droit d'auteur national et international.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Usage strictement personnel :</strong> L'acquisition d'un fichier confère à l'acheteur une licence personnelle, non exclusive, incessible et révocable de lecture pour son usage privé uniquement.
            </li>
            <li>
              <strong>Interdiction de redistribution :</strong> Il est strictement interdit d'héberger, de revendre, de distribuer, de prêter, de copier ou de partager publiquement les fichiers téléchargés (que ce soit sur des groupes Telegram, WhatsApp, des sites web de partage ou tout support physique), sous peine de poursuites judiciaires.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">3.</span> Règles du Programme d'Affiliation multi-niveaux
          </h3>
          <p>
            EbookStore Afrique propose un programme de parrainage et d'affiliation performant et transparent à ses utilisateurs pour promouvoir l'autonomie financière de sa communauté :
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong>Éligibilité de candidature :</strong> Pour postuler au programme d'affiliation et obtenir un lien personnalisé de parrainage, l'utilisateur doit disposer d'un compte validé et **avoir réalisé au moins un achat d'un ebook payant** sur notre boutique. L'administrateur conserve le droit souverain d'approuver ou rejeter une candidature d'affilié après examen.
            </li>
            <li>
              <strong>Commissions sur 3 niveaux :</strong> Les commissions sont calculées sur le prix d'achat payé hors taxes de chaque livre selon la répartition suivante :
              <ul className="list-circle pl-5 mt-1 space-y-1">
                <li><strong>Niveau 1 (Recommandation directe) :</strong> Commission maximale attribuée à l'affilié parrainant directement l'acheteur.</li>
                <li><strong>Niveau 2 (Parrainage indirect) :</strong> Commission intermédiaire attribuée au parrain de l'affilié de niveau 1.</li>
                <li><strong>Niveau 3 (Grand-Parrainage) :</strong> Commission résiduelle attribuée au parrain de niveau 2.</li>
              </ul>
            </li>
            <li>
              <strong>Demandes de Retraits :</strong> Les commissions acquises sont cumulées dans le portefeuille de l'affilié. Dès que le seuil de retrait requis est atteint, l'affilié peut soumettre une demande de retrait en indiquant son numéro de téléphone Mobile Money. L'administrateur valide et traite manuellement les demandes de paiement dans un délai maximal de 48 heures ouvrées.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">4.</span> Protection contre la fraude et suspensions
          </h3>
          <div className="flex gap-4 p-4 bg-rose-50 border border-rose-150 rounded-2xl items-start">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                Tolérance Zéro pour les Abus et Spams
              </h4>
              <p className="text-xs text-rose-800">
                Afin de préserver l'équité du système, l'administrateur se réserve le droit de geler définitivement le portefeuille de commissions d'un affilié, de suspendre son espace de parrainage et de supprimer son compte sans préavis en cas de détection de comportements frauduleux. Cela inclut, sans s'y limiter : l'auto-clic massif, le parrainage de faux comptes fictifs (auto-parrainage), le spam agressif de liens sur des forums officiels, les déclarations trompeuses sur les ebooks ou toute manipulation technique visant à fausser les clics d'affiliation.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">5.</span> Moyens de paiement et traitement tiers
          </h3>
          <p>
            Toutes les transactions commerciales sont libellées en Francs CFA (FCFA) et sont traitées de manière cryptée et sécurisée par la passerelle de paiement tierce <strong>MoneyFusion</strong>. Les opérateurs partenaires agrégés incluent :
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono font-bold text-xs mt-2">
            <span className="bg-slate-50 border border-slate-150 py-2 rounded-xl text-slate-700">MTN Mobile Money</span>
            <span className="bg-slate-50 border border-slate-150 py-2 rounded-xl text-slate-700">Orange Money</span>
            <span className="bg-slate-50 border border-slate-150 py-2 rounded-xl text-slate-700">Moov Money</span>
            <span className="bg-slate-50 border border-slate-150 py-2 rounded-xl text-slate-700">Wave & Flooz</span>
          </div>
          <p className="mt-2">
            EbookStore Afrique décline toute responsabilité en cas d'interruption temporaire de service liée aux réseaux opérateurs partenaires ou à la maintenance technique de la plateforme MoneyFusion.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">6.</span> Clause de responsabilité limitée & droit applicable
          </h3>
          <p>
            EbookStore Afrique s'engage à faire ses meilleurs efforts pour sécuriser l'accès à la plateforme et à vos fichiers téléchargés. Néanmoins, l'éditeur ne saurait être tenu responsable des pannes de réseau internet, de pertes de données liées au navigateur de l'utilisateur, ou d'incompatibilités logicielles lors de la lecture des fichiers PDF.
          </p>
          <p className="mt-2">
            Les présentes conditions générales sont régies par les lois nationales et le cadre juridique du commerce électronique de la CEMAC et de la CEDEAO. En cas de litige, et après échec de toute tentative de résolution amiable, les tribunaux du ressort de domiciliation de l'activité commerciale de l'exploitant seront seuls compétents.
          </p>
        </section>
      </div>

      {/* Action Footer */}
      <div className="text-center">
        <button
          onClick={() => setView("catalog")}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
        >
          Retourner au catalogue d'ebooks
        </button>
      </div>
    </div>
  );
}
