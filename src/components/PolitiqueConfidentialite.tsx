import React from "react";
import { ShieldAlert, ArrowLeft, Calendar, Mail, Server, Database, Lock } from "lucide-react";

interface LegalPageProps {
  setView: (view: string) => void;
}

export default function PolitiqueConfidentialite({ setView }: LegalPageProps) {
  // Ensure the page loads scrolled to top
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8 font-sans" id="privacy-policy-page">
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
          <ShieldAlert className="h-4 w-4" /> Protection des données
        </div>
        <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-slate-950 tracking-tight leading-none">
          Politique de Confidentialité
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Calendar className="h-3.5 w-3.5" />
          <span>Dernière mise à jour : 9 Juillet 2026</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed pt-2">
          La présente Politique de Confidentialité décrit la manière dont <strong>EbookStore Afrique</strong> collecte, utilise, stocke et protège vos informations personnelles lorsque vous utilisez notre site web et nos services. Nous accordons une importance primordiale à la sécurité et à la confidentialité de vos données conformément aux réglementations en vigueur.
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8 text-slate-650 text-xs sm:text-sm leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">1.</span> Collecte des données personnelles
          </h3>
          <p>
            Nous collectons uniquement les informations nécessaires au bon fonctionnement de la plateforme et à la gestion de vos commandes. En utilisant nos services, vous acceptez la collecte des données suivantes :
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong>Données de connexion (Google SSO via Supabase Auth) :</strong> Lors de votre inscription ou connexion avec votre compte Google, nous récupérons votre adresse e-mail, votre nom complet et votre photo de profil. Ces informations sont exclusivement fournies par le service d'authentification sécurisé de Google.
            </li>
            <li>
              <strong>Informations de contact et de paiement :</strong> Votre numéro de téléphone mobile est requis au moment de la transaction pour initier le prélèvement via Mobile Money et pour la gestion des retraits de commissions dans le cadre du programme d'affiliation.
            </li>
            <li>
              <strong>Historique d'achats :</strong> Nous conservons un registre sécurisé de vos acquisitions de livres numériques (gratuits ou payants) afin de vous permettre de les retélécharger de manière illimitée depuis votre espace "Mes Achats".
            </li>
            <li>
              <strong>Suivi d'affiliation :</strong> Si vous accédez au site via un lien d'affilié, nous enregistrons temporairement un identifiant d'affiliation dans le stockage local de votre navigateur afin d'attribuer correctement la commission correspondante au partenaire lors d'un achat éventuel.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">2.</span> Utilisation de vos données
          </h3>
          <p>
            Les données personnelles recueillies par EbookStore Afrique sont destinées aux usages exclusifs suivants :
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Création, sécurisation et gestion de votre compte utilisateur.</li>
            <li>Délivrance de vos ebooks numériques achetés et gestion de votre historique de téléchargements.</li>
            <li>Traitement, sécurisation et vérification de vos transactions par Mobile Money.</li>
            <li>Calcul, répartition et versement des commissions du programme d'affiliation multi-niveaux.</li>
            <li>Amélioration de nos services techniques et assistance de notre support clientèle.</li>
          </ul>
          <p className="mt-2 font-semibold text-slate-850">
            En aucun cas vos données ne sont revendues, louées ou cédées à des tiers à des fins publicitaires ou de prospection commerciale.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">3.</span> Hébergement et stockage des données
          </h3>
          <div className="flex gap-4 p-4 bg-slate-50 border border-slate-150 rounded-2xl items-start">
            <Database className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                Infrastructure Cloud Sécurisée
              </h4>
              <p className="text-xs text-slate-500">
                Nos bases de données et nos fichiers d'ebooks numériques sont hébergés et gérés de manière sécurisée sur les serveurs de la plateforme cloud <strong>Supabase</strong>, localisés dans la région <strong>Europe (Paris - eu-west-3)</strong>. Le code source de l'application et sa distribution mondiale sont assurés via l'infrastructure sécurisée de <strong>Cloudflare Pages</strong>.
              </p>
            </div>
          </div>
          <p className="pt-2">
            Nous conservons vos données personnelles aussi longtemps que votre compte utilisateur est actif afin de garantir la disponibilité continue de votre bibliothèque d'ebooks numériques.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">4.</span> Traitement sécurisé des paiements
          </h3>
          <div className="flex gap-4 p-4 bg-slate-50 border border-slate-150 rounded-2xl items-start">
            <Lock className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                Passerelle Externe MoneyFusion
              </h4>
              <p className="text-xs text-slate-500">
                Tous les paiements par Mobile Money (Orange Money, MTN MoMo, Moov, Wave) sont pris en charge directement par notre prestataire agréé <strong>MoneyFusion</strong>. EbookStore Afrique ne collecte, ne stocke ni ne traite aucune donnée bancaire, information de carte bancaire ou mot de passe de compte Mobile Money sur ses propres serveurs.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">5.</span> Cookies et stockage local (localStorage)
          </h3>
          <p>
            EbookStore Afrique utilise uniquement des technologies techniques de stockage local strictement nécessaires à la fourniture de nos services en ligne :
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Cookies d'authentification :</strong> Gérés automatiquement par Supabase, ils servent uniquement à maintenir votre session ouverte de manière sécurisée lors de votre navigation d'une page à l'autre.
            </li>
            <li>
              <strong>Clés du stockage local (localStorage) :</strong> Utilisées pour retenir temporairement le code d'affiliation du parrain afin d'assurer l'enregistrement légitime des commissions de vente, ainsi que l'état d'installation de notre PWA (Progressive Web App).
            </li>
          </ul>
          <p className="mt-2">
            Aucun cookie de suivi ou de ciblage publicitaire tiers n'est installé sur votre navigateur par notre service.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 font-mono font-bold">6.</span> Vos droits et contact d'assistance
          </h3>
          <p>
            Conformément à la législation internationale sur la protection des données privées, vous disposez d'un droit d'accès, de rectification, de portabilité et de suppression de toutes vos données personnelles conservées sur nos systèmes.
          </p>
          <p className="mt-2">
            Pour toute demande d'assistance ou d'exercice de vos droits (par exemple pour demander la suppression de votre profil ou la modification d'un numéro de téléphone d'affiliation erroné), vous pouvez nous contacter directement par e-mail à l'adresse officielle de notre gérant :
          </p>
          <div className="flex gap-3 p-4 bg-slate-50 border border-slate-150 rounded-2xl items-center w-fit mt-3">
            <Mail className="h-5 w-5 text-indigo-600 shrink-0" />
            <a href="mailto:techsen237@gmail.com" className="font-mono font-bold text-indigo-600 hover:underline">
              techsen237@gmail.com
            </a>
          </div>
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
