// ============================================================
// ESPACE ADMIN — connexion Firebase Auth + liste d'admins autorisés.
// Les vraies protections sont dans firestore.rules : même en bidouillant
// ce fichier, un visiteur ne peut rien lire ni modifier sans être admin.
// ============================================================
import { adminEmails } from "./firebase-config.js";
import {
  app, db, isConfigured, collection, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp, writeBatch,
} from "./firebase.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut,
  setPersistence, browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { el, formatDate, toDate, MOIS, stars, safeImg, resizeImage, TYPES, avecIcone, RESEAUX, lienReseau } from "./utils.js";
import { svg, remplirIcones } from "./admin-icons.js";

const $ = function (id) { return document.getElementById(id); };
const IDLE_MS = 30 * 60 * 1000;   // déconnexion auto après 30 min d'inactivité
const MAX_FAILS = 5, LOCK_MS = 5 * 60 * 1000;
const REDUIT = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const attendre = function (ms) { return new Promise(function (r) { setTimeout(r, REDUIT ? 0 : ms); }); };

const loginView = $("loginView"), appView = $("appView"), loginCard = $("loginForm");
const loginError = $("loginError"), banner = $("appBanner"), loginBtn = $("loginBtn");

remplirIcones();
$("footYear").textContent = new Date().getFullYear();

function showLoginError(msg) {
  loginError.textContent = msg; loginError.hidden = !msg;
  if (msg) { loginCard.classList.remove("shake"); void loginCard.offsetWidth; loginCard.classList.add("shake"); }
}
loginCard.addEventListener("animationend", function (e) {
  if (e.animationName === "cardIn") loginCard.classList.add("ready");
  if (e.animationName === "shake") loginCard.classList.remove("shake");
});
function showBanner(msg) { banner.textContent = msg; banner.hidden = !msg; }
function dateHeure(v) {
  const d = toDate(v); if (!d) return "";
  return formatDate(d) + " à " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
function btn(label, cls, onClick) {
  const b = el("button", "btn btn-sm " + cls, label); b.type = "button";
  b.addEventListener("click", function () { b.disabled = true; Promise.resolve(onClick()).finally(function () { b.disabled = false; }); });
  return b;
}
function onErr(e) { console.error(e); showBanner("Erreur : " + (e.code === "permission-denied" ? "accès refusé par les règles de sécurité (vérifiez que votre compte est bien l'administrateur dans firestore.rules)." : (e.message || e))); }

// ============================================================
// NAVIGATION (modules de l'admin)
// ============================================================
const ROUTES = [
  { id: "dashboard",   label: "Tableau de bord", icon: "dashboard", mots: "accueil apercu stats" },
  { id: "evenements",  label: "Événements",      icon: "calendar",  mots: "spectacle festival date" },
  { id: "humoristes",  label: "Humoristes",      icon: "users",     mots: "artistes equipe comediens" },
  { id: "galerie",     label: "Galerie",         icon: "image",     mots: "photos images" },
  { id: "actualites",  label: "Actualités",      icon: "news",      mots: "annonce communique publier article" },
  { id: "temoignages", label: "Témoignages",     icon: "chat",      mots: "avis commentaires valider approuver" },
  { id: "partenaires", label: "Partenaires",     icon: "heart",     mots: "sponsors logos" },
  { id: "reservations", label: "Réservations",   icon: "ticket",    mots: "billets ventes clients" },
  { id: "billets",     label: "Billets",         icon: "qr",        mots: "generateur generer qr code ticket" },
  { id: "contacts",    label: "Contacts",        icon: "mail",      mots: "messages boite reception reponse" },
  { id: "parametres",  label: "Paramètres",      icon: "settings",  mots: "compte securite session" },
];
const sansAccent = function (s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); };
let pendingFocus = null;

function construireNav() {
  const nav = $("sideNav"); nav.textContent = "";
  ROUTES.forEach(function (r) {
    const a = el("a", "nav-item"); a.href = "#/" + r.id; a.dataset.route = r.id;
    const ic = el("span", "nav-ico"); ic.innerHTML = svg(r.icon, 20); a.appendChild(ic);
    a.appendChild(el("span", "nav-label", r.label));
    if (r.id === "contacts" || r.id === "temoignages" || r.id === "reservations") {
      const b = el("span", "badge", "0"); b.id = r.id === "contacts" ? "badgeMessages" : r.id === "temoignages" ? "badgeTemoignages" : "badgeDemandes"; b.hidden = true; a.appendChild(b);
    }
    nav.appendChild(a);
  });
  const out = el("button", "nav-item nav-logout"); out.type = "button"; out.id = "logoutNav";
  const ic = el("span", "nav-ico"); ic.innerHTML = svg("logout", 20); out.appendChild(ic);
  out.appendChild(el("span", "nav-label", "Déconnexion"));
  nav.appendChild(out);
}
function construireModulesAVenir() {
  const box = $("views");
  ROUTES.filter(function (r) { return r.soon; }).forEach(function (r) {
    const p = el("section", "panel"); p.id = "panel-" + r.id; p.hidden = true;
    const head = el("div", "view-head"); head.appendChild(el("h1", null, r.label)); p.appendChild(head);
    const c = el("div", "card soon");
    const ic = el("div", "soon-ico"); ic.innerHTML = svg(r.icon, 32); c.appendChild(ic);
    c.appendChild(el("h2", null, "Bientôt disponible"));
    c.appendChild(el("p", null, r.soon));
    p.appendChild(c); box.appendChild(p);
  });
}
function routeCourante() {
  const id = location.hash.replace(/^#\/?/, "") || "dashboard";
  return ROUTES.find(function (r) { return r.id === id; }) || ROUTES[0];
}
function afficherRoute() {
  const r = routeCourante();
  document.querySelectorAll(".views > .panel").forEach(function (p) {
    const on = p.id === "panel-" + r.id;
    p.hidden = !on; p.classList.remove("enter");
    if (on) { void p.offsetWidth; p.classList.add("enter"); }
  });
  document.querySelectorAll(".nav-item[data-route]").forEach(function (a) { a.classList.toggle("active", a.dataset.route === r.id); });
  document.title = r.label + " — Espace admin Ndosho";
  fermerMenu();
  window.scrollTo({ top: 0 });
  if (pendingFocus) { const n = $(pendingFocus); pendingFocus = null; if (n) setTimeout(function () { n.focus(); }, 350); }
}
function aller(id) { location.hash = "#/" + id; }

// Menu mobile
function ouvrirMenu() { $("sidebar").classList.add("open"); $("scrim").classList.add("show"); $("menuBtn").setAttribute("aria-expanded", "true"); }
function fermerMenu() { $("sidebar").classList.remove("open"); $("scrim").classList.remove("show"); $("menuBtn").setAttribute("aria-expanded", "false"); }

// Menus déroulants (notifications, utilisateur)
function basculerMenu(btnId, menuId) {
  const m = $(menuId), b = $(btnId), ouvert = !m.hidden;
  fermerMenus();
  if (!ouvert) { m.hidden = false; b.setAttribute("aria-expanded", "true"); }
}
function fermerMenus() {
  [["bellBtn", "notifMenu"], ["userBtn", "userMenu"]].forEach(function (p) { $(p[1]).hidden = true; $(p[0]).setAttribute("aria-expanded", "false"); });
}

// Recherche de fonctionnalité
let resultats = [], selIdx = 0;
function rendreRecherche() {
  const q = sansAccent($("searchInput").value.trim());
  const ul = $("searchResults");
  if (!q) { ul.hidden = true; return; }
  resultats = ROUTES.filter(function (r) { return sansAccent(r.label + " " + r.mots).indexOf(q) !== -1; }).slice(0, 6);
  selIdx = 0; ul.textContent = ""; ul.hidden = false;
  if (!resultats.length) { ul.appendChild(el("li", "none", "Aucune fonctionnalité trouvée")); return; }
  resultats.forEach(function (r, i) {
    const li = el("li", i === 0 ? "sel" : ""); li.setAttribute("role", "option");
    const ic = el("span"); ic.innerHTML = svg(r.icon, 18); li.appendChild(ic); li.appendChild(el("span", null, r.label));
    li.addEventListener("mousedown", function (e) { e.preventDefault(); choisir(r); });
    ul.appendChild(li);
  });
}
function choisir(r) { $("searchInput").value = ""; $("searchResults").hidden = true; $("searchInput").blur(); aller(r.id); }

function brancherCoque() {
  window.addEventListener("hashchange", afficherRoute);
  $("menuBtn").addEventListener("click", ouvrirMenu);
  $("scrim").addEventListener("click", fermerMenu);
  $("bellBtn").addEventListener("click", function (e) { e.stopPropagation(); basculerMenu("bellBtn", "notifMenu"); });
  $("userBtn").addEventListener("click", function (e) { e.stopPropagation(); basculerMenu("userBtn", "userMenu"); });
  document.addEventListener("click", function (e) { if (!e.target.closest(".dropdown")) fermerMenus(); });
  $("notifMenu").addEventListener("click", fermerMenus);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { fermerMenus(); fermerMenu(); }
    if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); $("searchInput").focus(); }
  });
  const si = $("searchInput");
  si.addEventListener("input", rendreRecherche);
  si.addEventListener("blur", function () { $("searchResults").hidden = true; });
  si.addEventListener("keydown", function (e) {
    const lis = $("searchResults").querySelectorAll("li:not(.none)");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!lis.length) return; e.preventDefault();
      selIdx = (selIdx + (e.key === "ArrowDown" ? 1 : -1) + lis.length) % lis.length;
      lis.forEach(function (l, i) { l.classList.toggle("sel", i === selIdx); });
    } else if (e.key === "Enter") { e.preventDefault(); if (resultats[selIdx]) choisir(resultats[selIdx]); }
    else if (e.key === "Escape") { si.value = ""; $("searchResults").hidden = true; si.blur(); }
  });
  // Liens avec focus demandé (ex : "Publier une actualité")
  document.addEventListener("click", function (e) {
    const a = e.target.closest("[data-focus]"); if (a) pendingFocus = a.dataset.focus;
  });
  // État de la connexion internet
  function maj() { const on = navigator.onLine; $("statusBox").classList.toggle("off", !on); $("statusText").textContent = on ? "En ligne" : "Hors ligne"; }
  window.addEventListener("online", maj); window.addEventListener("offline", maj); maj();
}

