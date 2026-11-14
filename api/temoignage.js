// /api/temoignage.js
// Fonction serveur Vercel : aperçu de lien (photo + nom + extrait) pour un témoignage partagé
// sur WhatsApp, Facebook, etc. Puis redirige vers temoignages.html?t=... qui ouvre le témoignage.
//
// Même réglage que /api/actualite : variable FIREBASE_PROJECT_ID dans Vercel (voir ADMIN-SETUP.md).
// Lecture publique : la collection "temoignages_publics" (approuvés, sans téléphone) est ouverte en lecture.

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
function nombre(f, nom) {
  var v = f && f[nom];
  if (!v) return 0;
  return parseInt(v.integerValue || v.doubleValue || 0, 10) || 0;
}

module.exports = async (req, res) => {
  var id = req.query && req.query.id ? String(req.query.id) : "";
  var wantImg = req.query && req.query.img;
  var cible = SITE + "/temoignages.html" + (id ? "?t=" + encodeURIComponent(id) : "");
  var projet = process.env.FIREBASE_PROJECT_ID;

  function redirige() { res.writeHead(302, { Location: cible }); res.end(); }
  if (!id || !projet || !/^[\w-]{1,60}$/.test(id)) return redirige();

  var doc;
  try {
    var r = await fetch(
      "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(projet) +
        "/databases/(default)/documents/temoignages_publics/" + encodeURIComponent(id)
    );
    if (!r.ok) return redirige();
    doc = await r.json();
  } catch (e) {
    return redirige();
  }
  var f = doc.fields || {};
  var photo = champ(f, "photo");

  // Sert la photo stockée (data URL) comme vraie image
  if (wantImg) {
    var m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(photo);
    if (!m) return redirige();
    res.setHeader("Content-Type", m[1]);
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.statusCode = 200;
    res.end(Buffer.from(m[2], "base64"));
    return;
  }

  var nom = court(champ(f, "nom") || "Un spectateur", 60);
  var note = Math.max(0, Math.min(5, nombre(f, "note")));
  var etoiles = note ? "\u2605".repeat(note) + "\u2606".repeat(5 - note) + " \u00b7 " : "";
  var titre = "Ce que " + nom + " dit du Ndosho Comédie Club";
  var desc = etoiles + "\u201c" + court(champ(f, "message"), 150) + "\u201d";
  var pageUrl = SITE + "/api/temoignage?id=" + encodeURIComponent(id);
  var avecPhoto = /^data:image\//.test(photo);
  var imgUrl = avecPhoto ? pageUrl + "&img=1" : SITE + "/images/og-image.jpg";

  var html =
    "<!doctype html><html lang=\"fr\"><head><meta charset=\"UTF-8\" />" +
    '<meta http-equiv="refresh" content="0; url=' + esc(cible) + '" />' +
    "<title>" + esc(titre) + "</title>" +
    '<meta name="description" content="' + esc(desc) + '" />' +
    '<meta property="og:type" content="article" />' +
    '<meta property="og:site_name" content="Ndosho Comédie Club" />' +
    '<meta property="og:title" content="' + esc(titre) + '" />' +
    '<meta property="og:description" content="' + esc(desc) + '" />' +
    '<meta property="og:image" content="' + esc(imgUrl) + '" />' +
    '<meta property="og:image:secure_url" content="' + esc(imgUrl) + '" />' +
    (avecPhoto
      ? '<meta property="og:image:width" content="320" /><meta property="og:image:height" content="320" />'
      : '<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />') +
    '<meta property="og:url" content="' + esc(pageUrl) + '" />' +
    '<meta name="twitter:card" content="' + (avecPhoto ? "summary" : "summary_large_image") + '" />' +
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
