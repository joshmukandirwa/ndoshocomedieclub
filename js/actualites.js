// Actualités / annonces / communiqués / messages + compteur de vues.
// Page actualites.html (liste complète + fenêtre de lecture) et accueil (3 dernières).
import { isConfigured, db, collection, getDocs, query, where, limit, doc, updateDoc, increment } from "./firebase.js";
import { EXEMPLES_ACTUS } from "./data-exemples.js";
import { el, paragraphs, safeImg, formatDate, toDate, TYPES, tronquer, icone, avecIcone } from "./utils.js";

var items = [];

async function charger() {
  if (!isConfigured) return EXEMPLES_ACTUS.slice();
  try {
    var snap = await getDocs(query(collection(db, "actualites"), where("publie", "==", true), limit(100)));
    var list = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    return list.length ? list : EXEMPLES_ACTUS.slice();
  } catch (e) {
    console.warn("Actualités : lecture impossible", e);
    return EXEMPLES_ACTUS.slice();
  }
}
function trier(list) {
  return list.sort(function (a, b) {
    if (!!b.epingle !== !!a.epingle) return b.epingle ? 1 : -1;
    return (toDate(b.date) || 0) - (toDate(a.date) || 0);
  });
}
function vuesLabel(n) { n = n || 0; return n + (n > 1 ? " vues" : " vue"); }
function vuesNode(a) {
  var v = avecIcone("oeil", vuesLabel(a.views), 15);
  v.className += " actu-views"; v.dataset.vues = a.id;
  return v;
}
function majVues(a) {
  document.querySelectorAll('[data-vues="' + a.id + '"]').forEach(function (n) {
    n.textContent = ""; n.appendChild(icone("oeil", 15)); n.appendChild(document.createTextNode(" " + vuesLabel(a.views)));
  });
}

// ---------- partage (lien seul, sans texte) ----------
var toast;
function afficherToast(msg) {
  if (!toast) { toast = el("div", "actu-toast"); toast.setAttribute("role", "status"); document.body.appendChild(toast); }
  toast.textContent = msg; toast.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(function () { toast.classList.remove("show"); }, 2200);
}
function lienPartage(a) {
  var base = location.origin + location.pathname.replace(/[^/]*$/, "");
  // Vraies publications : lien avec aperçu (image + titre) sur WhatsApp, Facebook...
  if (isConfigured && !String(a.id).startsWith("ex")) return location.origin + "/api/actualite?id=" + encodeURIComponent(a.id);
  return base + "actualites.html?id=" + encodeURIComponent(a.id);
}
function partager(a) {
  var url = lienPartage(a);
  if (navigator.share) {
    navigator.share({ url: url }).catch(function (e) { if (e && e.name !== "AbortError") copier(url); });
  } else copier(url);
}
function copier(url) {
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { afficherToast("Lien copi\u00e9"); }, function () { afficherToast(url); });
  else afficherToast(url);
}
function boutonPartage(a, cls) {
  var b = el("button", cls); b.type = "button";
  b.setAttribute("aria-label", "Partager cette publication"); b.title = "Partager";
  b.appendChild(icone("lien", 18));
  b.addEventListener("click", function (e) { e.stopPropagation(); partager(a); });
  return b;
}

function carte(a) {
  var c = el("article", "actu-card");
  c.tabIndex = 0;
  c.setAttribute("role", "button");
  // Zone image : l'image de la publication, ou le logo du club si aucune image
  var media = el("div", "actu-media");
  if (safeImg(a.image)) {
    var im = el("img", "actu-img"); im.src = a.image; im.alt = ""; im.loading = "lazy"; media.appendChild(im);
  } else {
    media.classList.add("actu-media--vide");
    var lg = el("img", "actu-media-logo"); lg.src = "logo/ndoshologo-3.png"; lg.alt = ""; media.appendChild(lg);
  }
  media.appendChild(boutonPartage(a, "actu-share-ico"));
  c.appendChild(media);

  var body = el("div", "actu-body");
  var top = el("div", "actu-top");
  top.appendChild(el("span", "actu-type actu-type--" + a.type, TYPES[a.type] || "Actualit\u00e9"));
  if (a.epingle) top.appendChild(avecIcone("epingle", "\u00c0 la une", 13)).className += " actu-pin";
  body.appendChild(top);
  body.appendChild(el("h3", "actu-title", tronquer(a.titre, 80)));
  body.appendChild(el("p", "actu-extrait", tronquer(a.contenu, 120)));
  var foot = el("div", "actu-foot");
  foot.appendChild(el("span", "actu-date", formatDate(a.date)));
  foot.appendChild(vuesNode(a));
  body.appendChild(foot);
  c.appendChild(body);
  function ouvrir() { ouvrirModal(a); }
  c.addEventListener("click", ouvrir);
  c.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrir(); } });
  return c;
}

