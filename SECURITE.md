# Sécurité — à faire dans les consoles (5 minutes)

## Firebase > Authentication
- Réglages > Actions de l'utilisateur : **désactiver « Activer la création (inscription) »** (personne d'autre ne doit pouvoir créer un compte).
- Activer la validation en deux étapes sur le compte Google de l'admin (ndosho.comedie.club.cto@gmail.com), avec un mot de passe long et unique.

## Google Cloud > API et services > Identifiants
- Clé API web : **restreindre aux référents HTTP** (https://ndosho-comedie-club.vercel.app/*) et aux API Identity Toolkit, Firestore, Token Service.

## Firebase > App Check
- Activer App Check (reCAPTCHA v3) sur Firestore pour limiter le spam des formulaires (contact, témoignages, réservations, compteur de vues).

## Vercel > Settings > Environment Variables
- TICKET_SECRET : 32 caractères aléatoires minimum, jamais partagé.
- CONTROLE_CODE : 8 caractères minimum (pas une date ni un numéro). Changez-le si une personne de l'équipe part.
- FIREBASE_SERVICE_ACCOUNT : ne jamais le mettre dans le code ni dans le zip.

## Firestore
- Republier firestore.rules après chaque modification.

## En-têtes de sécurité (vercel.json)
- Content-Security-Policy-Report-Only est en mode test : ouvrez chaque page avec la console du navigateur (F12) ; s'il n'y a aucune alerte « CSP », renommez la clé en Content-Security-Policy pour l'activer.
