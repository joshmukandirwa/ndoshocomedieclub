// Galerie gérée depuis l'admin (Galerie → « Afficher sur le site »).
// Page galerie.html : remplace toute la grille ; accueil : remplace la rangée « Nos meilleurs moments » (6 premières).
// S'il n'y a aucune photo publique (ou si Firebase est indisponible), les photos écrites dans la page restent telles quelles.
import { isConfigured, db, collection, getDocs, query, where, limit } from "./firebase.js";

function photoOk(v) {
  return typeof v === "string" && (/^data:image\/(jpeg|png|webp);base64,/.test(v) || /^[\w\u00C0-\u017F-]+\/[\w\u00C0-\u017F .()-]+\.(jpe?g|png|webp)$/i.test(v));
}
function image(g, i) {
  const im = document.createElement("img");
  im.src = g.photo.indexOf("data:") === 0 ? g.photo : "./" + encodeURI(g.photo);
  im.alt = "Galerie " + (i + 1); im.loading = "lazy"; im.decoding = "async";
  return im;
}

(async function () {
  const accueil = document.querySelector(".galerie-grid"), pleine = document.getElementById("galFullGrid");
  if (!isConfigured || (!accueil && !pleine)) return;
  let liste = [];
  try {
    const snap = await getDocs(query(collection(db, "galerie"), where("public", "==", true), limit(200)));
    liste = snap.docs.map(function (d) { return d.data(); });
  } catch (e) { console.warn("Galerie : lecture impossible", e); return; }
  liste = liste.filter(function (g) { return photoOk(g.photo); }).sort(function (a, b) { return (a.ordre || 0) - (b.ordre || 0); });
  if (!liste.length) return;

  if (pleine) { pleine.textContent = ""; liste.forEach(function (g, i) { pleine.appendChild(image(g, i)); }); }
  if (accueil) {
    if (accueil.__stop) accueil.__stop();            // arrête le défilement automatique de index.js
    accueil.scrollLeft = 0;
    accueil.textContent = "";
    liste.slice(0, 6).forEach(function (g, i) { accueil.appendChild(image(g, i)); });
    if (window.ndoshoAutoLoop) window.ndoshoAutoLoop(accueil, 0.6); // relance la boucle avec les nouvelles photos
  }
})();
