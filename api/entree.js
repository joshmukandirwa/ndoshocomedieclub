// POST /api/entree — enregistre l'entrée d'un billet (réservé au personnel : code de contrôle).
const T = require("./_lib/tickets");
const S = require("./_lib/suivi");
const pause = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

// Limite d'essais ratés par adresse IP (en mémoire : protège surtout contre les essais en rafale)
const ESSAIS = {};
const FENETRE = 10 * 60 * 1000, MAX = 8;
function trop(ip) { const l = (ESSAIS[ip] || []).filter(function (t) { return Date.now() - t < FENETRE; }); ESSAIS[ip] = l; return l.length >= MAX; }
function rate(ip) { (ESSAIS[ip] = ESSAIS[ip] || []).push(Date.now()); }

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ erreur: "Méthode non autorisée" }); }
  try {
    if (!S.actif()) return res.status(501).json({ erreur: "Le suivi des entrées n'est pas configuré sur Vercel." });
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const ip = String((req.headers["x-forwarded-for"] || "").split(",")[0] || (req.socket && req.socket.remoteAddress) || "?").trim();
    if (trop(ip)) return res.status(429).json({ erreur: "Trop d'essais. Réessayez dans quelques minutes." });
    if (!S.codeOk(b.code)) { rate(ip); await pause(800); return res.status(403).json({ erreur: "Code de contrôle incorrect." }); }
    const d = T.lireQr(b.texte);
    if (!d.ticketId || T.signatureValide(d) !== "ok") return res.status(400).json({ erreur: "Billet invalide." });

    for (let essai = 0; essai < 2; essai++) {
      const doc = await S.lire(d.ticketId);
      if (!doc || doc.sig !== String(d.sig).toUpperCase()) return res.status(404).json({ statut: "inconnu" });
      if (doc.scanneAt) return res.status(409).json({ statut: "deja", quand: S.quand(doc.scanneAt) });
      const iso = new Date().toISOString();
      if (await S.marquer(d.ticketId, doc.updateTime, iso)) return res.status(200).json({ statut: "ok", quand: S.quand(iso) });
    }
    return res.status(409).json({ statut: "deja", quand: "à l'instant" });
  } catch (e) {
    console.error("entree:", e.message);
    return res.status(500).json({ erreur: "Erreur serveur, réessayez." });
  }
};
