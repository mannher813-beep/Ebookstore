import React from "react";
import { ArrowLeft, Calendar, Landmark, Info, Mail, MapPin, Globe } from "lucide-react";

interface LegalPageProps {
  setView: (view: string) => void;
}

export default function MentionsLegales({ setView }: LegalPageProps) {
  // Ensure the page loads scrolled to top
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8 font-sans" id="mentions-legales-page">
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
          <Landmark className="h-4 w-4" /> Transparence & Légalité
        </div>
        <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-slate-950 tracking-tight leading-none">
          Mentions Légales
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Calendar className="h-3.5 w-3.5" />
          <span>Dernière mise à jour : 9 Juillet 2026</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed pt-2">
          Conformément aux réglementations relatives à la confiance dans l'économie numérique et à l'édition de services en ligne, vous trouverez ci-dessous les informations légales d'identification d'<strong>EbookStore Afrique</strong>. Certains champs non encore spécifiés officiellement par l'exploitant sont marqués d'un badge éditable.
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8 text-slate-650 text-xs sm:text-sm leading-relaxed">
        
        {/* Section 1: Éditeur du site */}
        <section className="space-y-4">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">1.</span> Éditeur & Exploitation du Service
          </h3>
          <p>
            Le présent site internet et service de commerce électronique <strong>EbookStore Afrique</strong> est exploité par :
          </p>
          <div className="p-5 bg-slate-50 border border-slate-150 rounded-2xl space-y-3 font-mono text-xs text-slate-700">
            <div className="flex items-center gap-2.5">
              <span className="font-sans font-bold text-slate-400 w-32 shrink-0">Nom de l'exploitant :</span>
              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">
                [À compléter par l'exploitant]
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-sans font-bold text-slate-400 w-32 shrink-0">Statut juridique :</span>
              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">
                [À compléter : Entreprise Individuelle, SARL, etc.]
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-sans font-bold text-slate-400 w-32 shrink-0">Immatriculation / RCCM :</span>
              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">
                [À compléter : N° de registre du commerce]
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-sans font-bold text-slate-400 w-32 shrink-0">Adresse de l'activité :</span>
              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">
                [À compléter : Quartier, Ville, Pays (ex: Douala, Cameroun)]
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-sans font-bold text-slate-400 w-32 shrink-0">Email de contact :</span>
              <a href="mailto:techsen237@gmail.com" className="text-indigo-650 hover:underline font-bold">
                techsen237@gmail.com
              </a>
            </div>
          </div>
        </section>

        {/* Section 2: Directeur de la Publication */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">2.</span> Direction de la publication
          </h3>
          <p className="flex items-start gap-2.5">
            <span className="font-bold text-slate-800">Responsable de la publication :</span>
            <span className="text-slate-500">Le gérant technique d'EbookStore Afrique, joignable à l'adresse e-mail de contact ou via les coordonnées de l'exploitant indiquées ci-dessus.</span>
          </p>
        </section>

        {/* Section 3: Hébergeurs du site et base de données */}
        <section className="space-y-4">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">3.</span> Hébergement & Infrastructures Techniques
          </h3>
          <p>
            Pour garantir un service optimal, hautement disponible et sécurisé à travers l'Afrique et le monde, les infrastructures d'EbookStore Afrique reposent sur les prestataires cloud haut de gamme suivants :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Host 1 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Hébergement du site</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-mono">
                <strong>Cloudflare Inc.</strong><br />
                101 Townsend St, San Francisco, CA 94107, USA<br />
                Site web : cloudflare.com
              </p>
            </div>

            {/* Host 2 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Base de données & Fichiers</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-mono">
                <strong>Supabase Inc.</strong><br />
                Région : Europe (Paris, France)<br />
                Site web : supabase.com
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Propriété Intellectuelle */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">4.</span> Propriété Intellectuelle & Droits réservés
          </h3>
          <p>
            La charte graphique du site, l'identité visuelle, l'arborescence, les textes et les logos de la marque EbookStore Afrique sont la propriété exclusive de l'exploitant. Toute reproduction non autorisée de la plateforme, de son code d'affichage ou de ses éléments d'identité graphique constitue une contrefaçon sanctionnée par le droit de la propriété intellectuelle.
          </p>
          <p className="mt-2">
            Les ebooks numériques au format PDF sont la propriété intellectuelle de leurs auteurs respectifs. Leur achat ou téléchargement ne transfère aucun droit de propriété intellectuelle à l'utilisateur, qui dispose d'une licence de lecture à usage personnel uniquement.
          </p>
        </section>

        {/* Section 5: Modification des mentions légales */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">5.</span> Litiges & Juridiction
          </h3>
          <p>
            L'utilisation du site internet EbookStore Afrique est régie par les présentes mentions légales. L'exploitant se réserve le droit de modifier le contenu des présentes mentions légales à tout moment afin de refléter l'évolution de son statut commercial officiel.
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
