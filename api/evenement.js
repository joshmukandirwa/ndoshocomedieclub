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

function buildImageUrl(imagePath) {
  var encodedPath = imagePath.split("/").map(encodeURIComponent).join("/");
  return SITE + "/" + encodedPath;
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

  var imageUrl = buildImageUrl(event.image);
  var imageType = /\.png$/i.test(event.image) ? "image/png" : "image/jpeg";
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
    '<meta property="og:image:secure_url" content="' +
    imageUrl +
    '" />' +
    '<meta property="og:image:type" content="' +
    imageType +
    '" />' +
    '<meta property="og:image:width" content="1200" />' +
    '<meta property="og:image:height" content="630" />' +
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
