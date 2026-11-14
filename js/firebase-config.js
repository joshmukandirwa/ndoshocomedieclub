// ============================================================
// CONFIGURATION FIREBASE — à remplir une seule fois
// (voir ADMIN-SETUP.md, étape 2). Ces valeurs ne sont PAS des
// secrets : la sécurité vient des règles Firestore (firestore.rules)
// et de la connexion admin.
// Tant que "VOTRE_" est présent, le site reste en mode démo :
// formulaires qui basculent sur WhatsApp, aucun contenu dynamique.
// ============================================================
export const firebaseConfig = {
  apiKey: "AIzaSyBGq0OXBzwY5MTLxq8yVbjTOlMxz52UbDE",
  authDomain: "ndosho-comedie-club.firebaseapp.com",
  projectId: "ndosho-comedie-club",
  storageBucket: "ndosho-comedie-club.firebasestorage.app",
  messagingSenderId: "312782908800",
  appId: "1:312782908800:web:0ee9529a06129c6c8d6565",
};

// Email du compte admin (le même que dans firestore.rules > isAdmin).
export const adminEmails = ["ndosho.comedie.club.cto@gmail.com"];
