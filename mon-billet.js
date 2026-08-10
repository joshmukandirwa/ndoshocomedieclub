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
  document.title = "Billet — " + ticket.eventName + " — Ndosho Comedie Club";

  document.getElementById("tkOutEvent").textContent = "Billet";
  document.getElementById("tkOutNom").textContent = ticket.nom;
  document.getElementById("tkOutTel").textContent = ticket.tel;
  document.getElementById("tkOutLieu").textContent = ticket.eventLieu;
  document.getElementById("tkOutDate").textContent = ticket.eventDate;
  document.getElementById("tkOutMontant").textContent = ticket.montant;
  document.getElementById("tkOutId").textContent = ticket.ticketId;
  document.getElementById("tkOutIdSide").textContent = ticket.ticketId;

  var qrText =
    "NDOSHO COMEDIE CLUB — BILLET\n" +
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

  var qrImg = document.getElementById("tkQrImg");
  var qrEl = document.getElementById("tkQr");
  qrImg.onerror = function () {
    qrEl.innerHTML =
      '<p style="font-size:10px;color:#c0392b;padding:6px;max-width:100px;">QR indisponible (vérifiez votre connexion internet)</p>';
  };
  qrImg.src =
    "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=" +
    encodeURIComponent(qrText);

  document.getElementById("downloadBtn").addEventListener("click", function () {
    var ticketCard = document.getElementById("ticketCard");
    if (typeof html2canvas === "undefined") {
      alert(
        "Le téléchargement est indisponible (la librairie n'a pas pu charger). Vérifiez votre connexion internet et rechargez la page.",
      );
      return;
    }
    html2canvas(ticketCard, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
    })
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