// ============================================================
// STATISTIQUES + NOTIFICATIONS (tableau de bord)
// ============================================================
const etat = { messagesNonLus: 0, temoignagesAttente: 0, actusPubliees: 0, actusBrouillons: 0, vues: 0 };
// Photo d'humoriste acceptée : image envoyée depuis l'admin (data:) ou fichier du site (dossier humoristes/)
function photoOk(v) {
  return typeof v === "string" && (/^data:image\/(jpeg|png|webp);base64,/.test(v) || /^humoristes\/[\w .-]+\.(jpe?g|png|webp)$/i.test(v));
}
// Photo de galerie acceptée : image envoyée depuis l'admin (data:) ou fichier du site (un dossier, ex. recommandé/)
function galOk(v) {
  return typeof v === "string" && (/^data:image\/(jpeg|png|webp);base64,/.test(v) || /^[\w\u00C0-\u017F-]+\/[\w\u00C0-\u017F .()-]+\.(jpe?g|png|webp)$/i.test(v));
}
// Logo de partenaire accepté : image envoyée depuis l'admin (data:) ou fichier du site (dossier partenaires/)
function logoOk(v) {
  return typeof v === "string" && (/^data:image\/(jpeg|png|webp);base64,/.test(v) || /^partenaires\/[\w .-]+\.(jpe?g|png|webp)$/i.test(v));
}
// Lien de partenaire : uniquement http(s). Renvoie "" si invalide.
function lienOk(v) {
  v = String(v || "").trim(); if (!v) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = "https://" + v;
  try { const u = new URL(v); return u.protocol === "https:" || u.protocol === "http:" ? u.href.slice(0, 300) : ""; } catch (e) { return ""; }
}
const donnees = { messages: [], temoignages: [], actus: [], billets: [], evenements: [] };
const SVGNS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs, text) {
  const n = document.createElementNS(SVGNS, tag);
  Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
  if (text != null) n.textContent = text;
  return n;
}
function cleJour(d) { return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }

// Graphique : billets émis par jour sur 14 jours (SVG dessiné ici, aucune librairie)
function rendreGraphique() {
  const box = $("chartBillets"); if (!box) return;
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  const jours = [], idx = {};
  for (let i = 13; i >= 0; i--) { const d = new Date(auj); d.setDate(auj.getDate() - i); idx[cleJour(d)] = jours.length; jours.push({ d: d, n: 0 }); }
  let total14 = 0;
  donnees.billets.forEach(function (b) {
    const d = toDate(b.createdAt); if (!d) return;
    const i = idx[cleJour(d)]; if (i !== undefined) { jours[i].n++; total14++; }
  });
  const max = Math.max(4, Math.max.apply(null, jours.map(function (j) { return j.n; })));
  const W = 560, H = 190, gx = 30, gy = 14, bas = H - 26, haut = bas - gy - 4;
  const pas = (W - gx) / jours.length, lb = Math.min(26, pas * 0.6);
  const svgChart = svgEl("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", preserveAspectRatio: "xMidYMid meet", "aria-hidden": "true" });
  [0, 0.5, 1].forEach(function (k) {
    const y = bas - k * haut;
    svgChart.appendChild(svgEl("line", { x1: gx, x2: W, y1: y, y2: y, class: "grid" }));
    svgChart.appendChild(svgEl("text", { x: gx - 8, y: y + 4, class: "ax", "text-anchor": "end" }, String(Math.round(max * k))));
  });
  jours.forEach(function (j, i) {
    const x = gx + i * pas + (pas - lb) / 2, h = j.n ? Math.max(4, (j.n / max) * haut) : 0;
    const g = svgEl("g", {});
    g.appendChild(svgEl("title", {}, j.d.getDate() + "/" + (j.d.getMonth() + 1) + " : " + pluriel(j.n, "billet", "billets")));
    g.appendChild(svgEl("rect", { x: x, y: bas - (j.n ? h : 2), width: lb, height: j.n ? h : 2, rx: 5, class: j.n ? "bar" : "bar zero" }));
    if (j.n) g.appendChild(svgEl("text", { x: x + lb / 2, y: bas - h - 6, class: "val", "text-anchor": "middle" }, String(j.n)));
    if (i % 2 === 1 || i === jours.length - 1) g.appendChild(svgEl("text", { x: x + lb / 2, y: H - 6, class: "ax", "text-anchor": "middle" }, j.d.getDate() + "/" + (j.d.getMonth() + 1)));
    svgChart.appendChild(g);
  });
  box.textContent = ""; box.appendChild(svgChart);
  $("chartTotal").textContent = pluriel(total14, "billet émis", "billets émis") + " sur 14 jours · " + pluriel(donnees.billets.length, "billet", "billets") + " au total";
}

// Événements : dates et « Prochains événements » du tableau de bord
function dateEv(e) { return new Date(String(e.dateISO || "") + "T" + (e.heure || "00:00")); }
function debutJour() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function texteDate(e) { const d = dateEv(e); return isNaN(d) ? "" : formatDate(d) + (e.heure ? " à " + e.heure : ""); }
function rendreProchains() {
  const box = $("nextList"); if (!box) return;
  const auj = debutJour();
  const liste = donnees.evenements.filter(function (e) { return dateEv(e) >= auj; }).sort(function (a, b) { return dateEv(a) - dateEv(b); }).slice(0, 3);
  box.textContent = "";
  if (!liste.length) { const a = el("a", "next-empty", "Aucun événement à venir. Ajoutez-en un."); a.href = "#/evenements"; box.appendChild(a); return; }
  liste.forEach(function (e) {
    const d = dateEv(e), a = el("a", "next-item"); a.href = "#/evenements";
    const badge = el("span", "next-date"); badge.appendChild(el("b", null, String(d.getDate()))); badge.appendChild(el("small", null, MOIS[d.getMonth()].slice(0, 3))); a.appendChild(badge);
    const corps = el("span", "next-body"); corps.appendChild(el("b", null, e.titre));
    const vendus = donnees.billets.filter(function (b) { return b.eventName === e.titre; }).length;
    corps.appendChild(el("small", null, e.lieu + (e.heure ? " · " + e.heure : "") + " · " + pluriel(vendus, "billet émis", "billets émis"))); a.appendChild(corps);
    if (e.ouvert) a.appendChild(el("span", "pill ok", "Billetterie ouverte"));
    box.appendChild(a);
  });
}

