// Pastilles « nouveau » dans le menu : nombre de nouveautés publiées depuis la dernière visite
// de chaque page (Humoristes, Événements, Actualités, Partenaires, Témoignages).
//  - la 1re fois qu'un visiteur arrive, tout est considéré comme déjà vu (pas de pastille)
//  - quand l'admin publie quelque chose de nouveau, une pastille avec le nombre apparaît
//  - dès que le visiteur ouvre la page concernée, la pastille disparaît pour de bon
// Mémoire : localStorage du visiteur (aucun compte, aucune donnée envoyée).
import { isConfigured, db, collection, getDocs, query, where, orderBy, limit } from "./firebase.js";

const SECTIONS = {
  humoristes:  { page: "humoristes.html",  q: function () { return query(collection(db, "humoristes"),  where("public", "==", true),  limit(100)); }, champ: "createdAt" },
  evenements:  { page: "evenements.html",  q: function () { return query(collection(db, "evenements"),  where("public", "==", true),  limit(100)); }, champ: "createdAt" },
  galerie:     { page: "galerie.html",     q: function () { return query(collection(db, "galerie"),     where("public", "==", true),  limit(200)); }, champ: "createdAt" },
  actualites:  { page: "actualites.html",  q: function () { return query(collection(db, "actualites"),  where("publie", "==", true),  limit(100)); }, champ: "date" },
  partenaires: { page: "partenaires.html", q: function () { return query(collection(db, "partenaires"), where("public", "==", true),  limit(100)); }, champ: "createdAt" },
  temoignages: { page: "temoignages.html", q: function () { return query(collection(db, "temoignages_publics"), orderBy("date", "desc"), limit(30)); }, champ: "date" },
};
const CLE_VU = "ndosho_nouveautes_vu";
const CLE_CACHE = "ndosho_nouveautes_cache";
const DUREE_CACHE = 3 * 60 * 1000;

function lire(cle) { try { return JSON.parse(localStorage.getItem(cle) || "{}") || {}; } catch (e) { return {}; } }
function ecrire(cle, v) { try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) {} }
function ms(v) {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  const t = new Date(v).getTime();
  return isNaN(t) ? 0 : t;
}

// Dates de publication de chaque rubrique (mises en cache 3 min pour ne pas relire la base à chaque page)
async function recuperer() {
  try {
    const c = JSON.parse(sessionStorage.getItem(CLE_CACHE) || "null");
    if (c && Date.now() - c.t < DUREE_CACHE) return c.d;
  } catch (e) {}
  const d = {};
  await Promise.all(Object.keys(SECTIONS).map(async function (k) {
    try {
      const snap = await getDocs(SECTIONS[k].q());
      d[k] = snap.docs.map(function (x) { return ms(x.data()[SECTIONS[k].champ]); }).filter(Boolean);
    } catch (e) { d[k] = []; }
  }));
  try { sessionStorage.setItem(CLE_CACHE, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {}
  return d;
}

function nom(href) { return String(href || "").split("#")[0].split("?")[0].split("/").pop().toLowerCase(); }

function afficher(comptes) {
  document.querySelectorAll(".nav-badge, .menu-badge").forEach(function (n) { n.remove(); });
  let total = 0;
  document.querySelectorAll(".nav-links a, .mobile-menu a").forEach(function (a) {
    const k = Object.keys(SECTIONS).find(function (s) { return SECTIONS[s].page === nom(a.getAttribute("href")); });
    const n = k ? comptes[k] : 0;
    if (!n) return;
    const b = document.createElement("span");
    b.className = "nav-badge";
    b.textContent = n > 9 ? "9+" : String(n);
    b.setAttribute("aria-label", n + (n > 1 ? " nouveautés" : " nouveauté"));
    a.appendChild(b);
  });
  Object.keys(comptes).forEach(function (k) { total += comptes[k] || 0; });
  const btn = document.getElementById("menuBtn");
  if (btn && total) {
    const b = document.createElement("span");
    b.className = "menu-badge";
    b.textContent = total > 9 ? "9+" : String(total);
    b.setAttribute("aria-label", total + (total > 1 ? " nouveautés" : " nouveauté"));
    btn.appendChild(b);
  }
}

(async function () {
  if (!isConfigured) return;
  const lien = document.createElement("link");
  lien.rel = "stylesheet"; lien.href = "css/nouveautes.css";
  document.head.appendChild(lien);

  const courante = Object.keys(SECTIONS).find(function (k) { return SECTIONS[k].page === nom(location.pathname); });
  const donnees = await recuperer();
  const vu = lire(CLE_VU);
  const comptes = {};
  Object.keys(SECTIONS).forEach(function (k) {
    const dates = donnees[k] || [];
    const recent = dates.reduce(function (m, t) { return t > m ? t : m; }, 0);
    if (vu[k] == null || k === courante) {
      vu[k] = Math.max(Date.now(), recent, vu[k] || 0); // première visite, ou page ouverte : tout est vu
      comptes[k] = 0;
    } else {
      comptes[k] = dates.filter(function (t) { return t > vu[k]; }).length;
    }
  });
  ecrire(CLE_VU, vu);
  afficher(comptes);
})();
