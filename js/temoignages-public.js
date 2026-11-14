// Carousel des témoignages APPROUVÉS (accueil + page témoignages).
// Lit la collection publique "temoignages_publics" (sans numéro de téléphone).
import { isConfigured, db, collection, doc, getDoc, getDocs, query, orderBy, limit } from "./firebase.js";
import { el, safeImg, initials, stars, tronquer, icone } from "./utils.js";

async function charger() {
  if (!isConfigured) return [];
  try {
    const snap = await getDocs(query(collection(db, "temoignages_publics"), orderBy("date", "desc"), limit(30)));
    const items = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    // même auteur + même message = un seul témoignage affiché
    const vus = {};
    return items.filter(function (t) {
      const cle = String(t.nom || "").trim().toLowerCase() + "|" + String(t.message || "").trim().toLowerCase();
      if (vus[cle]) return false; vus[cle] = true; return true;
    });
  } catch (e) {
    console.warn("Témoignages : lecture impossible", e);
    return [];
  }
}

var LISTE = [];

function carte(t, i) {
  const card = el("div", "avis");
  card.dataset.i = String(i);
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  const av = el("div", "av");
  av.appendChild(el("span", "quote-mark", "\u201C"));
  const long = String(t.message || "").length > 150;
  av.appendChild(el("p", null, tronquer(t.message, 150)));
  if (long) av.appendChild(el("span", "avis-plus", "Lire la suite"));
  card.appendChild(av);

  const stark = el("div", "stark");
  if (safeImg(t.photo)) {
    const img = el("img", "avis-avatar");
    img.src = t.photo; img.alt = t.nom; img.loading = "lazy";
    stark.appendChild(img);
  } else {
    stark.appendChild(el("span", "avis-avatar avis-avatar--init", initials(t.nom)));
  }
  const who = el("div", "avis-who");
  who.appendChild(el("h4", null, t.nom));
  const st = el("div", "stars", stars(t.note));
  st.setAttribute("aria-label", "Note : " + t.note + " sur 5");
  who.appendChild(st);
  stark.appendChild(who);
  card.appendChild(stark);
  return card;
}

// ---------- partage (lien avec aper\u00e7u : photo + nom + extrait du t\u00e9moignage) ----------
var toast;
function afficherToast(msg) {
  if (!toast) { toast = el("div", "actu-toast"); toast.setAttribute("role", "status"); document.body.appendChild(toast); }
  toast.textContent = msg; toast.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(function () { toast.classList.remove("show"); }, 2200);
}
function lienPartage(t) {
  // Vrais t\u00e9moignages : lien avec aper\u00e7u (image + titre) sur WhatsApp, Facebook...
  if (isConfigured && t.id) return location.origin + "/api/temoignage?id=" + encodeURIComponent(t.id);
  return location.origin + location.pathname.replace(/[^/]*$/, "") + "temoignages.html";
}
function copier(url) {
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { afficherToast("Lien copi\u00e9"); }, function () { afficherToast(url); });
  else afficherToast(url);
}
function partager(t) {
  var url = lienPartage(t);
  if (navigator.share) {
    navigator.share({ url: url }).catch(function (e) { if (e && e.name !== "AbortError") copier(url); });
  } else copier(url);
}

// ---------- fen\u00eatre pour lire un t\u00e9moignage en entier ----------
var modal;
function lire(t) {
  if (!modal) {
    modal = el("div", "actu-modal"); modal.hidden = true;
    modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
    const box = el("div", "actu-modal-box");
    const bar = el("div", "actu-modal-bar");
    const gauche = el("span");
    bar.appendChild(gauche);
    const droite = el("div", "temoig-bar-actions");
    const lien = el("button", "actu-modal-close temoig-share"); lien.type = "button";
    lien.setAttribute("aria-label", "Partager ce t\u00e9moignage"); lien.title = "Partager";
    lien.appendChild(icone("lien", 18));
    lien.addEventListener("click", function () { if (modal._t) partager(modal._t); });
    droite.appendChild(lien);
    const x = el("button", "actu-modal-close", "\u00d7"); x.type = "button"; x.setAttribute("aria-label", "Fermer");
    x.addEventListener("click", function () { modal.hidden = true; document.body.classList.remove("menu-lock"); });
    droite.appendChild(x);
    bar.appendChild(droite);
    box.appendChild(bar);
    box.appendChild(el("div", "actu-modal-body"));
    modal.appendChild(box);
    modal.addEventListener("click", function (e) { if (e.target === modal) x.click(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) x.click(); });
    document.body.appendChild(modal);
  }
  modal._t = t;
  const body = modal.querySelector(".actu-modal-body");
  body.textContent = "";
  const c = carte(t, 0);
  c.classList.add("avis--lecture");
  c.querySelector("p").textContent = t.message;
  const plus = c.querySelector(".avis-plus"); if (plus) plus.remove();
  body.appendChild(c);
  modal.hidden = false; document.body.classList.add("menu-lock");
}

function whenReady(cb) {
  if (window.ndoshoAutoLoop) cb();
  else window.addEventListener("DOMContentLoaded", cb);
}

// Lien partag\u00e9 (temoignages.html?t=ID) : ouvre directement ce t\u00e9moignage
async function ouvrirDepuisLien() {
  const id = new URLSearchParams(location.search).get("t");
  if (!id || !/^[\w-]{1,60}$/.test(id) || !isConfigured) return;
  let t = LISTE.find(function (x) { return x.id === id; });
  if (!t) {
    try {
      const d = await getDoc(doc(db, "temoignages_publics", id));
      if (d.exists()) t = Object.assign({ id: d.id }, d.data());
    } catch (e) { return; }
  }
  if (t) lire(t);
}

export async function initCarouselTemoignages() {
  const slider = document.getElementById("temoigSlider");
  if (!slider) return;
  LISTE = await charger();
  ouvrirDepuisLien();
  slider.textContent = "";
  if (!LISTE.length) {
    // Aucun témoignage publié : on cache le carousel et on invite à en laisser un
    const section = slider.closest("section");
    if (section && !section.querySelector(".temoig-vide")) {
      const p = el("p", "temoig-vide", "Soyez le premier à partager votre expérience avec le Ndosho Comédie Club !");
      const wrap0 = slider.closest(".temoig-slider-wrap");
      if (wrap0) wrap0.insertAdjacentElement("afterend", p); else section.appendChild(p);
    }
    return;
  }
  LISTE.forEach(function (t, i) { slider.appendChild(carte(t, i)); });
  const wrap = slider.closest(".temoig-slider-wrap");
  if (wrap) wrap.hidden = false;
  // Les copies cr\u00e9\u00e9es par la boucle perdent leurs \u00e9v\u00e9nements : on \u00e9coute le conteneur
  function ouvrir(e) {
    const c = e.target.closest(".avis"); if (!c) return;
    const t = LISTE[parseInt(c.dataset.i, 10)]; if (t) lire(t);
  }
  slider.addEventListener("click", ouvrir);
  slider.addEventListener("keydown", function (e) { if (e.key === "Enter") ouvrir(e); });
  whenReady(function () { window.ndoshoAutoLoop(slider, 0.5); });
}

initCarouselTemoignages();
