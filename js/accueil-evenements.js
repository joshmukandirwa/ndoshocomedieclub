// Accueil : ajoute à la liste « Agenda » les prochains événements créés dans l'admin
// (Événements → « Afficher sur le site public »). L'événement écrit à la main reste en premier.
import { isConfigured, db, collection, getDocs, query, where, limit } from "./firebase.js";
import { el, RESEAUX, lienReseau } from "./utils.js";

const ABR = ["JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MAX_TOTAL = 3; // événement manuel inclus
function dateEv(e) { return new Date(String(e.dateISO || "") + "T" + (e.heure || "00:00")); }
function slugify(str) {
  return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function delai(d) {
  const j = Math.ceil((d - Date.now()) / 86400000);
  return j <= 0 ? "Aujourd'hui" : j === 1 ? "Demain" : "Dans " + j + " jours";
}

(async function () {
  const liste = document.querySelector(".events-list");
  if (!liste || !isConfigured) return;
  let events = [];
  try {
    const snap = await getDocs(query(collection(db, "evenements"), where("public", "==", true), limit(100)));
    events = snap.docs.map(function (d) { return d.data(); });
  } catch (e) { console.warn("Agenda : lecture impossible", e); return; }
  const debut = new Date(); debut.setHours(0, 0, 0, 0);
  const place = MAX_TOTAL - liste.children.length;
  events.filter(function (e) { return e.titre && e.dateISO && dateEv(e) >= debut; })
    .sort(function (a, b) { return dateEv(a) - dateEv(b); }).slice(0, Math.max(0, place))
    .forEach(function (e) {
      const d = dateEv(e), li = el("li", "event-item");
      const badge = el("div", "event-date"); badge.appendChild(el("span", "event-day", String(d.getDate()))); badge.appendChild(el("span", "event-month", ABR[d.getMonth()]));
      const info = el("div", "event-info"); info.appendChild(el("p", "event-soon", delai(d)));
      const h = el("h3"), a = el("a", null, e.titre); a.href = "evenements.html#" + slugify(e.titre); h.appendChild(a); info.appendChild(h);
      info.appendChild(el("p", null, d.getDate() + " " + MOIS[d.getMonth()] + " " + d.getFullYear() + (e.heure ? " à " + e.heure : "") + " · " + e.lieu));
      // Icônes Facebook / Instagram / TikTok : seulement celles renseignées dans l'admin
      let box = null;
      RESEAUX.forEach(function (r) {
        const href = lienReseau(e[r.cle], r);
        if (!href) return;
        if (!box) box = el("div", "actu-social actu-social--carte");
        const a = el("a", "actu-social-link"); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer";
        a.setAttribute("aria-label", "Voir l'événement sur " + r.nom); a.title = r.nom;
        const im = el("img"); im.src = r.img; im.alt = r.nom; im.loading = "lazy";
        a.appendChild(im); box.appendChild(a);
      });
      if (box) info.appendChild(box);
      li.appendChild(badge); li.appendChild(info); liste.appendChild(li);
    });
})();