// Activité récente : derniers événements de tout le site, du plus récent au plus ancien
function depuis(d) {
  const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 60) return "à l'instant";
  if (s < 3600) return "il y a " + Math.floor(s / 60) + " min";
  if (s < 86400) return "il y a " + Math.floor(s / 3600) + " h";
  if (s < 172800) return "hier";
  return formatDate(d);
}
function rendreActivite() {
  const ul = $("activityList"); if (!ul) return;
  const items = [];
  donnees.messages.forEach(function (m) { items.push({ d: toDate(m.createdAt), ico: "mail", titre: m.nom, sub: "a envoyé un message", route: "contacts" }); });
  donnees.temoignages.forEach(function (t) { items.push({ d: toDate(t.createdAt), ico: "chat", titre: t.nom, sub: t.statut === "en_attente" ? "a laissé un témoignage" : "témoignage " + (t.statut === "approuve" ? "publié" : "refusé"), route: "temoignages" }); });
  donnees.actus.forEach(function (a) { items.push({ d: toDate(a.date), ico: "news", titre: a.titre, sub: a.publie ? "actualité publiée" : "brouillon enregistré", route: "actualites" }); });
  donnees.billets.forEach(function (b) { items.push({ d: toDate(b.createdAt), ico: "ticket", titre: b.nom, sub: "billet émis · " + b.eventName, route: "reservations" }); });
  const liste = items.filter(function (x) { return x.d; }).sort(function (a, b) { return b.d - a.d; }).slice(0, 8);
  ul.textContent = "";
  if (!liste.length) { ul.appendChild(el("li", "act-empty", "Rien pour le moment.")); return; }
  liste.forEach(function (x) {
    const li = el("li"), a = el("a"); a.href = "#/" + x.route;
    const ic = el("span", "act-ico"); ic.innerHTML = svg(x.ico, 18); a.appendChild(ic);
    const corps = el("span", "act-body"); corps.appendChild(el("b", null, x.titre)); corps.appendChild(el("small", null, x.sub)); a.appendChild(corps);
    a.appendChild(el("time", null, depuis(x.d)));
    li.appendChild(a); ul.appendChild(li);
  });
}
const affiche = {};
function compter(id, vers) {
  const n = $(id); if (!n) return;
  const de = affiche[id] || 0; affiche[id] = vers;
  if (de === vers) { n.textContent = String(vers); return; }
  if (REDUIT) { n.textContent = String(vers); return; }
  const t0 = performance.now(), dur = 750;
  (function pas(t) {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    n.textContent = String(Math.round(de + (vers - de) * e));
    if (k < 1) requestAnimationFrame(pas);
  })(t0);
}
function pluriel(n, s, p) { return n + " " + (n > 1 ? p : s); }
function majTableauDeBord() {
  compter("statMessages", etat.messagesNonLus);
  compter("statTemoignages", etat.temoignagesAttente);
  compter("statActus", etat.actusPubliees);
  compter("statVues", etat.vues);
  const m = $("statMessagesSub"); m.textContent = etat.messagesNonLus ? "à lire" : "tout est lu"; m.className = etat.messagesNonLus ? "warn" : "up";
  const t = $("statTemoignagesSub"); t.textContent = etat.temoignagesAttente ? "à valider" : "rien en attente"; t.className = etat.temoignagesAttente ? "warn" : "up";
  $("statActusSub").textContent = etat.actusBrouillons ? pluriel(etat.actusBrouillons, "brouillon", "brouillons") : "sur le site";

  // « À traiter »
  const box = $("todoList"); box.textContent = "";
  function ligne(n, texte, route) {
    const a = el("a"); a.href = "#/" + route; a.appendChild(el("b", null, String(n))); a.appendChild(el("span", null, texte)); box.appendChild(a);
  }
  if (etat.messagesNonLus) ligne(etat.messagesNonLus, etat.messagesNonLus > 1 ? "nouveaux messages à lire" : "nouveau message à lire", "contacts");
  if (etat.temoignagesAttente) ligne(etat.temoignagesAttente, etat.temoignagesAttente > 1 ? "témoignages à valider" : "témoignage à valider", "temoignages");
  if (!box.children.length) {
    const ok = el("div", "todo-ok"); const ic = el("span"); ic.innerHTML = svg("check", 22); ok.appendChild(ic);
    ok.appendChild(el("span", null, "Tout est à jour, rien à traiter.")); box.appendChild(ok);
  }

  // Cloche
  const total = etat.messagesNonLus + etat.temoignagesAttente;
  const bb = $("bellBadge"), avant = parseInt(bb.textContent, 10) || 0;
  bb.textContent = total > 99 ? "99+" : String(total); bb.hidden = !total;
  if (total > avant) { const bell = $("bellBtn"); bell.classList.remove("ring"); void bell.offsetWidth; bell.classList.add("ring"); }
  const nm = $("notifMenu"); nm.textContent = "";
  nm.appendChild(el("div", "notif-title", "Notifications"));
  function notif(texte, route) { const a = el("a"); a.href = "#/" + route; a.appendChild(el("span", "dot")); a.appendChild(el("span", null, texte)); nm.appendChild(a); }
  if (etat.messagesNonLus) notif(pluriel(etat.messagesNonLus, "nouveau message", "nouveaux messages"), "contacts");
  if (etat.temoignagesAttente) notif(pluriel(etat.temoignagesAttente, "témoignage en attente", "témoignages en attente"), "temoignages");
  if (!total) nm.appendChild(el("div", "notif-empty", "Aucune nouvelle notification."));
  rendreGraphique(); rendreProchains(); rendreActivite();
}

