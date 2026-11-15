function decodeTicketFromUrl() {
  var params = new URLSearchParams(window.location.search);
  var raw = params.get("d");
  if (!raw) return null;
  try {
    var obj = JSON.parse(decodeURIComponent(raw));
    return {
      nom: obj.n,
      tel: obj.t,
      eventName: obj.e,
      eventDate: obj.dt,
      eventLieu: obj.l,
      montant: obj.m,
      ticketId: obj.id,
      emissionDate: obj.ed,
      sig: obj.sig,
    };
  } catch (err) {
    return null;
  }
}

var billetOk = document.getElementById("billetOk");
var billetError = document.getElementById("billetError");
var ticket = decodeTicketFromUrl();

if (!ticket || !ticket.nom || !ticket.ticketId) {
  billetOk.style.display = "none";
  billetError.classList.add("show");
} else {
  document.title = "Billet — " + ticket.eventName + " — Ndosho Comédie Club";

  var ticketCard = document.getElementById("ticketCard");
  window.BilletUI.remplir(ticketCard, ticket);

  var qrText =
    "NDOSHO COMÉDIE CLUB — BILLET\n" +
    "ID: " +
    ticket.ticketId +
    "\n" +
    "Nom: " +
    ticket.nom +
    "\n" +
    "Téléphone: " +
    ticket.tel +
    "\n" +
    "Événement: " +
    ticket.eventName +
    "\n" +
    "Date: " +
    ticket.eventDate +
    "\n" +
    "Lieu: " +
    ticket.eventLieu +
    "\n" +
    "Montant payé: " +
    ticket.montant +
    "\n" +
    "Émis le: " +
    ticket.emissionDate +
    "\n" +
    "SIG: " +
    (ticket.sig || "") +
    "\n" +
    "Ce billet est unique et non transférable.";

  window.BilletUI.qr(ticketCard, qrText, function () {
    document.getElementById("tkQr").innerHTML =
      '<p style="font-size:10px;color:#c0392b;padding:6px;max-width:100px;line-height:1.2;">QR indisponible (vérifiez votre connexion internet)</p>';
  });

  // Un lien fabriqué à la main ne doit pas afficher un faux billet : la signature est contrôlée par le serveur.
  // (Si le contrôle est impossible, par exemple hors connexion, le billet reste affiché.)
  fetch("/api/verifier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texte: qrText }) })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (j && (j.statut === "invalide" || j.statut === "inconnu" || j.statut === "pas_un_billet")) {
        billetOk.style.display = "none"; billetError.classList.add("show");
      }
    })
    .catch(function () {});

  document.getElementById("downloadBtn").addEventListener("click", function () {
    if (typeof html2canvas === "undefined") {
      alert(
        "Le téléchargement est indisponible (la librairie n'a pas pu charger). Vérifiez votre connexion internet et rechargez la page.",
      );
      return;
    }
    window.BilletUI.versCanvas(ticketCard)
      .then(function (canvas) {
        try {
          var link = document.createElement("a");
          link.download = "billet-" + ticket.ticketId + ".png";
          link.href = canvas.toDataURL("image/png");
          link.click();
        } catch (taintErr) {
          console.error("Erreur export PNG (image bloquée) :", taintErr);
          alert(
            "Le téléchargement a échoué à cause du QR code (restriction du navigateur). Faites une capture d'écran du billet en attendant.",
          );
        }
      })
      .catch(function (err) {
        console.error("Erreur téléchargement :", err);
        alert(
          "Le téléchargement a échoué. Réessayez, ou faites une capture d'écran du billet.",
        );
      });
  });
}
