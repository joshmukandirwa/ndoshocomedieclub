// Carousel des témoignages APPROUVÉS (accueil + page témoignages).
// Lit la collection publique "temoignages_publics" (sans numéro de téléphone).
import { isConfigured, db, collection, getDocs, query, orderBy, limit } from "./firebase.js";
import { EXEMPLES_TEMOIGNAGES } from "./data-exemples.js";
import { el, safeImg, initials, stars, tronquer } from "./utils.js";

async function charger() {
  if (!isConfigured) return EXEMPLES_TEMOIGNAGES;
  try {
    const snap = await getDocs(query(collection(db, "temoignages_publics"), orderBy("date", "desc"), limit(30)));
    const items = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    return items.length ? items : EXEMPLES_TEMOIGNAGES;
  } catch (e) {
    console.warn("Témoignages : lecture impossible", e);
    return EXEMPLES_TEMOIGNAGES;
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

// ---------- fen\u00eatre pour lire un t\u00e9moignage en entier ----------
var modal;
function lire(t) {
  if (!modal) {
    modal = el("div", "actu-modal"); modal.hidden = true;
    modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
    const box = el("div", "actu-modal-box");
    const bar = el("div", "actu-modal-bar");
    bar.appendChild(el("span"));
    const x = el("button", "actu-modal-close", "\u00d7"); x.type = "button"; x.setAttribute("aria-label", "Fermer");
    x.addEventListener("click", function () { modal.hidden = true; document.body.classList.remove("menu-lock"); });
    bar.appendChild(x);
    box.appendChild(bar);
    box.appendChild(el("div", "actu-modal-body"));
    modal.appendChild(box);
    modal.addEventListener("click", function (e) { if (e.target === modal) x.click(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) x.click(); });
    document.body.appendChild(modal);
  }
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

export async function initCarouselTemoignages() {
  const slider = document.getElementById("temoigSlider");
  if (!slider) return;
  LISTE = await charger();
  slider.textContent = "";
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
