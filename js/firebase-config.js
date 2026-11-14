// ============================================================
// CONFIGURATION FIREBASE — à remplir une seule fois
// (voir ADMIN-SETUP.md, étape 2). Ces valeurs ne sont PAS des
// secrets : la sécurité vient des règles Firestore (firestore.rules)
// et de la connexion admin.
// Tant que "VOTRE_" est présent, le site reste en mode démo :
// exemples affichés et formulaires qui basculent sur WhatsApp.
// ============================================================
export const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJET.firebaseapp.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJET.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID",
};

// Email du compte admin (le même que dans firestore.rules > isAdmin).
export const adminEmails = ["ndosho.comedie.club.cto@gmail.com"];
