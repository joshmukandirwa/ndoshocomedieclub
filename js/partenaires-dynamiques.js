// Partenaires gérés depuis l'admin (Partenaires → « Afficher sur le site »).
// Page partenaires.html : remplace la grille ; page « À propos » : remplace les mini-logos (7 premiers).
// S'il n'y a aucun partenaire public (ou si Firebase est indisponible), la liste écrite dans les pages reste affichée.
import { isConfigured, db, collection, getDocs, query, where, limit } from "./firebase.js";
import { el } from "./utils.js";

function logoOk(v) {
  return typeof v === "string" && (/^data:image\/(jpeg|png|webp);base64,/.test(v) || /^partenaires\/[\w .-]+\.(jpe?g|png|webp)$/i.test(v));
}
function lienOk(v) { return typeof v === "string" && /^https?:\/\//i.test(v) ? v : ""; }
function image(p) {
  if (!logoOk(p.logo)) return null;
  const im = document.createElement("img");
  im.src = p.logo.indexOf("data:") === 0 ? p.logo : "./" + encodeURI(p.logo);
  im.alt = p.nom; im.loading = "lazy"; im.decoding = "async";
  return im;
}
// enveloppe l'image dans un lien externe si le partenaire a un site
function avecLien(p, noeud) {
  const href = lienOk(p.lien); if (!href) return noeud;
  const a = el("a"); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; a.title = p.nom; a.setAttribute("aria-label", p.nom + " (nouvel onglet)");
  a.style.display = "contents"; a.appendChild(noeud); return a;
}
function carteGrille(p) {
  const c = el("article", "part-card"), logo = el("div", "part-logo"), im = image(p);
  if (im) logo.appendChild(im); else logo.appendChild(el("b", null, p.nom));
  c.appendChild(avecLien(p, logo)); return c;
}
function miniLogo(p) {
  const li = el("li"); li.title = p.nom; const im = image(p);
  if (im) li.appendChild(avecLien(p, im)); else li.textContent = p.nom;
  return li;
}

(async function () {
  const grille = document.querySelector(".part-grid"), mini = document.querySelector(".mini-logos");
  if (!isConfigured || (!grille && !mini)) return;
  let liste = [];
  try {
    const snap = await getDocs(query(collection(db, "partenaires"), where("public", "==", true), limit(100)));
    liste = snap.docs.map(function (d) { return d.data(); });
  } catch (e) { console.warn("Partenaires : lecture impossible", e); return; }
  liste = liste.filter(function (p) { return p.nom; }).sort(function (a, b) { return (a.ordre || 0) - (b.ordre || 0); });
  if (!liste.length) return;
  if (grille) { grille.textContent = ""; liste.forEach(function (p) { grille.appendChild(carteGrille(p)); }); }
  if (mini) { mini.textContent = ""; liste.slice(0, 7).forEach(function (p) { mini.appendChild(miniLogo(p)); }); }
})();
