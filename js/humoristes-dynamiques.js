// Humoristes gérés depuis l'admin (Humoristes → « Afficher sur le site »).
// Page humoristes.html : remplace la grille ; accueil : remplace la rangée (4 premiers + « Voir tous »).
// S'il n'y a aucun humoriste public (ou si Firebase est indisponible), la liste écrite dans la page reste telle quelle.
import { isConfigured, db, collection, getDocs, query, where, limit } from "./firebase.js";
import { el } from "./utils.js";

function photoOk(v) {
  return typeof v === "string" && (/^data:image\/(jpeg|png|webp);base64,/.test(v) || /^humoristes\/[\w .-]+\.(jpe?g|png|webp)$/i.test(v));
}
function image(h) {
  if (!photoOk(h.photo)) return null;
  const im = document.createElement("img");
  im.src = h.photo.indexOf("data:") === 0 ? h.photo : "./" + encodeURI(h.photo);
  im.alt = h.nom; im.loading = "lazy"; im.decoding = "async";
  return im;
}
function carteGrille(h) {
  const c = el("div", "comed"), im = image(h); if (im) c.appendChild(im);
  const t = el("div", "comedian-content"); t.appendChild(el("h3", null, h.nom)); t.appendChild(el("span", "label-orange", h.role || "Humoriste"));
  c.appendChild(t); return c;
}
function carteAccueil(h) {
  const c = el("div", "hr-card"), im = image(h); if (im) c.appendChild(im);
  c.appendChild(el("span", "hr-name", h.nom)); return c;
}

(async function () {
  const grille = document.querySelector(".humor-full-grid"), rangee = document.getElementById("humorRow");
  if (!isConfigured || (!grille && !rangee)) return;
  let liste = [];
  try {
    const snap = await getDocs(query(collection(db, "humoristes"), where("public", "==", true), limit(100)));
    liste = snap.docs.map(function (d) { return d.data(); });
  } catch (e) { console.warn("Humoristes : lecture impossible", e); return; }
  liste = liste.filter(function (h) { return h.nom; }).sort(function (a, b) { return (a.ordre || 0) - (b.ordre || 0); });
  if (!liste.length) return;

  if (grille) { grille.textContent = ""; liste.forEach(function (h) { grille.appendChild(carteGrille(h)); }); }
  if (rangee) {
    const tous = rangee.querySelector(".hr-all");
    if (rangee.__stop) rangee.__stop();            // arrête le défilement automatique de index.js
    rangee.scrollLeft = 0;
    rangee.textContent = "";
    liste.slice(0, 4).forEach(function (h) { rangee.appendChild(carteAccueil(h)); });
    if (tous) rangee.appendChild(tous);
    if (window.ndoshoAutoLoop) window.ndoshoAutoLoop(rangee, 0.5); // relance la boucle avec les nouvelles cartes
  }
})();
