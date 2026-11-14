// ============================================================
// Outils partagés des fonctions billets (côté serveur uniquement).
// La clé de signature vient de la variable d'environnement
// TICKET_SECRET (Vercel > Settings > Environment Variables) :
// elle n'est JAMAIS dans le code ni envoyée au navigateur.
// ============================================================
const crypto = require("crypto");

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "ndosho-comedie-club";
// Clé web Firebase : publique par nature (déjà dans js/firebase-config.js)
const API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyBGq0OXBzwY5MTLxq8yVbjTOlMxz52UbDE";
const ADMINS = (process.env.ADMIN_EMAILS || "ndosho.comedie.club.cto@gmail.com")
  .split(",").map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);

function secret() {
  const s = process.env.TICKET_SECRET;
  if (!s || s.length < 24) throw new Error("TICKET_SECRET manquant ou trop court (24 caractères minimum)");
  return s;
}

// Nettoie un champ texte : pas de retours à la ligne (le QR est lu ligne par ligne), longueur limitée
function nettoyer(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

const CHAMPS = ["ticketId", "nom", "tel", "eventName", "eventDate", "eventLieu", "montant", "emissionDate"];

// Signature HMAC-SHA256. Le tableau JSON évite toute ambiguïté si un champ contient « | ».
function signer(t) {
  const base = JSON.stringify(["NDC2"].concat(CHAMPS.map(function (c) { return t[c] || ""; })));
  return crypto.createHmac("sha256", secret()).update(base).digest("hex").slice(0, 32).toUpperCase();
}
// Ancien format (SHA-256 simple, 24 caractères). Accepté seulement si LEGACY_TICKET_SECRET est défini.
function signerAncien(t) {
  const s = process.env.LEGACY_TICKET_SECRET;
  if (!s) return null;
  const base = [t.ticketId, t.nom, t.tel, t.eventName, t.eventDate, t.eventLieu, t.montant, t.emissionDate, s].join("|");
  return crypto.createHash("sha256").update(base).digest("hex").slice(0, 24).toUpperCase();
}
function egal(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function signatureValide(t) {
  const sig = String(t.sig || "").toUpperCase();
  if (sig.length === 32) return egal(sig, signer(t)) ? "ok" : "";
  if (sig.length === 24) { const old = signerAncien(t); return old && egal(sig, old) ? "ancien" : ""; }
  return "";
}

// Texte du QR code (même format que l'ancien générateur : le vérificateur et mon-billet.html restent compatibles)
function texteQr(t) {
  return [
    "NDOSHO COMÉDIE CLUB — BILLET",
    "ID: " + t.ticketId, "Nom: " + t.nom, "Téléphone: " + t.tel, "Événement: " + t.eventName,
    "Date: " + t.eventDate, "Lieu: " + t.eventLieu, "Montant payé: " + t.montant, "Émis le: " + t.emissionDate,
    "SIG: " + t.sig, "Ce billet est unique et non transférable.",
  ].join("\n");
}
function lireQr(texte) {
  const d = {};
  String(texte || "").slice(0, 2000).split("\n").forEach(function (ligne) {
    const i = ligne.indexOf(":"); if (i === -1) return;
    const k = ligne.slice(0, i).trim(), v = ligne.slice(i + 1).trim();
    const map = { "ID": "ticketId", "Nom": "nom", "Téléphone": "tel", "Événement": "eventName", "Date": "eventDate", "Lieu": "eventLieu", "Montant payé": "montant", "Émis le": "emissionDate", "SIG": "sig" };
    if (map[k]) d[map[k]] = v;
  });
  return d;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function nouvelId() {
  const b = crypto.randomBytes(8); let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[b[i] % ALPHABET.length];
  return "NDC-" + s;
}

// Vérifie le jeton de connexion Firebase envoyé par admin.js et renvoie l'email s'il est admin
async function emailAdmin(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (!m) return null;
  const r = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + API_KEY, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: m[1] }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  const u = j.users && j.users[0];
  const mail = u && u.email ? String(u.email).toLowerCase() : "";
  return ADMINS.indexOf(mail) !== -1 ? { email: mail, token: m[1] } : null;
}

// Enregistre le billet dans Firestore AVEC le jeton de l'admin : les règles Firestore s'appliquent (isAdmin)
async function enregistrer(token, t) {
  const champs = {};
  Object.keys(t).forEach(function (k) {
    const v = t[k];
    champs[k] = typeof v === "number" ? { doubleValue: v } : k === "createdAt" ? { timestampValue: v } : { stringValue: String(v) };
  });
  const url = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/(default)/documents/billets?documentId=" + encodeURIComponent(t.ticketId);
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ fields: champs }) });
  if (!r.ok) { const e = new Error("Firestore " + r.status); e.status = r.status; throw e; }
}

module.exports = { PROJECT_ID, nettoyer, signer, signatureValide, texteQr, lireQr, nouvelId, emailAdmin, enregistrer };
