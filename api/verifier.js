// POST /api/verifier — contrôle un QR code (lecture seule, ne marque rien).
const T = require("./_lib/tickets");
const S = require("./_lib/suivi");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ erreur: "Méthode non autorisée" }); }
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const d = T.lireQr(b.texte);
    if (!d.ticketId || !d.nom || !d.sig) return res.status(200).json({ statut: "pas_un_billet" });
    const billet = { ticketId: d.ticketId, nom: d.nom, eventName: d.eventName, eventDate: d.eventDate, eventLieu: d.eventLieu, montant: d.montant };
    const s = T.signatureValide(d);
    if (!s) return res.status(200).json({ statut: "invalide", billet: billet });
    // anciens billets, ou suivi non configuré : signature seule
    if (s === "ancien" || !S.actif()) return res.status(200).json({ statut: "valide", suivi: false, ancien: s === "ancien", billet: billet });
    const doc = await S.lire(d.ticketId);
    if (!doc || doc.sig !== String(d.sig).toUpperCase()) return res.status(200).json({ statut: "inconnu", billet: billet });
    return res.status(200).json({ statut: "valide", suivi: true, deja: doc.scanneAt ? S.quand(doc.scanneAt) : null, billet: billet });
  } catch (e) {
    console.error("verifier:", e.message);
    return res.status(500).json({ erreur: "Erreur de vérification" });
  }
};
