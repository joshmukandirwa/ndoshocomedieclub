// ---------- Filtres d'événements ----------
var filtersWrap = document.getElementById("evntFilters");
var cards = document.querySelectorAll("#evntGrid .evnt-card");
var emptyMsg = document.getElementById("evntEmpty");

if (filtersWrap) {
  filtersWrap.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter-btn");
    if (!btn) return;

    var current = filtersWrap.querySelector(".filter-btn.active");
    if (current) current.classList.remove("active");
    btn.classList.add("active");

    var filter = btn.getAttribute("data-filter");
    var visibleCount = 0;

    cards.forEach(function (card) {
      var match =
        filter === "tous" || card.getAttribute("data-category") === filter;
      card.style.display = match ? "" : "none";
      if (match) visibleCount++;
    });

    emptyMsg.classList.toggle("show", visibleCount === 0);
  });
}

// ---------- Newsletter événements ----------
var evntSubscribeForm = document.getElementById("evntSubscribeForm");
if (evntSubscribeForm) {
  evntSubscribeForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var input = evntSubscribeForm.querySelector('input[type="email"]');
    var email = input.value.trim();
    if (!email) return;

    var existingMsg = evntSubscribeForm.querySelector(".form-msg");
    if (existingMsg) existingMsg.remove();

    var msg = document.createElement("p");
    msg.className = "form-msg";
    msg.textContent = "Merci ! On vous tient au courant à " + email;
    evntSubscribeForm.appendChild(msg);

    evntSubscribeForm.reset();
  });
}

// ---------- Lien copiable par événement ----------
function slugify(str) {
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fallbackCopy(text) {
  var ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch (err) {}
  document.body.removeChild(ta);
}

function showCopyToast() {
  var old = document.querySelector(".copy-toast");
  if (old) old.remove();
  var toast = document.createElement("div");
  toast.className = "copy-toast";
  toast.textContent = "Lien copié !";
  document.body.appendChild(toast);
  requestAnimationFrame(function () {
    toast.classList.add("show");
  });
  setTimeout(function () {
    toast.classList.remove("show");
    setTimeout(function () {
      toast.remove();
    }, 300);
  }, 1800);
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(showCopyToast)
      .catch(function () {
        fallbackCopy(text);
        showCopyToast();
      });
  } else {
    fallbackCopy(text);
    showCopyToast();
  }
}

var shareableCards = document.querySelectorAll(".evnt-card, .featured-card");
shareableCards.forEach(function (card) {
  var titleEl = card.querySelector("h3");
  if (!titleEl) return;

  var slug = slugify(titleEl.textContent);
  if (!slug) return;
  card.id = slug;

  var shareBtn = document.createElement("button");
  shareBtn.type = "button";
  shareBtn.className = "evnt-share-btn";
  shareBtn.title = "Copier le lien de cet événement";
  shareBtn.setAttribute("aria-label", "Copier le lien de cet événement");
  shareBtn.innerHTML = "&#128279;";
  shareBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    var url = window.location.origin + "/api/evenement?id=" + slug;
    copyToClipboard(url);
  });
  card.appendChild(shareBtn);
});

// Si on arrive via un lien #slug, on scrolle vers la carte et on la met en évidence
window.addEventListener("load", function () {
  if (window.location.hash) {
    var target = document.querySelector(window.location.hash);
    if (target) {
      setTimeout(function () {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("evnt-highlight");
        setTimeout(function () {
          target.classList.remove("evnt-highlight");
        }, 2200);
      }, 300);
    }
  }
});

// ---------- Animation d'envoi + redirection WhatsApp ----------
var festivalCta = document.getElementById("festivalCta");
if (festivalCta) {
  festivalCta.addEventListener("click", function (e) {
    e.preventDefault();

    var overlay = document.getElementById("waOverlay");
    var spinner = document.getElementById("waSpinner");
    var check = document.getElementById("waCheck");
    var text = document.getElementById("waOverlayText");

    spinner.style.display = "block";
    check.classList.remove("show");
    text.textContent = "Envoi en cours...";
    overlay.classList.add("show");

    setTimeout(function () {
      spinner.style.display = "none";
      check.classList.add("show");
      text.textContent = "Redirection vers WhatsApp...";
    }, 1200);

    setTimeout(function () {
      var message =
        "DEMANDE DE CANDIDATURE — FESTIVAL PUNGUZA STRESS\n\nBonjour,\nJe souhaite soumettre ma candidature pour participer à la 2ᵉ édition du Festival Punguza Stress";
      var waUrl =
        "https://wa.me/243905479985?text=" + encodeURIComponent(message);
      window.location.href = waUrl;
      setTimeout(function () {
        overlay.classList.remove("show");
      }, 600);
    }, 2000);
  });
}