// ============================================================
// CONNEXION
// ============================================================
if (!isConfigured) {
  loginView.querySelector("form").replaceWith(Object.assign(el("div", "login-card"), {}));
  const c = loginView.querySelector(".login-card");
  c.appendChild(el("h1", null, "Configuration requise"));
  c.appendChild(el("p", "login-sub", "Firebase n'est pas encore configuré. Suivez le guide ADMIN-SETUP.md puis remplissez js/firebase-config.js."));
} else {
  const auth = getAuth(app);
  let unsubs = [], idleTimer = null, tentative = false, coqueBranchee = false;

  // afficher / masquer le mot de passe
  $("passToggle").addEventListener("click", function () {
    const p = $("loginPass"), voir = p.type === "password";
    p.type = voir ? "text" : "password";
    this.dataset.ico = voir ? "eyeoff" : "eye"; remplirIcones(this.parentNode);
    this.setAttribute("aria-label", voir ? "Masquer le mot de passe" : "Afficher le mot de passe");
  });

  function chargement(on) { loginBtn.classList.toggle("loading", on); loginBtn.disabled = on; }

  $("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const lockUntil = parseInt(localStorage.getItem("ndosho_admin_lock") || "0", 10);
    if (Date.now() < lockUntil) { showLoginError("Trop de tentatives. Réessayez dans quelques minutes."); return; }
    showLoginError("");
    tentative = true; chargement(true);
    try {
      await setPersistence(auth, browserSessionPersistence); // la session se ferme avec l'onglet
      await signInWithEmailAndPassword(auth, $("loginEmail").value.trim(), $("loginPass").value);
      localStorage.removeItem("ndosho_admin_fails");
    } catch (err) {
      tentative = false; chargement(false); $("loginPass").value = "";
      const fails = parseInt(localStorage.getItem("ndosho_admin_fails") || "0", 10) + 1;
      localStorage.setItem("ndosho_admin_fails", String(fails));
      if (fails >= MAX_FAILS) { localStorage.setItem("ndosho_admin_lock", String(Date.now() + LOCK_MS)); localStorage.setItem("ndosho_admin_fails", "0"); }
      showLoginError(err.code === "auth/too-many-requests" ? "Trop de tentatives. Réessayez plus tard." : "Email ou mot de passe incorrect.");
    }
  });
  function deconnexion() { signOut(auth); }
  ["logoutBtn", "logoutBtn2"].forEach(function (id) { $(id).addEventListener("click", deconnexion); });

  onAuthStateChanged(auth, async function (user) {
    unsubs.forEach(function (u) { u(); }); unsubs = [];
    clearTimeout(idleTimer);
    if (!user) {
      appView.hidden = true; loginView.hidden = false; loginView.classList.remove("is-leaving");
      loginCard.classList.remove("success"); loginBtn.classList.remove("done"); chargement(false);
      return;
    }
    const ok = adminEmails.indexOf(String(user.email || "").toLowerCase()) !== -1;
    if (!ok) { tentative = false; chargement(false); showLoginError("Ce compte n'a pas les droits d'administration."); await signOut(auth); return; }

    // petite animation de réussite quand l'utilisateur vient de se connecter
    if (tentative && !loginView.hidden) {
      loginBtn.classList.remove("loading"); loginBtn.classList.add("done"); loginCard.classList.add("success");
      await attendre(900); loginView.classList.add("is-leaving"); await attendre(420);
    }
    tentative = false;
    loginView.hidden = true; appView.hidden = false;
    appView.classList.remove("app-enter"); void appView.offsetWidth; appView.classList.add("app-enter");

    const mail = String(user.email || "");
    $("appUser").textContent = mail; $("setEmail").textContent = mail;
    $("userAvatar").textContent = (mail[0] || "A").toUpperCase();
    if (!coqueBranchee) { construireNav(); construireModulesAVenir(); brancherCoque(); coqueBranchee = true; $("logoutNav").addEventListener("click", deconnexion); }
    afficherRoute();
    demarrer();
    ["click", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, resetIdle, { passive: true }); });
    resetIdle();
  });
  function resetIdle() { clearTimeout(idleTimer); idleTimer = setTimeout(function () { signOut(auth); showLoginError("Session fermée après 30 minutes d'inactivité."); }, IDLE_MS); }

  function demarrer() {
    showBanner("");
    ecouterMessages(); ecouterTemoignages(); ecouterActus(); ecouterBillets(); ecouterDemandes(); ecouterEvenements(); ecouterHumoristes(); ecouterGalerie(); ecouterPartenaires();
  }
  function ecouter(col, champ, cb) {
    unsubs.push(onSnapshot(query(collection(db, col), orderBy(champ, "desc")), function (snap) {
      cb(snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }));
    }, onErr));
  }
  function vide(box, txt) { box.textContent = ""; box.appendChild(el("p", "empty", txt)); }
  function badge(id, n) { const b = $(id); if (!b) return; b.textContent = n; b.hidden = !n; }
  function confirmer(txt) { return window.confirm(txt); }
  function wa(tel) { let d = String(tel || "").replace(/\D/g, ""); if (d.startsWith("0")) d = "243" + d.slice(1); return "https://wa.me/" + d; }


  // ---------- BILLETS (générateur signé par le serveur) + RÉSERVATIONS ----------
  let billets = [], billetCourant = null, filtreResa = "", evenementsConnus = {}, billetsEv = {}, evenements = [], evEditId = null;
  function ecouterBillets() {
    ecouter("billets", "createdAt", function (list) {
      billets = list; donnees.billets = list;
      billetsEv = {};
      list.slice().reverse().forEach(function (b) { if (b.eventName) billetsEv[b.eventName] = { date: b.eventDate, lieu: b.eventLieu }; });
      majListeEvenements(); majTableauDeBord(); rendreReservations(); rendreEvenements();
    });
  }
  function majListeEvenements() {
    evenementsConnus = Object.assign({}, billetsEv);
    const auj = debutJour();
    evenements.forEach(function (e) { if (e.ouvert && dateEv(e) >= auj) evenementsConnus[e.titre] = { date: texteDate(e), lieu: e.lieu }; });
    const dl = $("bkEventList"); dl.textContent = "";
    Object.keys(evenementsConnus).forEach(function (n) { const o = el("option"); o.value = n; dl.appendChild(o); });
  }

  // ---------- DEMANDES DE RÉSERVATION (envoyées depuis reservation.html) ----------
  const EVENEMENT_PUNGUZA = "Festival Punguza Stress — 2e édition";
  let demandeCourante = null;
  function ecouterDemandes() {
    ecouter("reservations", "createdAt", function (list) {
      const attente = list.filter(function (d) { return d.statut === "en_attente"; });
      badge("badgeDemandes", attente.length);
      const box = $("listDemandes");
      if (!attente.length) return vide(box, "Aucune demande en attente.");
      box.textContent = "";
      attente.forEach(function (d) {
        const it = el("article", "item unread"), head = el("div", "item-head"), left = el("div");
        left.appendChild(el("div", "item-title", d.nom));
        left.appendChild(el("div", "item-meta", dateHeure(d.createdAt) + " · " + d.tel));
        head.appendChild(left); head.appendChild(el("span", "pill pin", d.categorie)); it.appendChild(head);
        it.appendChild(el("p", "item-text", "Demande pour " + EVENEMENT_PUNGUZA + " — à valider une fois le paiement réglé sur WhatsApp."));
        const ac = el("div", "item-actions");
        const w = el("a", "btn btn-sm btn-ok", "Discuter sur WhatsApp"); w.href = wa(d.tel); w.target = "_blank"; w.rel = "noopener"; ac.appendChild(w);
        ac.appendChild(btn("Valider et créer le billet", "btn-primary", function () { validerDemande(d); return Promise.resolve(); }));
        ac.appendChild(btn("Supprimer", "btn-danger", function () {
          if (!confirmer("Supprimer cette demande ?")) return;
          return deleteDoc(doc(db, "reservations", d.id)).catch(onErr);
        }));
        it.appendChild(ac); box.appendChild(it);
      });
    });
  }
  function validerDemande(d) {
    demandeCourante = d;
    $("bkNom").value = d.nom; $("bkTel").value = d.tel;
    $("bkEvent").value = EVENEMENT_PUNGUZA + " · " + d.categorie;
    $("bkDate").value = "Dimanche 24 janvier 2027";
    if (!$("bkLieu").value) $("bkLieu").value = "Goma";
    $("bkMontant").value = "";
    const n = $("bkDemandeNote"); n.textContent = "Demande de " + d.nom + " (" + d.categorie + ") : saisissez le montant payé, puis générez le billet. La demande sera marquée comme validée."; n.hidden = false;
    aller("billets");
    setTimeout(function () { $("bkMontant").focus(); }, 150);
  }

  // ---------- PARTENAIRES ----------
  const PARTENAIRES_ACTUELS = [
    ["Africell", "africell.png"], ["The Congo Tree", "congo tree.png"], ["Amigo", "amigo.png"], ["ESE", "ese1.jpg"], ["TAA", "taa1.jpg"],
    ["Adissup", "adus.png"], ["Unitech", "unitech2.jpg"], ["Tamu", "tamu1.jpg"], ["Canal", "canal.png"], ["Deus", "deus2.jpg"],
  ];
  let partenaires = [], parLogo = "", parEditId = null;
  function ecouterPartenaires() {
    ecouter("partenaires", "ordre", function (list) {
      partenaires = list.slice().sort(function (a, b) { return (a.ordre || 0) - (b.ordre || 0) || String(a.nom).localeCompare(String(b.nom)); });
      $("parImport").hidden = partenaires.length > 0;
      rendrePartenaires();
    });
  }
  function srcLogo(v) { return v.indexOf("data:") === 0 ? v : "./" + encodeURI(v); }
  function majApercuPar() { $("parPreview").src = parLogo ? srcLogo(parLogo) : ""; $("parPreviewBox").hidden = !parLogo; }
  function resetParForm() {
    parEditId = null; parLogo = ""; $("parForm").reset(); $("parPublic").checked = true; majApercuPar();
    $("parSubmit").textContent = "Ajouter"; $("parCancel").hidden = true; $("parFormTitle").textContent = "Ajouter un partenaire";
  }
  $("parCancel").addEventListener("click", resetParForm);
  $("parLogo").addEventListener("change", async function () {
    const file = this.files && this.files[0]; if (!file) return;
    try { parLogo = await resizeImage(file, 500, 0.85, false, "#ffffff"); majApercuPar(); }
    catch (e) { this.value = ""; alert(e.message || "Image non valide"); }
  });
  $("parLogoRemove").addEventListener("click", function () { parLogo = ""; $("parLogo").value = ""; majApercuPar(); });
  $("parForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const brut = $("parLien").value.trim(), lien = lienOk(brut);
    if (brut && !lien) { alert("Adresse du site non valide (exemple : https://www.exemple.com)."); return; }
    const data = { nom: $("parNom").value.trim().slice(0, 80), lien: lien, logo: parLogo, public: $("parPublic").checked };
    if (!data.nom) return;
    $("parSubmit").disabled = true;
    try {
      if (parEditId) await updateDoc(doc(db, "partenaires", parEditId), data);
      else await addDoc(collection(db, "partenaires"), Object.assign(data, { ordre: partenaires.reduce(function (m, h) { return Math.max(m, h.ordre || 0); }, 0) + 1, createdAt: serverTimestamp() }));
      resetParForm(); showBanner("");
    } catch (err) { onErr(err); }
    finally { $("parSubmit").disabled = false; }
  });
  $("parImportBtn").addEventListener("click", async function () {
    this.disabled = true;
    try {
      const b = writeBatch(db);
      PARTENAIRES_ACTUELS.forEach(function (a, i) { b.set(doc(collection(db, "partenaires")), { nom: a[0], lien: "", logo: "partenaires/" + a[1], public: true, ordre: i + 1, createdAt: serverTimestamp() }); });
      await b.commit();
    } catch (err) { onErr(err); }
    this.disabled = false;
  });
  function deplacerPar(i, delta) {
    const a = partenaires[i], c = partenaires[i + delta]; if (!a || !c) return Promise.resolve();
    const b = writeBatch(db), liste = partenaires.slice();
    liste[i] = c; liste[i + delta] = a;
    liste.forEach(function (h, k) { if ((h.ordre || 0) !== k + 1) b.update(doc(db, "partenaires", h.id), { ordre: k + 1 }); });
    return b.commit().catch(onErr);
  }
  function rendrePartenaires() {
    const box = $("listPartenaires"); if (!box) return;
    if (!partenaires.length) return vide(box, "Aucun partenaire ajouté pour le moment : le site affiche sa liste d'origine.");
    box.textContent = "";
    partenaires.forEach(function (h, i) {
      const it = el("article", "item" + (h.public ? "" : " past")), head = el("div", "item-head hum-head");
      if (logoOk(h.logo)) { const im = el("img", "par-thumb"); im.src = srcLogo(h.logo); im.alt = ""; head.appendChild(im); }
      else head.appendChild(el("span", "par-thumb hum-none", (h.nom || "?").charAt(0).toUpperCase()));
      const mid = el("div", "hum-mid"); mid.appendChild(el("div", "item-title", h.nom)); mid.appendChild(el("div", "item-meta", h.lien || "Pas de site web")); head.appendChild(mid);
      head.appendChild(el("span", "pill " + (h.public ? "ok" : "draft"), h.public ? "Sur le site" : "Masqué"));
      it.appendChild(head);
      const ac = el("div", "item-actions");
      if (i > 0) ac.appendChild(btn("↑ Monter", "btn-ghost", function () { return deplacerPar(i, -1); }));
      if (i < partenaires.length - 1) ac.appendChild(btn("↓ Descendre", "btn-ghost", function () { return deplacerPar(i, 1); }));
      ac.appendChild(btn("Modifier", "btn-ghost", function () {
        parEditId = h.id; parLogo = logoOk(h.logo) ? h.logo : ""; $("parNom").value = h.nom; $("parLien").value = h.lien || ""; $("parPublic").checked = !!h.public;
        majApercuPar();
        $("parSubmit").textContent = "Enregistrer"; $("parCancel").hidden = false; $("parFormTitle").textContent = "Modifier le partenaire";
        $("parForm").scrollIntoView({ behavior: "smooth", block: "start" }); return Promise.resolve();
      }));
      ac.appendChild(btn(h.public ? "Masquer" : "Afficher", "btn-ghost", function () { return updateDoc(doc(db, "partenaires", h.id), { public: !h.public }).catch(onErr); }));
      ac.appendChild(btn("Supprimer", "btn-danger", function () {
        if (!confirmer("Supprimer " + h.nom + " ?")) return;
        return deleteDoc(doc(db, "partenaires", h.id)).catch(onErr);
      }));
      it.appendChild(ac); box.appendChild(it);
    });
  }

  // ---------- HUMORISTES ----------
  const ACTUELS = [
    ["Francky Sengha", "humoristes/franck.jpg"], ["Félicien Senzoga", "humoristes/felicien senzoga.jpg"], ["Queen Skinny", "humoristes/queen skinny.jpg"],
    ["Jaminass S.", "humoristes/jaminass.jpg"], ["Pascal Bigben", "humoristes/pascal bigben.jpg"], ["Raphaël Higgins", "humoristes/rapha higgins.jpg"],
  ];
  let humoristes = [], humPhoto = "", humEditId = null;
  function ecouterHumoristes() {
    ecouter("humoristes", "ordre", function (list) {
      humoristes = list.slice().sort(function (a, b) { return (a.ordre || 0) - (b.ordre || 0) || String(a.nom).localeCompare(String(b.nom)); });
      $("humImport").hidden = humoristes.length > 0;
      rendreHumoristes();
    });
  }
  function majApercuHum() { $("humPreview").src = humPhoto || ""; $("humPreviewBox").hidden = !humPhoto; }
  function resetHumForm() {
    humEditId = null; humPhoto = ""; $("humForm").reset(); $("humRole").value = "Humoriste"; $("humPublic").checked = true; majApercuHum();
    $("humSubmit").textContent = "Ajouter"; $("humCancel").hidden = true; $("humFormTitle").textContent = "Ajouter un humoriste";
  }
  $("humCancel").addEventListener("click", resetHumForm);
  $("humPhoto").addEventListener("change", async function () {
    const file = this.files && this.files[0]; if (!file) return;
    try { humPhoto = await resizeImage(file, 800, 0.78, false); majApercuHum(); }
    catch (e) { this.value = ""; alert(e.message || "Image non valide"); }
  });
  $("humPhotoRemove").addEventListener("click", function () { humPhoto = ""; $("humPhoto").value = ""; majApercuHum(); });
  $("humForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const data = { nom: $("humNom").value.trim().slice(0, 80), role: ($("humRole").value.trim() || "Humoriste").slice(0, 60), photo: humPhoto, public: $("humPublic").checked };
    if (!data.nom) return;
    $("humSubmit").disabled = true;
    try {
      if (humEditId) await updateDoc(doc(db, "humoristes", humEditId), data);
      else await addDoc(collection(db, "humoristes"), Object.assign(data, { ordre: humoristes.reduce(function (m, h) { return Math.max(m, h.ordre || 0); }, 0) + 1, createdAt: serverTimestamp() }));
      resetHumForm(); showBanner("");
    } catch (err) { onErr(err); }
    finally { $("humSubmit").disabled = false; }
  });
  $("humImportBtn").addEventListener("click", async function () {
    this.disabled = true;
    try {
      const b = writeBatch(db);
      ACTUELS.forEach(function (a, i) { b.set(doc(collection(db, "humoristes")), { nom: a[0], role: "Humoriste", photo: a[1], public: true, ordre: i + 1, createdAt: serverTimestamp() }); });
      await b.commit();
    } catch (err) { onErr(err); }
    this.disabled = false;
  });
  function deplacer(i, delta) {
    const a = humoristes[i], c = humoristes[i + delta]; if (!a || !c) return Promise.resolve();
    // on renumérote proprement toute la liste pour éviter les égalités
    const b = writeBatch(db), liste = humoristes.slice();
    liste[i] = c; liste[i + delta] = a;
    liste.forEach(function (h, k) { if ((h.ordre || 0) !== k + 1) b.update(doc(db, "humoristes", h.id), { ordre: k + 1 }); });
    return b.commit().catch(onErr);
  }
  function rendreHumoristes() {
    const box = $("listHumoristes"); if (!box) return;
    if (!humoristes.length) return vide(box, "Aucun humoriste ajouté pour le moment : le site affiche sa liste d'origine.");
    box.textContent = "";
    humoristes.forEach(function (h, i) {
      const it = el("article", "item" + (h.public ? "" : " past")), head = el("div", "item-head hum-head");
      if (photoOk(h.photo)) { const im = el("img", "hum-thumb"); im.src = encodeURI(h.photo); im.alt = ""; head.appendChild(im); }
      else head.appendChild(el("span", "hum-thumb hum-none", (h.nom || "?").charAt(0).toUpperCase()));
      const mid = el("div", "hum-mid"); mid.appendChild(el("div", "item-title", h.nom)); mid.appendChild(el("div", "item-meta", h.role || "Humoriste")); head.appendChild(mid);
      head.appendChild(el("span", "pill " + (h.public ? "ok" : "draft"), h.public ? "Sur le site" : "Masqué"));
      it.appendChild(head);
      const ac = el("div", "item-actions");
      if (i > 0) ac.appendChild(btn("↑ Monter", "btn-ghost", function () { return deplacer(i, -1); }));
      if (i < humoristes.length - 1) ac.appendChild(btn("↓ Descendre", "btn-ghost", function () { return deplacer(i, 1); }));
      ac.appendChild(btn("Modifier", "btn-ghost", function () {
        humEditId = h.id; humPhoto = photoOk(h.photo) ? h.photo : ""; $("humNom").value = h.nom; $("humRole").value = h.role || "Humoriste"; $("humPublic").checked = !!h.public; majApercuHum();
        $("humSubmit").textContent = "Enregistrer"; $("humCancel").hidden = false; $("humFormTitle").textContent = "Modifier l'humoriste";
        $("humForm").scrollIntoView({ behavior: "smooth", block: "start" }); return Promise.resolve();
      }));
      ac.appendChild(btn(h.public ? "Masquer" : "Afficher", "btn-ghost", function () { return updateDoc(doc(db, "humoristes", h.id), { public: !h.public }).catch(onErr); }));
      ac.appendChild(btn("Supprimer", "btn-danger", function () {
        if (!confirmer("Supprimer " + h.nom + " ?")) return;
        return deleteDoc(doc(db, "humoristes", h.id)).catch(onErr);
      }));
      it.appendChild(ac); box.appendChild(it);
    });
  }

  // ---------- GALERIE ----------
  const GALERIE_ACTUELLE = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,22,23,24,25].map(function (n) { return "recommandé/recommandé (" + n + ").jpg"; });
  let galerie = [], galFichiers = [];
  function ecouterGalerie() {
    ecouter("galerie", "ordre", function (list) {
      galerie = list.slice().sort(function (a, b) { return (a.ordre || 0) - (b.ordre || 0); });
      $("galImport").hidden = galerie.length > 0;
      rendreGalerie();
    });
  }
  function apercusGal() {
    const box = $("galPreviews"); box.textContent = "";
    galFichiers.forEach(function (d) { const im = el("img", "gal-prev"); im.src = d; im.alt = ""; box.appendChild(im); });
  }
  $("galFiles").addEventListener("change", async function () {
    const tous = Array.prototype.slice.call(this.files || []);
    const files = tous.slice(0, 20);
    if (tous.length > 20) alert("20 photos au maximum à la fois : les 20 premières sont gardées.");
    galFichiers = [];
    const etat = $("galEtat"); etat.hidden = !files.length; etat.textContent = "Préparation des photos…";
    for (let i = 0; i < files.length; i++) {
      try { galFichiers.push(await resizeImage(files[i], 1100, 0.74, false)); }
      catch (e) { alert((files[i].name || "Une photo") + " : " + (e.message || "image non valide")); }
      etat.textContent = "Préparation des photos… " + (i + 1) + "/" + files.length;
    }
    etat.textContent = galFichiers.length ? galFichiers.length + (galFichiers.length > 1 ? " photos prêtes" : " photo prête") + ". Touchez « Ajouter »." : "";
    etat.hidden = !galFichiers.length;
    apercusGal();
  });
  $("galForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!galFichiers.length) { alert("Choisissez d'abord au moins une photo."); return; }
    $("galSubmit").disabled = true;
    try {
      // les plus récentes d'abord : on les place avant toutes les autres
      const debut = galerie.reduce(function (m, g) { return Math.min(m, g.ordre || 0); }, 1) - galFichiers.length;
      const b = writeBatch(db), pub = $("galPublic").checked;
      galFichiers.forEach(function (d, i) { b.set(doc(collection(db, "galerie")), { photo: d, public: pub, ordre: debut + i, createdAt: serverTimestamp() }); });
      await b.commit();
      galFichiers = []; $("galForm").reset(); $("galPublic").checked = true; apercusGal(); $("galEtat").hidden = true; showBanner("");
    } catch (err) { onErr(err); }
    finally { $("galSubmit").disabled = false; }
  });
  $("galImportBtn").addEventListener("click", async function () {
    this.disabled = true;
    try {
      const b = writeBatch(db);
      GALERIE_ACTUELLE.forEach(function (p, i) { b.set(doc(collection(db, "galerie")), { photo: p, public: true, ordre: i + 1, createdAt: serverTimestamp() }); });
      await b.commit();
    } catch (err) { onErr(err); }
    this.disabled = false;
  });
  function deplacerGal(i, delta) {
    const a = galerie[i], c = galerie[i + delta]; if (!a || !c) return Promise.resolve();
    const b = writeBatch(db), liste = galerie.slice();
    liste[i] = c; liste[i + delta] = a;
    liste.forEach(function (g, k) { if ((g.ordre || 0) !== k + 1) b.update(doc(db, "galerie", g.id), { ordre: k + 1 }); });
    return b.commit().catch(onErr);
  }
  function rendreGalerie() {
    const box = $("listGalerie"); if (!box) return;
    $("galTotal").textContent = galerie.length ? "(" + galerie.length + ")" : "";
    if (!galerie.length) return vide(box, "Aucune photo ajoutée pour le moment : le site affiche sa galerie d'origine.");
    box.textContent = "";
    galerie.forEach(function (g, i) {
      const it = el("article", "item" + (g.public ? "" : " past")), head = el("div", "item-head hum-head");
      if (galOk(g.photo)) { const im = el("img", "hum-thumb gal-thumb"); im.src = g.photo.indexOf("data:") === 0 ? g.photo : "./" + encodeURI(g.photo); im.alt = ""; im.loading = "lazy"; head.appendChild(im); }
      else head.appendChild(el("span", "hum-thumb hum-none", "?"));
      const mid = el("div", "hum-mid"); mid.appendChild(el("div", "item-title", "Photo " + (i + 1))); head.appendChild(mid);
      head.appendChild(el("span", "pill " + (g.public ? "ok" : "draft"), g.public ? "Sur le site" : "Masquée"));
      it.appendChild(head);
      const ac = el("div", "item-actions");
      if (i > 0) ac.appendChild(btn("↑ Monter", "btn-ghost", function () { return deplacerGal(i, -1); }));
      if (i < galerie.length - 1) ac.appendChild(btn("↓ Descendre", "btn-ghost", function () { return deplacerGal(i, 1); }));
      ac.appendChild(btn(g.public ? "Masquer" : "Afficher", "btn-ghost", function () { return updateDoc(doc(db, "galerie", g.id), { public: !g.public }).catch(onErr); }));
      ac.appendChild(btn("Supprimer", "btn-danger", function () {
        if (!confirmer("Supprimer cette photo ?")) return;
        return deleteDoc(doc(db, "galerie", g.id)).catch(onErr);
      }));
      it.appendChild(ac); box.appendChild(it);
    });
  }

  // ---------- ÉVÉNEMENTS ----------
  function ecouterEvenements() {
    ecouter("evenements", "dateISO", function (list) {
      evenements = list; donnees.evenements = list;
      majListeEvenements(); majTableauDeBord(); rendreEvenements();
    });
  }
  function resetEvForm() {
    evEditId = null; $("evForm").reset(); $("evOuvert").checked = true; $("evPublic").checked = false;
    $("evSubmit").textContent = "Ajouter"; $("evCancel").hidden = true; $("evFormTitle").textContent = "Ajouter un événement";
  }
  $("evCancel").addEventListener("click", resetEvForm);
  $("evForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const data = { titre: $("evTitre").value.trim().slice(0, 100), dateISO: $("evDate").value, heure: $("evHeure").value, lieu: $("evLieu").value.trim().slice(0, 100), description: $("evDesc").value.trim().slice(0, 1000), ouvert: $("evOuvert").checked, public: $("evPublic").checked };
    if (!data.titre || !data.dateISO || !data.lieu) return;
    $("evSubmit").disabled = true;
    try {
      if (evEditId) await updateDoc(doc(db, "evenements", evEditId), data);
      else await addDoc(collection(db, "evenements"), Object.assign(data, { createdAt: serverTimestamp() }));
      resetEvForm(); showBanner("");
    } catch (err) { onErr(err); }
    finally { $("evSubmit").disabled = false; }
  });
  function rendreEvenements() {
    const box = $("listEvenements"); if (!box) return;
    if (!evenements.length) return vide(box, "Aucun événement pour le moment.");
    const auj = debutJour();
    const tri = evenements.slice().sort(function (a, b) {
      const pa = dateEv(a) < auj, pb = dateEv(b) < auj;
      return pa !== pb ? (pa ? 1 : -1) : (pa ? dateEv(b) - dateEv(a) : dateEv(a) - dateEv(b));
    });
    box.textContent = "";
    tri.forEach(function (ev) {
      const passe = dateEv(ev) < auj;
      const it = el("article", "item" + (passe ? " past" : "")), head = el("div", "item-head"), left = el("div");
      left.appendChild(el("div", "item-title", ev.titre));
      left.appendChild(el("div", "item-meta", texteDate(ev) + " · " + ev.lieu));
      head.appendChild(left);
      const pills = el("div");
      if (passe) pills.appendChild(el("span", "pill draft", "Passé"));
      else pills.appendChild(el("span", "pill " + (ev.ouvert ? "ok" : "draft"), ev.ouvert ? "Billetterie ouverte" : "Billetterie fermée"));
      if (ev.public) { pills.appendChild(document.createTextNode(" ")); pills.appendChild(el("span", "pill pin", "Sur le site")); }
      head.appendChild(pills); it.appendChild(head);
      const vendus = billets.filter(function (b) { return b.eventName === ev.titre; }).length;
      it.appendChild(el("p", "item-text", (ev.description ? ev.description + "\n" : "") + pluriel(vendus, "billet émis", "billets émis")));
      const ac = el("div", "item-actions");
      ac.appendChild(btn("Modifier", "btn-ghost", function () {
        evEditId = ev.id; $("evTitre").value = ev.titre; $("evDate").value = ev.dateISO; $("evHeure").value = ev.heure || ""; $("evLieu").value = ev.lieu;
        $("evDesc").value = ev.description || ""; $("evOuvert").checked = !!ev.ouvert; $("evPublic").checked = !!ev.public;
        $("evSubmit").textContent = "Enregistrer"; $("evCancel").hidden = false; $("evFormTitle").textContent = "Modifier l'événement";
        $("evForm").scrollIntoView({ behavior: "smooth", block: "start" }); return Promise.resolve();
      }));
      if (!passe) ac.appendChild(btn("Générer un billet", "btn-ok", function () {
        $("bkEvent").value = ev.titre; $("bkDate").value = texteDate(ev); $("bkLieu").value = ev.lieu; aller("billets"); return Promise.resolve();
      }));
      ac.appendChild(btn(ev.ouvert ? "Fermer la billetterie" : "Ouvrir la billetterie", "btn-ghost", function () { return updateDoc(doc(db, "evenements", ev.id), { ouvert: !ev.ouvert }).catch(onErr); }));
      ac.appendChild(btn("Supprimer", "btn-danger", function () {
        if (!confirmer("Supprimer cet événement ?\n\nLes billets déjà émis restent valides.")) return;
        return deleteDoc(doc(db, "evenements", ev.id)).catch(onErr);
      }));
      it.appendChild(ac); box.appendChild(it);
    });
  }
  // Même texte que celui signé par le serveur (api/_lib/tickets.js) : lu par verifier-billets.html
  function texteQr(t) {
    return ["NDOSHO COMÉDIE CLUB — BILLET", "ID: " + t.ticketId, "Nom: " + t.nom, "Téléphone: " + t.tel, "Événement: " + t.eventName,
      "Date: " + t.eventDate, "Lieu: " + t.eventLieu, "Montant payé: " + t.montant, "Émis le: " + t.emissionDate,
      "SIG: " + t.sig, "Ce billet est unique et non transférable."].join("\n");
  }
  function lienBillet(t) {
    const d = { n: t.nom, t: t.tel, e: t.eventName, dt: t.eventDate, l: t.eventLieu, m: t.montant, id: t.ticketId, ed: t.emissionDate, sig: t.sig };
    return location.origin + location.pathname.replace(/[^/]*$/, "") + "mon-billet.html?d=" + encodeURIComponent(JSON.stringify(d));
  }
  function numeroWhatsApp(raw) {
    const d = String(raw || "").replace(/\D/g, "");
    return d.indexOf("243") === 0 ? d : d.charAt(0) === "0" ? "243" + d.slice(1) : "243" + d;
  }
  function messageWhatsApp(t) {
    return "Bonjour " + t.nom + ', voici votre billet pour "' + t.eventName + '" (' + t.eventDate + "). Merci de votre confiance !\n\nID billet : " + t.ticketId +
      "\n\nCliquez ici pour voir et télécharger votre billet à tout moment :\n" + lienBillet(t);
  }
  function ouvrirWhatsApp(t) { window.open("https://wa.me/" + numeroWhatsApp(t.tel) + "?text=" + encodeURIComponent(messageWhatsApp(t)), "_blank", "noopener"); }
  function copier(texte, bouton) {
    const ok = function () { if (!bouton) return; const avant = bouton.textContent; bouton.textContent = "Lien copié !"; setTimeout(function () { bouton.textContent = avant; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texte).then(ok, function () { window.prompt("Copiez le lien :", texte); });
    else window.prompt("Copiez le lien :", texte);
  }

  function afficherBillet(t) {
    billetCourant = t;
    const wrap = $("ticketCard");
    window.BilletUI.remplir(wrap, t);
    window.BilletUI.qr(wrap, texteQr(t));
    $("bkPlaceholder").hidden = true; wrap.classList.add("show"); window.BilletUI.ajuster(wrap); $("ticketActions").hidden = false;
  }

  $("bkEvent").addEventListener("change", function () {
    const e = evenementsConnus[this.value.trim()];
    if (e) { if (!$("bkDate").value) $("bkDate").value = e.date || ""; if (!$("bkLieu").value) $("bkLieu").value = e.lieu || ""; }
  });
  $("billetForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const err = $("bkError"), b = $("bkSubmit"); err.hidden = true;
    b.disabled = true; b.textContent = "Signature en cours…";
    try {
      const token = await auth.currentUser.getIdToken();
      const r = await fetch("/api/billet", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ nom: $("bkNom").value, tel: $("bkTel").value, eventName: $("bkEvent").value, eventDate: $("bkDate").value, eventLieu: $("bkLieu").value, montantValeur: $("bkMontant").value, devise: $("bkDevise").value }),
      });
      const j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.erreur || (r.status === 404 ? "Fonction /api/billet introuvable : le site doit être déployé sur Vercel avec le dossier api/." : "Erreur serveur (" + r.status + ")."));
      afficherBillet(j.billet);
      if (demandeCourante) {
        const dm = demandeCourante; demandeCourante = null; $("bkDemandeNote").hidden = true;
        updateDoc(doc(db, "reservations", dm.id), { statut: "validee", ticketId: j.billet.ticketId }).catch(onErr);
      }
      $("bkNom").value = ""; $("bkTel").value = ""; $("bkMontant").value = ""; // l'événement, la date et le lieu restent pour le billet suivant
      $("bkNom").focus();
    } catch (ex) {
      err.textContent = ex instanceof TypeError ? "Connexion impossible : vérifiez votre accès internet." : ex.message; err.hidden = false;
    } finally { b.disabled = false; b.textContent = "Générer le billet"; }
  });
  $("copyBtn").addEventListener("click", function () { if (billetCourant) copier(lienBillet(billetCourant), this); });
  $("waBtn").addEventListener("click", function () { if (billetCourant) ouvrirWhatsApp(billetCourant); });
  $("dlBtn").addEventListener("click", async function () {
    if (!billetCourant) return;
    try {
      if (!window.html2canvas) await new Promise(function (ok, ko) {
        const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc);
      });
      const canvas = await window.BilletUI.versCanvas($("ticketCard"));
      const a = document.createElement("a"); a.download = "billet-" + billetCourant.ticketId + ".png"; a.href = canvas.toDataURL("image/png"); a.click();
    } catch (ex) { console.error(ex); alert("Le téléchargement a échoué. Vérifiez la connexion internet, ou faites une capture d'écran du billet."); }
  });

  $("resaSearch").addEventListener("input", function () { filtreResa = sansAccent(this.value.trim()); rendreReservations(); });
  function somme(devise) { return billets.reduce(function (s, b) { return s + (b.devise === devise && typeof b.montantValeur === "number" ? b.montantValeur : 0); }, 0); }
  function carteStat(cls, icone, nombre, libelle, sub) {
    const a = el("article", "stat " + cls), ic = el("span", "stat-ico"); ic.innerHTML = svg(icone, 26); a.appendChild(ic);
    const d = el("div"); d.appendChild(el("strong", "stat-num", nombre)); d.appendChild(el("span", "stat-label", libelle)); d.appendChild(el("small", null, sub)); a.appendChild(d); return a;
  }
  function rendreReservations() {
    const st = $("resaStats"); st.textContent = "";
    const usd = somme("USD"), cdf = somme("CDF"), nb = function (n) { return String(Math.round(n * 100) / 100); };
    st.appendChild(carteStat("stat-gold", "ticket", String(billets.length), "Billets émis", "au total"));
    st.appendChild(carteStat("stat-green", "bolt", nb(usd) + " $", "Encaissé en dollars", "billets émis"));
    st.appendChild(carteStat("stat-violet", "bolt", nb(cdf) + " FC", "Encaissé en francs", "billets émis"));
    const box = $("listBillets");
    const list = billets.filter(function (b) { return !filtreResa || sansAccent([b.nom, b.tel, b.eventName, b.ticketId].join(" ")).indexOf(filtreResa) !== -1; });
    if (!billets.length) return vide(box, "Aucun billet émis pour le moment.");
    if (!list.length) return vide(box, "Aucun billet ne correspond à la recherche.");
    box.textContent = "";
    list.forEach(function (b) {
      const it = el("article", "item"), head = el("div", "item-head"), left = el("div");
      left.appendChild(el("div", "item-title", b.nom));
      left.appendChild(el("div", "item-meta", dateHeure(b.createdAt) + " · " + b.tel));
      head.appendChild(left);
      const pl = el("div"); pl.appendChild(el("span", "pill ok", b.montant));
      if (b.scanneAt) { pl.appendChild(document.createTextNode(" ")); pl.appendChild(el("span", "pill pin", "Entré " + dateHeure(b.scanneAt))); }
      head.appendChild(pl); it.appendChild(head);
      it.appendChild(el("p", "item-text", b.eventName + " — " + b.eventDate + " — " + b.eventLieu + "\nID : " + b.ticketId));
      const ac = el("div", "item-actions");
      ac.appendChild(btn("Revoir le billet", "btn-ghost", function () { afficherBillet(b); aller("billets"); return Promise.resolve(); }));
      ac.appendChild(btn("WhatsApp", "btn-ok", function () { ouvrirWhatsApp(b); return Promise.resolve(); }));
      const cp = btn("Copier le lien", "btn-ghost", function () { copier(lienBillet(b), cp); return Promise.resolve(); }); ac.appendChild(cp);
      ac.appendChild(btn("Supprimer", "btn-danger", function () {
        if (!confirmer("Retirer ce billet de la liste ?\n\nLe billet sera refusé à l'entrée (si le suivi des entrées est activé sur Vercel, voir ADMIN-SETUP.md). Sinon, son QR code restera reconnu comme authentique.")) return;
        return deleteDoc(doc(db, "billets", b.id)).catch(onErr);
      }));
      it.appendChild(ac); box.appendChild(it);
    });
  }

  // ---------- MESSAGES (page « Contacts ») ----------
  function ecouterMessages() {
    ecouter("messages", "createdAt", function (list) {
      donnees.messages = list;
      etat.messagesNonLus = list.filter(function (m) { return !m.lu; }).length;
      badge("badgeMessages", etat.messagesNonLus); majTableauDeBord();
      const box = $("listMessages");
      if (!list.length) return vide(box, "Aucun message pour le moment.");
      box.textContent = "";
      list.forEach(function (m) {
        const it = el("article", "item" + (m.lu ? "" : " unread"));
        const head = el("div", "item-head");
        const left = el("div");
        left.appendChild(el("div", "item-title", m.nom));
        left.appendChild(el("div", "item-meta", dateHeure(m.createdAt)));
        head.appendChild(left); head.appendChild(el("span", "pill", m.objet));
        it.appendChild(head);
        it.appendChild(el("p", "item-text", m.message));
        const ct = el("div", "item-contact");
        const a1 = el("a"); a1.appendChild(avecIcone("tel", m.tel)); a1.href = "tel:" + String(m.tel).replace(/[^\d+]/g, ""); ct.appendChild(a1);
        const a2 = el("a"); a2.appendChild(avecIcone("mail", m.email)); a2.href = "mailto:" + m.email; ct.appendChild(a2);
        it.appendChild(ct);
        const ac = el("div", "item-actions");
        const w = el("a", "btn btn-sm btn-ok", "Répondre WhatsApp"); w.href = wa(m.tel); w.target = "_blank"; w.rel = "noopener"; ac.appendChild(w);
        const em = el("a", "btn btn-sm btn-ghost", "Répondre par email"); em.href = "mailto:" + m.email + "?subject=" + encodeURIComponent("Re : " + m.objet); ac.appendChild(em);
        ac.appendChild(btn(m.lu ? "Marquer non lu" : "Marquer lu", "btn-ghost", function () { return updateDoc(doc(db, "messages", m.id), { lu: !m.lu }).catch(onErr); }));
        ac.appendChild(btn("Supprimer", "btn-danger", function () { if (!confirmer("Supprimer ce message ?")) return; return deleteDoc(doc(db, "messages", m.id)).catch(onErr); }));
        it.appendChild(ac); box.appendChild(it);
      });
    });
  }

  // ---------- TÉMOIGNAGES ----------
  let temoignages = [], statutFiltre = "en_attente";
  function ecouterTemoignages() {
    ecouter("temoignages", "createdAt", function (list) {
      temoignages = list; donnees.temoignages = list;
      etat.temoignagesAttente = list.filter(function (t) { return t.statut === "en_attente"; }).length;
      badge("badgeTemoignages", etat.temoignagesAttente); majTableauDeBord();
      rendreTemoignages();
    });
  }
  $("chipsTemoignages").addEventListener("click", function (e) {
    const c = e.target.closest(".chip"); if (!c) return;
    statutFiltre = c.dataset.statut;
    document.querySelectorAll("#chipsTemoignages .chip").forEach(function (x) { x.classList.toggle("active", x === c); });
    rendreTemoignages();
  });
  function rendreTemoignages() {
    const box = $("listTemoignages");
    const list = temoignages.filter(function (t) { return t.statut === statutFiltre; });
    if (!list.length) return vide(box, statutFiltre === "en_attente" ? "Aucun témoignage en attente." : "Rien dans cette liste.");
    box.textContent = "";
    list.forEach(function (t) {
      const it = el("article", "item" + (t.statut === "en_attente" ? " unread" : ""));
      const head = el("div", "t-head");
      if (safeImg(t.photo)) { const im = el("img", "t-photo"); im.src = t.photo; im.alt = ""; head.appendChild(im); }
      const who = el("div");
      who.appendChild(el("div", "item-title", t.nom));
      who.appendChild(el("div", "stars", stars(t.note)));
      who.appendChild(el("div", "item-meta", dateHeure(t.createdAt) + " · " + t.tel));
      head.appendChild(who); it.appendChild(head);
      it.appendChild(el("p", "item-text", t.message));
      const ac = el("div", "item-actions");
      if (t.statut !== "approuve") ac.appendChild(btn("Approuver et publier", "btn-ok", function () { return approuver(t); }));
      if (t.statut !== "refuse") ac.appendChild(btn("Refuser", "btn-ghost", function () { return refuser(t); }));
      ac.appendChild(btn("Supprimer", "btn-danger", function () { return supprimerTemoignage(t); }));
      it.appendChild(ac); box.appendChild(it);
    });
  }
  // Seules les infos publiques (sans téléphone) sont copiées dans "temoignages_publics"
  function approuver(t) {
    const b = writeBatch(db);
    b.set(doc(db, "temoignages_publics", t.id), { nom: t.nom, note: t.note, message: t.message, photo: t.photo || "", date: serverTimestamp() });
    b.update(doc(db, "temoignages", t.id), { statut: "approuve" });
    return b.commit().catch(onErr);
  }
  function refuser(t) {
    const b = writeBatch(db);
    b.delete(doc(db, "temoignages_publics", t.id));
    b.update(doc(db, "temoignages", t.id), { statut: "refuse" });
    return b.commit().catch(onErr);
  }
  function supprimerTemoignage(t) {
    if (!confirmer("Supprimer définitivement ce témoignage ?")) return Promise.resolve();
    const b = writeBatch(db);
    b.delete(doc(db, "temoignages_publics", t.id));
    b.delete(doc(db, "temoignages", t.id));
    return b.commit().catch(onErr);
  }

  // ---------- ACTUALITÉS ----------
  let imageData = "", editId = null;
  const f = { type: $("actuType"), titre: $("actuTitre"), contenu: $("actuContenu"), epingle: $("actuEpingle"), publie: $("actuPublie") };

  $("actuImage").addEventListener("change", async function () {
    const file = this.files && this.files[0]; if (!file) return;
    try { imageData = await resizeImage(file, 900, 0.72, false); majApercu(); }
    catch (e) { this.value = ""; alert(e.message || "Image non valide"); }
  });
  $("actuImageRemove").addEventListener("click", function () { imageData = ""; $("actuImage").value = ""; majApercu(); });
  function majApercu() { $("actuImagePreview").src = imageData || ""; $("actuImagePreviewBox").hidden = !imageData; }

  function resetForm() {
    editId = null; imageData = ""; $("actuForm").reset(); f.publie.checked = true; majApercu();
    $("actuSubmit").textContent = "Publier"; $("actuCancel").hidden = true; $("actuFormTitle").textContent = "Publier une actualité";
  }
  $("actuCancel").addEventListener("click", resetForm);

  $("actuForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const data = {
      type: f.type.value, titre: f.titre.value.trim().slice(0, 140), contenu: f.contenu.value.trim().slice(0, 8000),
      image: imageData, epingle: f.epingle.checked, publie: f.publie.checked,
    };
    if (!data.titre || !data.contenu) return;
    // Liens des publications sur les réseaux : seuls ceux qui sont remplis (et valides) seront affichés
    for (const r of RESEAUX) {
      const champ = $("actu" + r.cle.charAt(0).toUpperCase() + r.cle.slice(1));
      const brut = champ.value.trim();
      const propre = lienReseau(brut, r);
      if (brut && !propre) { alert("Le lien " + r.nom + " n'est pas valide. Collez l'adresse de la publication, par exemple : " + champ.placeholder); champ.focus(); return; }
      data[r.cle] = propre;
    }
    $("actuSubmit").disabled = true;
    try {
      if (editId) await updateDoc(doc(db, "actualites", editId), data);
      else await addDoc(collection(db, "actualites"), Object.assign(data, { date: serverTimestamp(), views: 0 }));
      resetForm(); showBanner("");
    } catch (err) { onErr(err); }
    finally { $("actuSubmit").disabled = false; }
  });

  function modifier(a) {
    editId = a.id; imageData = safeImg(a.image) ? a.image : "";
    f.type.value = a.type || "actualite"; f.titre.value = a.titre; f.contenu.value = a.contenu;
    f.epingle.checked = !!a.epingle; f.publie.checked = !!a.publie; majApercu();
    RESEAUX.forEach(function (r) { $("actu" + r.cle.charAt(0).toUpperCase() + r.cle.slice(1)).value = a[r.cle] || ""; });
    $("actuSubmit").textContent = "Enregistrer"; $("actuCancel").hidden = false; $("actuFormTitle").textContent = "Modifier la publication";
    $("actuForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function ecouterActus() {
    ecouter("actualites", "date", function (list) {
      const total = list.reduce(function (s, a) { return s + (a.views || 0); }, 0);
      donnees.actus = list; etat.vues = total;
      etat.actusPubliees = list.filter(function (a) { return a.publie; }).length;
      etat.actusBrouillons = list.length - etat.actusPubliees;
      majTableauDeBord();
      $("totalViews").textContent = list.length ? "· " + total + " vues au total" : "";
      const box = $("listActus");
      if (!list.length) return vide(box, "Aucune publication pour le moment.");
      box.textContent = "";
      list.forEach(function (a) {
        const it = el("article", "item");
        const head = el("div", "item-head");
        const left = el("div");
        left.appendChild(el("div", "item-title", a.titre));
        const meta = el("div", "item-meta", formatDate(a.date) + " · "); meta.appendChild(avecIcone("oeil", (a.views || 0) + " vue" + ((a.views || 0) > 1 ? "s" : ""), 14)); left.appendChild(meta);
        head.appendChild(left);
        const pills = el("div");
        pills.appendChild(el("span", "pill", TYPES[a.type] || "Actualité"));
        pills.appendChild(document.createTextNode(" "));
        pills.appendChild(el("span", "pill " + (a.publie ? "ok" : "draft"), a.publie ? "Publié" : "Brouillon"));
        if (a.epingle) { pills.appendChild(document.createTextNode(" ")); pills.appendChild(el("span", "pill pin", "À la une")); }
        head.appendChild(pills); it.appendChild(head);
        const ac = el("div", "item-actions");
        ac.appendChild(btn("Modifier", "btn-ghost", function () { modifier(a); return Promise.resolve(); }));
        ac.appendChild(btn(a.publie ? "Dépublier" : "Publier", "btn-ok", function () { return updateDoc(doc(db, "actualites", a.id), { publie: !a.publie }).catch(onErr); }));
        ac.appendChild(btn(a.epingle ? "Désépingler" : "Épingler", "btn-ghost", function () { return updateDoc(doc(db, "actualites", a.id), { epingle: !a.epingle }).catch(onErr); }));
        ac.appendChild(btn("Supprimer", "btn-danger", function () { if (!confirmer("Supprimer cette publication ?")) return; return deleteDoc(doc(db, "actualites", a.id)).catch(onErr); }));
        it.appendChild(ac); box.appendChild(it);
      });
    });
  }
}
