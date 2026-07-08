# 🚀 GUIDE DE DÉPLOIEMENT CLOUDFLARE (EBOOK STORE)

Ce guide décrit comment déployer cette plateforme d'ebooks de production sur **Cloudflare** et connecter vos bases de données **Supabase** et l'API de paiement **MoneyFusion**.

---

## 1. CONFIGURATION DE SUPABASE

Pour que le système fonctionne, vous devez créer les tables et configurer la sécurité RLS.

1. Allez sur votre tableau de bord [Supabase](https://supabase.com).
2. Ouvrez l'éditeur SQL (**SQL Editor**) de votre projet.
3. Copiez le contenu du fichier `supabase_schema.sql` (situé à la racine de ce projet).
4. Collez-le dans l'éditeur et cliquez sur **Run**.
5. Allez dans **Storage** et créez deux buckets :
   - `couvertures` (Réglez-le sur **Public**) - Pour stocker les images de couverture de vos ebooks.
   - `ebooks-fichiers` (Laissez-le sur **Privé**) - Pour stocker les fichiers PDF des ebooks de manière sécurisée.

---

## 2. CONFIGURATION DE CLOUDFLARE PAGES / WORKERS

Cette application utilise une architecture full-stack (React/Vite + Express). Sur Cloudflare, vous pouvez la déployer de deux manières :
- **Cloudflare Pages** : Idéal pour héberger le frontend et lier les routes API à des Workers intégrés.
- **Docker sur Cloud Run** (Hébergement par défaut recommandé pour Express) : Vous pouvez l'héberger sur GCP Cloud Run et utiliser Cloudflare pour gérer votre **DNS, SSL/TLS, Caching et Protection DDoS**.

### Option Recommandée : Cloudflare DNS + Hébergement Container (Docker/Cloud Run)

1. **Déploiement du conteneur** : Déployez cette application sur GCP Cloud Run ou un VPS Node.js.
2. **Configuration DNS** : Dans Cloudflare, ajoutez un enregistrement `CNAME` pointant votre sous-domaine (ex: `boutique.votre-domaine.com`) vers l'URL fournie par votre hébergeur.
3. **Sécurité SSL** : Activez le mode SSL/TLS **Strict** ou **Flexible** dans Cloudflare pour chiffrer toutes les communications.
4. **Configuration des variables d'environnement** sur votre hébergeur :

```env
# Clés d'API requises (A NE JAMAIS EXPOSER SUR LE CLIENT)
VITE_SUPABASE_URL="https://votredomaine.supabase.co"
VITE_SUPABASE_ANON_KEY="votre-anon-key-de-supabase"
SUPABASE_SERVICE_ROLE_KEY="votre-service-role-key-secret"

# MoneyFusion API
MONEYFUSION_API_URL="https://www.pay.moneyfusion.net/paiement"
MONEYFUSION_PRIVATE_KEY="votre-private-key-moneyfusion"

# Nom de domaine public
APP_URL="https://boutique.votre-domaine.com"
SITE_URL="https://boutique.votre-domaine.com"
```

---

## 3. CONFIGURATION DE L'API MONEYFUSION

Pour activer les paiements mobiles réels :

1. Connectez-vous à votre dashboard **MoneyFusion**.
2. Récupérez vos informations d'identification d'API de production.
3. Dans la configuration de votre projet MoneyFusion, définissez l'URL du webhook de notification :
   - `https://boutique.votre-domaine.com/api/webhook/moneyfusion`
4. Spécifiez l'URL de retour (`return_url`) :
   - `https://boutique.votre-domaine.com/mes-achats`

---

## 4. TESTS DE PRODUCTION

Une fois déployé :
1. Inscrivez un nouvel utilisateur sur votre plateforme.
2. Connectez-vous au Back-office admin (en assignant temporairement le rôle `'admin'` dans la table `profiles` de Supabase à votre utilisateur).
3. Ajoutez un livre en remplissant le titre, le prix, l'image de couverture et le nom du fichier PDF (uploadé au préalable dans le bucket privé `ebooks-fichiers` de Supabase).
4. Essayez d'acheter l'ebook. Vous serez redirigé vers la passerelle sécurisée de MoneyFusion.
5. Effectuez le paiement mobile money. Une fois validé, MoneyFusion notifiera votre endpoint `/api/webhook/moneyfusion`.
6. Allez sur **"Mes Achats"**, votre livre sera débloqué et le bouton **Télécharger** génèrera un lien signé Supabase Storage de 60 secondes sécurisé.