// /api/evenement.js
// Fonction serveur Vercel : génère un aperçu de lien (image + titre + description)
// propre à chaque événement, puis redirige vers la vraie page evenements.html#slug.
//
// Pour ajouter un nouvel événement plus tard : ajouter une entrée dans EVENTS
// ci-dessous, avec la MÊME clé que le slug généré côté site (voir fonction
// slugify() dans evenements.html — même titre = même slug).


const SITE = "https://ndosho-comedie-club.vercel.app";

const EVENTS = {
  "appel-a-participation-festival-punguza-stress-2eme-edition-2027": {
    title:
      "Appel à participation — Festival Punguza Stress (2ème Édition) 2027",
    description:
      "Le collectif NDOSHO COMÉDIE CLUB lance un appel à candidatures pour la 2ème édition du Festival Punguza Stress. Vidéo de prestation (5 min max) et CV artistique avant le 30 octobre 2026 à minuit.",
    image: "logo/texte.png",
  },
  "la-kaza-one-man-show-de-raphael-higgins": {
    title: "LA KAZA — One Man Show de Raphaël Higgins",
    description:
      "Un one man show de Raphaël Higgins inspiré du quotidien des habitants de Goma. Rodage le 28 août 2026 à 14h06 à l'Université des Martyrs du Congo (UNIM). Entrée gratuite.",
    image: "autres identifiant/oneman.jpg",
  },
  "invite-felicien-senzoga-unigom-zero-stress-2e-edition": {
    title: "Invité Félicien Senzoga | UNIGOM ZÉRO STRESS — 2è Édition",
    description:
      "M. l'Abbé Félicien Senzoga, invité spécial de UNIGOM ZÉRO STRESS le 7 août 2026 à l'Université de Goma (UNIGOM).",
    image: "autres identifiant/abee.jpg",
  },
  "festival-punguza-stress-2eme-edition": {
    title: "Festival Punguza Stress — 2ème Édition",
    description:
      "Le Festival Punguza Stress revient après le succès de sa première édition. Une programmation encore plus riche à venir. Kuwa tayari !",
    image: "autres identifiant/soon.png",
  },
  "une-collaboration-porteuse-d-avenir": {
    title: "Une collaboration porteuse d'avenir",
    description:
      "Rencontre avec l'organisation Ecoutemoi dans le cadre du partenariat autour du projet Festival Punguza Stress.",
    image: "recommandé/honneur.jpg",
  },
  "une-experience-enrichissante": {
    title: "Une expérience enrichissante",
    description:
      "Une belle expérience aux côtés d'autres jeunes, avec The Congo Tree, autour des questions liées à la jeunesse.",
    image: "recommandé/annonce.jpg",
  },
  "festival-punguza-stress-1ere-edition": {
    title: "Festival Punguza Stress — 1ère Édition",
    description:
      "La première édition du Festival Punguza Stress, organisée le 26 avril 2026 par le collectif Ndosho Comédie Club.",
    image: "recommandé/festival.jpg",
  },
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = (req, res) => {
  var id = req.query && req.query.id ? String(req.query.id) : "";
  var event = EVENTS[id];
  var targetUrl = event
    ? SITE + "/evenements.html#" + id
    : SITE + "/evenements.html";

  if (!event) {
    res.writeHead(302, { Location: targetUrl });
    res.end();
    return;
  }

  var imageUrl = encodeURI(SITE + "/" + event.image);
  var pageUrl = SITE + "/api/evenement?id=" + encodeURIComponent(id);

  var html =
    "<!doctype html>" +
    '<html lang="fr"><head>' +
    '<meta charset="UTF-8" />' +
    '<meta http-equiv="refresh" content="0; url=' +
    escapeHtml(targetUrl) +
    '" />' +
    "<title>" +
    escapeHtml(event.title) +
    "</title>" +
    '<meta property="og:type" content="website" />' +
    '<meta property="og:site_name" content="Ndosho Comedie Club" />' +
    '<meta property="og:title" content="' +
    escapeHtml(event.title) +
    '" />' +
    '<meta property="og:description" content="' +
    escapeHtml(event.description) +
    '" />' +
    '<meta property="og:image" content="' +
    imageUrl +
    '" />' +
    '<meta property="og:url" content="' +
    pageUrl +
    '" />' +
    '<meta name="twitter:card" content="summary_large_image" />' +
    '<meta name="twitter:title" content="' +
    escapeHtml(event.title) +
    '" />' +
    '<meta name="twitter:description" content="' +
    escapeHtml(event.description) +
    '" />' +
    '<meta name="twitter:image" content="' +
    imageUrl +
    '" />' +
    "<script>window.location.replace(" +
    JSON.stringify(targetUrl) +
    ");</script>" +
    "</head><body>" +
    '<p>Redirection vers <a href="' +
    escapeHtml(targetUrl) +
    '">' +
    escapeHtml(event.title) +
    "</a>...</p>" +
    "</body></html>";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.statusCode = 200;
  res.end(html);
};
