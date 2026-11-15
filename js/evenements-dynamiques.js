// Page publique « Événements » : affiche les événements créés dans l'admin (Événements → « Afficher sur le site »).
// Le contenu statique de la page (affiche à la une, compte à rebours) reste tel quel ; ceci ajoute les autres
// rendez-vous. S'il n'y en a aucun (ou si Firebase est indisponible), le message « Rien d'autre au programme » reste.
import { isConfigured, db, collection, getDocs, query, where, limit } from "./firebase.js";
import { el, MOIS, RESEAUX, lienReseau } from "./utils.js";

const ABR = ["JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"];

function dateEv(e) { return new Date(String(e.dateISO || "") + "T" + (e.heure || "00:00")); }

async function charger() {
  if (!isConfigured) return [];
  try {
    const snap = await getDocs(query(collection(db, "evenements"), where("public", "==", true), limit(100)));
    return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  } catch (e) { console.warn("Événements : lecture impossible", e); return []; }
}

function slugify(str) {
  return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
let toast;
function afficherToast(msg) {
  if (!toast) { toast = el("div", "copy-toast"); document.body.appendChild(toast); }
  toast.textContent = msg; requestAnimationFrame(function () { toast.classList.add("show"); });
  clearTimeout(toast._t); toast._t = setTimeout(function () { toast.classList.remove("show"); }, 1800);
}
function copier(url) {
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { afficherToast("Lien copié !"); }, function () { afficherToast(url); });
  else afficherToast(url);
}
// Lien vers la carte (la page s'ouvre sur l'événement et le met en évidence)
function bouton(e, slug) {
  const url = location.origin + location.pathname.replace(/[^/]*$/, "") + "evenements.html#" + slug;
  const peutPartager = typeof navigator.share === "function";
  const label = peutPartager ? "Partager cet événement" : "Copier le lien de cet événement";
  const b = el("button", "evnt-share-btn"); b.type = "button"; b.title = label; b.setAttribute("aria-label", label);
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
  ["width", "height"].forEach(function (a) { svg.setAttribute(a, "16"); });
  ["viewBox:0 0 24 24", "fill:none", "stroke:currentColor", "stroke-width:2", "stroke-linecap:round", "stroke-linejoin:round", "aria-hidden:true"].forEach(function (x) { const i = x.indexOf(":"); svg.setAttribute(x.slice(0, i), x.slice(i + 1)); });
  ["M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5", "M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"].forEach(function (d) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); svg.appendChild(p); });
  b.appendChild(svg);
  b.addEventListener("click", function (ev) {
    ev.preventDefault(); ev.stopPropagation();
    if (peutPartager) navigator.share({ url: url }).catch(function (err) { if (err && err.name !== "AbortError") copier(url); });
    else copier(url);
  });
  return b;
}

function carte(e) {
  const d = dateEv(e);
  const c = el("article", "evnt-card");
  const slug = slugify(e.titre);
  if (slug && !document.getElementById(slug)) { c.id = slug; c.appendChild(bouton(e, slug)); }
  const top = el("div", "evnt-card-top");
  const badge = el("div", "event-date");
  badge.appendChild(el("span", "event-day", String(d.getDate())));
  badge.appendChild(el("span", "event-month", ABR[d.getMonth()]));
  top.appendChild(badge);
  c.appendChild(top);
  const body = el("div", "evnt-card-body");
  body.appendChild(el("h3", null, e.titre));
  body.appendChild(el("p", "event-time", d.getDate() + " " + MOIS[d.getMonth()] + " " + d.getFullYear() + (e.heure ? " à " + e.heure : "")));
  body.appendChild(el("p", null, e.lieu));
  if (e.description) body.appendChild(el("p", null, e.description.length > 160 ? e.description.slice(0, 157) + "…" : e.description));
  c.appendChild(body);
  // Icônes Facebook / Instagram / TikTok : seulement celles dont l'admin a saisi un lien
  let box = null;
  RESEAUX.forEach(function (r) {
    const href = lienReseau(e[r.cle], r);
    if (!href) return;
    if (!box) box = el("div", "evnt-social");
    const a = el("a", "evnt-social-link"); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", "Voir l'événement sur " + r.nom); a.title = r.nom;
    const im = el("img"); im.src = r.img; im.alt = r.nom; im.loading = "lazy";
    a.appendChild(im); box.appendChild(a);
  });
  if (box) { const bar = el("div", "evnt-card-social"); bar.appendChild(el("span", "evnt-social-titre", "Suivre sur")); bar.appendChild(box); c.appendChild(bar); }
  // La billetterie en ligne (reservation.html) ne concerne que le Festival Punguza Stress.
  if (e.ouvert && /punguza/i.test(e.titre || "")) {
    const foot = el("div", "evnt-card-foot"), a = el("a", null, "Réserver ma place");
    a.href = "reservation.html"; foot.appendChild(a); c.appendChild(foot);
  }
  return c;
}

(async function () {
  const debut = new Date(); debut.setHours(0, 0, 0, 0);
  const liste = (await charger()).filter(function (e) { return e.titre && e.dateISO && dateEv(e) >= debut; })
    .sort(function (a, b) { return dateEv(a) - dateEv(b); });
  if (!liste.length) return;
  const grid = document.getElementById("evntGrid");
  liste.forEach(function (e) { grid.appendChild(carte(e)); });
  document.getElementById("evntMore").hidden = false;
  const vide = document.querySelector(".evnt-empty"); if (vide) vide.classList.remove("show");
  // lien direct (#titre-de-l-evenement) : on se place sur la carte
  if (location.hash.length > 1) {
    const cible = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (cible && grid.contains(cible)) {
      setTimeout(function () {
        cible.scrollIntoView({ behavior: "smooth", block: "center" }); cible.classList.add("evnt-highlight");
        setTimeout(function () { cible.classList.remove("evnt-highlight"); }, 2200);
      }, 300);
    }
  }
})();
