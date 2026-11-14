// ============================================================
// Suivi des entrées : un billet ne passe qu'une fois, un billet supprimé est refusé.
// Utilise un COMPTE DE SERVICE Firebase (variable FIREBASE_SERVICE_ACCOUNT) pour lire/écrire
// Firestore depuis le serveur, sans dépendance npm. Actif seulement si FIREBASE_SERVICE_ACCOUNT
// ET CONTROLE_CODE sont définis : sinon le vérificateur contrôle seulement la signature.
// ============================================================
const crypto = require("crypto");
const { PROJECT_ID } = require("./tickets");

let cache = { token: "", exp: 0 };
function compte() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try { const j = JSON.parse(raw); return j.client_email && j.private_key ? j : null; } catch (e) { return null; }
}
function actif() { return !!compte() && !!process.env.CONTROLE_CODE; }

const b64 = function (x) { return Buffer.from(x).toString("base64url"); };
async function jeton() {
  const now = Math.floor(Date.now() / 1000);
  if (cache.token && cache.exp - 60 > now) return cache.token;
  const c = compte(); if (!c) throw new Error("FIREBASE_SERVICE_ACCOUNT invalide");
  const tete = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const corps = b64(JSON.stringify({ iss: c.client_email, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = crypto.createSign("RSA-SHA256").update(tete + "." + corps).sign(c.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + encodeURIComponent(tete + "." + corps + "." + sig),
  });
  if (!r.ok) throw new Error("Jeton Google refusé (" + r.status + ")");
  const j = await r.json(); cache = { token: j.access_token, exp: now + (j.expires_in || 3600) };
  return cache.token;
}
const BASE = function () { return "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/(default)/documents/billets/"; };

async function lire(id) {
  const r = await fetch(BASE() + encodeURIComponent(id), { headers: { Authorization: "Bearer " + await jeton() } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Firestore " + r.status);
  const j = await r.json(), f = j.fields || {};
  return { updateTime: j.updateTime, sig: f.sig && f.sig.stringValue, scanneAt: f.scanneAt ? f.scanneAt.timestampValue : null };
}
// true = marqué ; false = quelqu'un d'autre a modifié le billet entre-temps (deux scans simultanés)
async function marquer(id, updateTime, iso) {
  const url = BASE() + encodeURIComponent(id) + "?updateMask.fieldPaths=scanneAt&currentDocument.updateTime=" + encodeURIComponent(updateTime);
  const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + await jeton() }, body: JSON.stringify({ fields: { scanneAt: { timestampValue: iso } } }) });
  if (r.ok) return true;
  if (r.status === 400 || r.status === 409 || r.status === 412) return false;
  throw new Error("Firestore " + r.status);
}
function quand(iso) {
  return new Date(iso).toLocaleString("fr-FR", { timeZone: "Africa/Lubumbashi", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}
function codeOk(saisi) {
  const h = function (x) { return crypto.createHash("sha256").update(String(x || "")).digest(); };
  return crypto.timingSafeEqual(h(saisi), h(process.env.CONTROLE_CODE || "\u0000"));
}
module.exports = { actif, lire, marquer, quand, codeOk };
