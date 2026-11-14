// /api/evenement.js
// Fonction serveur Vercel : génère un aperçu de lien (image + titre + description)
// propre à chaque événement, puis redirige vers la vraie page evenements.html#slug.
//
// Pour ajouter un nouvel événement plus tard : ajouter une entrée dans EVENTS
// ci-dessous, avec la MÊME clé que le slug généré côté site (voir fonction
// slugify() dans evenements.html — même titre = même slug).

const SITE = "https://ndosho-comedie-club.vercel.app";

const EVENTS = {
  "festival-punguza-stress-2e-edition": {
    title: "Festival Punguza Stress — 2e édition",
    description:
      "Rendez-vous le dimanche 24 janvier 2027 à Goma pour la 2e édition du Festival Punguza Stress. Le lieu reste un secret, il sera bientôt dévoilé. Haiko ata mbali !",
    image: "images/punguza-2027-og.jpg",
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
    '<meta property="og:site_name" content="Ndosho Comédie Club" />' +
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
    '<meta property="og:image:alt" content="' +
    escapeHtml(event.title) +
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
