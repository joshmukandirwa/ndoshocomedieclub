// /api/actualite.js
// Fonction serveur Vercel : aperçu de lien (image + titre + extrait) pour une actualité,
// annonce, communiqué... partagée sur WhatsApp, Facebook, etc. Puis redirige vers
// actualites.html?id=... (qui ouvre la publication).
//
// Réglage unique : dans Vercel > Settings > Environment Variables, ajouter
//   FIREBASE_PROJECT_ID = l'identifiant du projet Firebase (même valeur que projectId
//   dans js/firebase-config.js). Voir ADMIN-SETUP.md.
//
// Lecture publique sans connexion : les règles Firestore n'autorisent que les
// publications "publie == true".

const SITE = "https://ndosho-comedie-club.vercel.app";

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function court(txt, n) {
  var t = String(txt || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "..." : t;
}
function champ(f, nom) {
  return f && f[nom] && typeof f[nom].stringValue === "string" ? f[nom].stringValue : "";
}

module.exports = async (req, res) => {
  var id = req.query && req.query.id ? String(req.query.id) : "";
  var wantImg = req.query && req.query.img;
  var cible = SITE + "/actualites.html" + (id ? "?id=" + encodeURIComponent(id) : "");
  var projet = process.env.FIREBASE_PROJECT_ID;

  function redirige() { res.writeHead(302, { Location: cible }); res.end(); }
  if (!id || !projet || !/^[\w-]{1,60}$/.test(id)) return redirige();

  var doc;
  try {
    var r = await fetch(
      "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(projet) +
        "/databases/(default)/documents/actualites/" + encodeURIComponent(id)
    );
    if (!r.ok) return redirige();
    doc = await r.json();
  } catch (e) {
    return redirige();
  }
  var f = doc.fields || {};
  if (!f.publie || f.publie.booleanValue !== true) return redirige();

  var image = champ(f, "image");

  // Sert l'image stockée dans la publication (data URL) comme vraie image
  if (wantImg) {
    var m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(image);
    if (!m) return redirige();
    res.setHeader("Content-Type", m[1]);
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.statusCode = 200;
    res.end(Buffer.from(m[2], "base64"));
    return;
  }

  var titre = court(champ(f, "titre") || "Ndosho Comédie Club", 90);
  var desc = court(champ(f, "contenu"), 160);
  var pageUrl = SITE + "/api/actualite?id=" + encodeURIComponent(id);
  var imgUrl = /^data:image\//.test(image)
    ? pageUrl + "&img=1"
    : SITE + "/images/og-image.jpg"; // pas d'image dans la publication : image du site

  var html =
    "<!doctype html><html lang=\"fr\"><head><meta charset=\"UTF-8\" />" +
    '<meta http-equiv="refresh" content="0; url=' + esc(cible) + '" />' +
    "<title>" + esc(titre) + "</title>" +
    '<meta property="og:type" content="article" />' +
    '<meta property="og:site_name" content="Ndosho Comédie Club" />' +
    '<meta property="og:title" content="' + esc(titre) + '" />' +
    '<meta property="og:description" content="' + esc(desc) + '" />' +
    '<meta property="og:image" content="' + esc(imgUrl) + '" />' +
    '<meta property="og:image:secure_url" content="' + esc(imgUrl) + '" />' +
    '<meta property="og:url" content="' + esc(pageUrl) + '" />' +
    '<meta name="twitter:card" content="summary_large_image" />' +
    '<meta name="twitter:title" content="' + esc(titre) + '" />' +
    '<meta name="twitter:description" content="' + esc(desc) + '" />' +
    '<meta name="twitter:image" content="' + esc(imgUrl) + '" />' +
    "<script>window.location.replace(" + JSON.stringify(cible) + ");</script>" +
    '</head><body><p>Redirection vers <a href="' + esc(cible) + '">' + esc(titre) + "</a>...</p></body></html>";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300");
  res.statusCode = 200;
  res.end(html);
};
