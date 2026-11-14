// Petits outils partagés (site public + admin). Aucune donnée utilisateur n'est
// jamais injectée via innerHTML : tout passe par textContent (anti-XSS).
export const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

export function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d) ? null : d;
}
export function formatDate(v) {
  const d = toDate(v);
  return d ? d.getDate() + " " + MOIS[d.getMonth()] + " " + d.getFullYear() : "";
}
export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
export function paragraphs(container, text) {
  String(text || "").split(/\n+/).forEach(function (line) {
    if (line.trim()) container.appendChild(el("p", null, line));
  });
}
export function safeImg(src) {
  return typeof src === "string" &&
    (/^data:image\/(jpeg|png|webp);base64,/.test(src) || /^images\/[\w.-]+\.(jpe?g|png|webp)$/.test(src));
}
// Coupe un texte trop long et ajoute "..."
export function tronquer(txt, n) {
  const t = String(txt || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "..." : t;
}
// Petites icônes SVG (à la place des emojis). Contenu statique, jamais de données utilisateur.
const ICONES = {
  oeil: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  lien: '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/>',
  epingle: '<path d="M12 17v5"/><path d="M9 3h6l-1 6 3 4H7l3-4z"/>',
  tel: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
};
export function icone(nom, taille) {
  const t = taille || 15;
  const span = document.createElement("span");
  span.className = "ico";
  span.innerHTML = '<svg width="' + t + '" height="' + t + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONES[nom] || "") + '</svg>';
  return span;
}
export function avecIcone(nom, texte, taille) {
  const s = document.createElement("span");
  s.className = "ico-txt";
  s.appendChild(icone(nom, taille));
  s.appendChild(document.createTextNode(" " + texte));
  return s;
}
export function initials(name) {
  const p = String(name || "?").trim().split(/\s+/);
  return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
export function stars(n) {
  n = Math.max(0, Math.min(5, parseInt(n, 10) || 0));
  return "★".repeat(n) + "☆".repeat(5 - n);
}
// Anti-spam simple côté navigateur (la vraie protection est dans firestore.rules)
export function cooldownOk(key, ms) {
  try {
    const last = parseInt(localStorage.getItem(key) || "0", 10);
    if (Date.now() - last < ms) return false;
    localStorage.setItem(key, String(Date.now()));
  } catch (e) {}
  return true;
}
// Redimensionne une photo côté navigateur -> data URL JPEG légère
// fond (facultatif) : couleur de fond, utile pour les logos PNG transparents (le JPEG n'a pas de transparence)
export function resizeImage(file, max, quality, square, fond) {
  return new Promise(function (resolve, reject) {
    if (!file || !/^image\//.test(file.type)) return reject(new Error("Fichier non valide"));
    if (file.size > 15 * 1024 * 1024) return reject(new Error("Image trop lourde (15 Mo max)"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (square) { const s = Math.min(sw, sh); sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s; }
      const k = Math.min(1, max / Math.max(sw, sh));
      const c = document.createElement("canvas");
      c.width = Math.round(sw * k); c.height = Math.round(sh * k);
      const ctx = c.getContext("2d");
      if (fond) { ctx.fillStyle = fond; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Image illisible")); };
    img.src = url;
  });
}
export const TYPES = {
  actualite: "Actualité", annonce: "Annonce", communique: "Communiqué",
  message: "Message", evenement: "Événement", autre: "Autre",
};

// Liens vers une publication sur un réseau social (Facebook, Instagram, TikTok).
// Renvoie l'adresse https nettoyée, ou "" si ce n'est pas un vrai lien de ce réseau.
export const RESEAUX = [
  { cle: "lienFacebook",  nom: "Facebook",  domaines: ["facebook.com", "fb.com", "fb.watch", "fb.me"],              img: "footer/facebook.png" },
  { cle: "lienInstagram", nom: "Instagram", domaines: ["instagram.com", "instagr.am"],                              img: "footer/insta.png" },
  { cle: "lienTiktok",    nom: "TikTok",    domaines: ["tiktok.com"],                                               img: "icons/tok.png" },
];
export function lienReseau(valeur, reseau) {
  let v = String(valeur || "").trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  let u;
  try { u = new URL(v); } catch (e) { return ""; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return "";
  const h = u.hostname.toLowerCase();
  const ok = reseau.domaines.some(function (d) { return h === d || h.endsWith("." + d); });
  return ok ? u.href.slice(0, 500) : "";
}
