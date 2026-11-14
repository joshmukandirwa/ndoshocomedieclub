# Espace admin — mise en route (une seule fois, ~10 min)

Le site fonctionne **déjà en mode démo** (exemples affichés, formulaires qui basculent sur WhatsApp).
Pour activer le vrai système (messages, témoignages à valider, actualités, vues), il faut connecter Firebase.

## 1. Créer le projet Firebase
1. Allez sur https://console.firebase.google.com → **Ajouter un projet** (nom : ex. `ndosho-comedie-club`).
2. **Créer une base de données Firestore** (mode production, région proche, ex. `eur3`).
   *Pas besoin de Firebase Storage : les photos sont réduites et stockées directement dans Firestore.*

## 2. Brancher le site
1. Paramètres du projet → **Vos applications** → icône `</>` (Web) → enregistrer l'appli.
2. Copiez les valeurs `firebaseConfig` dans **`js/firebase-config.js`**.
3. **Authentication** → Méthode de connexion → activer **Email / Mot de passe**.
4. Authentication → Domaines autorisés → ajouter `ndosho-comedie-club.vercel.app`.

## 3. Créer le compte admin (SÉCURITÉ)
Authentication → Utilisateurs → **Ajouter un utilisateur** (votre email + un mot de passe LONG et unique).
Cet email est le seul admin : il est écrit dans `js/firebase-config.js` (adminEmails) et dans `firestore.rules` (isAdmin).
Aucune création d'admin n'est possible depuis le site.

## 4. Publier les règles de sécurité
Firestore → onglet **Règles** → collez tout le contenu de **`firestore.rules`** → **Publier**.

## 4 bis. Aperçu des liens partagés (WhatsApp, Facebook...)
Pour que le lien d'une actualité partagée affiche son image et son titre :
Vercel → votre projet → **Settings → Environment Variables** → ajouter `FIREBASE_PROJECT_ID` = la valeur de `projectId`
(la même que dans `js/firebase-config.js`) → **Redeploy**. Sans cela le partage marche quand même, mais sans aperçu.

## 5. Utiliser l'admin
Ouvrez `https://ndosho-comedie-club.vercel.app/admin.html` (page non référencée par Google).
- **Messages** : tout ce qui est envoyé depuis la page Contacts, avec réponse en un clic (WhatsApp / email).
- **Témoignages** : ceux reçus (avec photo) arrivent « En attente » → *Approuver et publier* les affiche sur le site (carousel accueil + page Témoignages). Le numéro de téléphone n'est jamais publié.
- **Actualités** : publiez actualités, annonces, communiqués, messages, événements (image possible, épinglage, brouillon). Chaque ouverture compte une vue (1 par visiteur et par session).

## Sécurité mise en place
- Connexion Firebase Auth + liste blanche `admins` ; session fermée avec l'onglet et après 30 min d'inactivité ; blocage après 5 essais ratés.
- Règles Firestore : le public peut seulement envoyer (messages/témoignages validés en taille et format) et lire le contenu publié ; il ne peut ajouter que +1 au compteur de vues.
- Anti-spam : champ piège invisible + délai entre deux envois. Pour aller plus loin : activer **App Check** (reCAPTCHA) dans Firebase.
- Tout le contenu affiché est échappé (pas d'injection de code possible via un témoignage).

## Exemples de démonstration
Les 5 témoignages et 5 actualités d'exemple sont dans `js/data-exemples.js`. Ils disparaissent automatiquement
dès qu'un vrai contenu est publié. Pour les retirer avant, videz les deux tableaux de ce fichier.

## ⚠ À savoir : `admin-billets.html`
Cette page (génération des billets) n'a **pas** été modifiée : son mot de passe et la clé de signature des billets
sont visibles dans le code (`js/admin-billets.js`). Elle n'est donc pas réellement sécurisée. Pour la sécuriser
il faut signer les billets côté serveur (fonction Vercel) — à faire dans une prochaine étape.
