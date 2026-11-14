# Espace admin — mise en route (une seule fois, ~10 min)

Le site fonctionne **déjà en mode démo** (formulaires qui basculent sur WhatsApp).
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

## 6. Billets signés côté serveur (étape 3)
Les billets se génèrent maintenant dans **admin.html → Billets** (derrière la connexion Firebase) et la liste est dans **Réservations**.
La signature est faite par les fonctions Vercel du dossier `api/` : la clé n'est plus dans le code du site.

1. Générez une clé aléatoire (sur votre PC, avec Node) : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Vercel → votre projet → **Settings → Environment Variables** → ajoutez `TICKET_SECRET` = cette clé (Production, Preview et Development) → **Redeploy**.
3. Firebase → Firestore → **Règles** → collez le nouveau `firestore.rules` → **Publier** (ajoute les collections `billets` et `evenements`, réservées à l'admin).
4. Supprimez le fichier `js/admin-billets.js` du dépôt (il contient l'ancien mot de passe et l'ancienne clé, désormais inutiles). `admin-billets.html` redirige vers la nouvelle page.
5. Variables facultatives : `ADMIN_EMAILS` (liste d'emails séparés par des virgules, par défaut l'email de `firebase-config.js`) et `LEGACY_TICKET_SECRET` (voir ci-dessous).

**Anciens billets déjà envoyés** : ils étaient signés avec l'ancienne clé, donc ils seront refusés. Pour les accepter le temps de l'événement, ajoutez `LEGACY_TICKET_SECRET` = l'ancienne clé (`NDOSHO-2026-CLE-SECRETE-BILLETS`) puis retirez-la dès que possible : tant qu'elle est active, n'importe qui qui l'a lue peut fabriquer un faux billet.

**Suivi des entrées (un billet ne passe qu'une fois)** — facultatif mais recommandé :
1. Firebase → ⚙ Paramètres du projet → **Comptes de service** → **Générer une nouvelle clé privée** : un fichier `.json` se télécharge. Ne le mettez jamais dans le dépôt GitHub.
2. Vercel → Environment Variables → `FIREBASE_SERVICE_ACCOUNT` = tout le contenu du fichier `.json` collé tel quel.
3. Vercel → `CONTROLE_CODE` = un code d'au moins 6 caractères, à donner à l'équipe de la porte.
4. Redéployez. Sur `verifier-billets.html`, un billet valide affiche maintenant « Confirmer l'entrée » (le code est demandé une fois). Un 2e scan affiche « BILLET DÉJÀ UTILISÉ » avec l'heure ; un billet supprimé de Réservations est refusé. Sans ces deux variables, tout continue à marcher comme avant (signature seule).
Les anciens billets (`LEGACY_TICKET_SECRET`) ne sont pas suivis.

**Événements sur le site public** : dans admin → Événements, cochez « Afficher sur le site public » : l'événement apparaît dans « Les autres rendez-vous » de `evenements.html` (jusqu'à sa date), avec un bouton de partage, et dans la liste « Agenda » de l'accueil (3 événements au maximum, celui écrit à la main compris). Les événements non cochés restent privés. L'affiche « À la une » (Punguza Stress) reste écrite à la main dans la page : ne cochez pas « public » pour cet événement, sinon il apparaîtrait deux fois. Tout ce qui est coché (titre, date, lieu, description) est lisible par tout le monde : pour un lieu secret, mettez « Lieu à dévoiler » dans le champ Lieu. Pensez à republier `firestore.rules`.

**Humoristes** : admin → Humoristes. Au premier passage, cliquez « Importer les 6 humoristes » : les fiches actuelles du site (avec leurs photos du dossier `humoristes/`) sont reprises, puis vous pouvez les modifier, les réordonner (↑ ↓), les masquer ou en ajouter (photo envoyée depuis le téléphone, redimensionnée automatiquement). Dès qu'au moins un humoriste est « Sur le site », la page `humoristes.html` et la rangée de l'accueil (4 premiers + « Voir tous ») affichent cette liste ; sinon, la liste écrite dans les pages reste affichée. Pensez à republier `firestore.rules`.

**Partenaires** : admin → Partenaires. Au premier passage, « Importer les 10 partenaires » reprend les logos actuels (dossier `partenaires/`). Ensuite : ajouter (logo envoyé depuis le téléphone, mis sur fond blanc), ajouter un site web (le logo devient cliquable, seuls les liens http/https sont acceptés), réordonner, masquer, supprimer. La page `partenaires.html` et les mini-logos de « À propos » (7 premiers) affichent cette liste dès qu'un partenaire est « Sur le site » ; sinon la liste écrite dans les pages reste affichée. Pensez à republier `firestore.rules`.

**Contrôle à l'entrée** : `verifier-billets.html` appelle `/api/verifier` : il faut donc une connexion internet sur le téléphone qui scanne.

**Test en local** : les fonctions `api/` ne tournent pas en ouvrant les fichiers directement ; utilisez `vercel dev` ou testez après déploiement.

**Réservations en ligne (Punguza Stress, 2e édition)** : `reservation.html` enregistre la demande du client (nom, téléphone, catégorie Standard / VIP / VVIP) puis l'envoie sur WhatsApp. Elle apparaît dans admin → Réservations → « Demandes en attente ». Une fois le paiement réglé sur WhatsApp, cliquez « Valider et créer le billet » : le générateur se pré-remplit, saisissez le montant payé, générez le billet et envoyez-le par WhatsApp. La catégorie est écrite dans le nom de l'événement du billet (ex : « Festival Punguza Stress — 2e édition · VIP »). Pensez à republier `firestore.rules` (collection `reservations`).
