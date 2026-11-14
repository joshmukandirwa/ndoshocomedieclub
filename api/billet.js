// POST /api/billet — crée et signe un billet (réservé à l'admin connecté).
const T = require("./_lib/tickets");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ erreur: "Méthode non autorisée" }); }
  try {
    const admin = await T.emailAdmin(req);
    if (!admin) return res.status(401).json({ erreur: "Connexion administrateur requise" });

    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const valeur = Number(String(b.montantValeur).replace(",", "."));
    const devise = b.devise === "CDF" ? "CDF" : "USD";
    const t = {
      nom: T.nettoyer(b.nom, 80), tel: T.nettoyer(b.tel, 30), eventName: T.nettoyer(b.eventName, 100),
      eventDate: T.nettoyer(b.eventDate, 60), eventLieu: T.nettoyer(b.eventLieu, 100),
    };
    if (!t.nom || !t.tel || !t.eventName || !t.eventDate || !t.eventLieu) return res.status(400).json({ erreur: "Tous les champs sont obligatoires" });
    if (!isFinite(valeur) || valeur <= 0 || valeur > 10000000) return res.status(400).json({ erreur: "Montant invalide" });

    t.montantValeur = Math.round(valeur * 100) / 100;
    t.devise = devise;
    t.montant = String(t.montantValeur) + (devise === "USD" ? "$" : " FC");
    t.emissionDate = new Date().toLocaleDateString("fr-FR", { timeZone: "Africa/Lubumbashi" });
    t.createdAt = new Date().toISOString();

    // un identifiant déjà pris (très improbable) est retenté une fois
    for (let essai = 0; ; essai++) {
      t.ticketId = T.nouvelId();
      t.sig = T.signer(t);
      try { await T.enregistrer(admin.token, t); break; }
      catch (e) { if (e.status === 409 && essai < 2) continue; throw e; }
    }
    return res.status(200).json({ billet: t, qr: T.texteQr(t) });
  } catch (e) {
    console.error("billet:", e.message);
    const manque = /TICKET_SECRET/.test(e.message);
    const refuse = /Firestore 40[13]/.test(e.message);
    return res.status(500).json({ erreur: manque ? "La clé TICKET_SECRET n'est pas configurée sur Vercel." : refuse ? "Firestore a refusé l'écriture : publiez la nouvelle version de firestore.rules." : "Erreur serveur, réessayez." });
  }
};