// ---------- fen\u00eatre de lecture ----------
var modal, modalBody, modalBar, lastFocus;
function creerModal() {
  modal = el("div", "actu-modal"); modal.hidden = true;
  modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
  var box = el("div", "actu-modal-box");
  modalBar = el("div", "actu-modal-bar");
  var close = el("button", "actu-modal-close", "\u00d7"); close.type = "button"; close.setAttribute("aria-label", "Fermer");
  close.addEventListener("click", fermerModal);
  modalBody = el("div", "actu-modal-body");
  box.appendChild(modalBar); box.appendChild(modalBody); modal.appendChild(box);
  modal._close = close;
  modal.addEventListener("click", function (e) { if (e.target === modal) fermerModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) fermerModal(); });
  document.body.appendChild(modal);
}
function fermerModal() {
  modal.hidden = true; document.body.classList.remove("menu-lock");
  if (lastFocus) lastFocus.focus();
  if (location.search) history.replaceState(null, "", location.pathname);
}
function ouvrirModal(a) {
  if (!modal) creerModal();
  lastFocus = document.activeElement;
  // Barre du haut : bouton lien (partager) + fermer
  modalBar.textContent = "";
  var partageBtn = boutonPartage(a, "actu-modal-share");
  partageBtn.appendChild(el("span", null, "Partager"));
  modalBar.appendChild(partageBtn);
  modalBar.appendChild(modal._close);

  modalBody.textContent = "";
  if (safeImg(a.image)) { var im = el("img", "actu-modal-img"); im.src = a.image; im.alt = ""; modalBody.appendChild(im); }
  var meta = el("div", "actu-top");
  meta.appendChild(el("span", "actu-type actu-type--" + a.type, TYPES[a.type] || "Actualit\u00e9"));
  meta.appendChild(el("span", "actu-date", formatDate(a.date)));
  modalBody.appendChild(meta);
  modalBody.appendChild(el("h2", "actu-modal-title", a.titre));
  var txt = el("div", "actu-modal-text"); paragraphs(txt, a.contenu); modalBody.appendChild(txt);
  var foot = el("div", "actu-modal-foot");
  foot.appendChild(vuesNode(a));
  modalBody.appendChild(foot);
  modal.hidden = false; document.body.classList.add("menu-lock");
  modal._close.focus();

  // Compteur de vues : 1 vue max par visiteur et par session
  var key = "ndosho_vu_" + a.id;
  var deja = false;
  try { deja = sessionStorage.getItem(key) === "1"; sessionStorage.setItem(key, "1"); } catch (e) {}
  if (!deja && isConfigured && !String(a.id).startsWith("ex")) {
    updateDoc(doc(db, "actualites", a.id), { views: increment(1) }).then(function () {
      a.views = (a.views || 0) + 1;
      majVues(a);
    }).catch(function (e) { console.warn("Vue non compt\u00e9e", e); });
  }
}

// ---------- page actualites.html ----------
function filtres(list) {
  var box = document.getElementById("actuFiltres");
  if (!box) return;
  var presents = {};
  list.forEach(function (a) { presents[a.type] = true; });
  function bouton(code, label) {
    var b = el("button", "actu-chip" + (code === "tous" ? " active" : ""), label); b.type = "button";
    b.addEventListener("click", function () {
      box.querySelectorAll(".actu-chip").forEach(function (x) { x.classList.toggle("active", x === b); });
      afficher(code === "tous" ? list : list.filter(function (a) { return a.type === code; }));
    });
    box.appendChild(b);
  }
  bouton("tous", "Tout");
  var PLURIELS = { actualite: "Actualités", annonce: "Annonces", communique: "Communiqués", message: "Messages", evenement: "Événements", autre: "Autres" };
  Object.keys(TYPES).forEach(function (k) { if (presents[k]) bouton(k, PLURIELS[k]); });
}
function afficher(list) {
  var grid = document.getElementById("actuGrid");
  grid.textContent = "";
  if (!list.length) { grid.appendChild(el("p", "actu-vide", "Rien à afficher pour le moment.")); return; }
  list.forEach(function (a) { grid.appendChild(carte(a)); });
}

async function init() {
  var grid = document.getElementById("actuGrid");
  var home = document.getElementById("homeActus");
  if (!grid && !home) return;
  items = trier(await charger());
  if (grid) {
    afficher(items); filtres(items);
    var id = new URLSearchParams(location.search).get("id");
    var cible = id && items.find(function (a) { return a.id === id; });
    if (cible) ouvrirModal(cible);
  }
  if (home) {
    home.textContent = "";
    items.slice(0, 3).forEach(function (a) { home.appendChild(carte(a)); });
  }
}
init();
