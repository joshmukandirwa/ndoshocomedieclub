// Réservation Punguza Stress 2e édition :
// 1) la demande est enregistrée dans Firestore (admin → Réservations → Demandes en attente)
// 2) le client est redirigé vers WhatsApp avec sa demande ; si Firebase est indisponible,
//    la redirection WhatsApp marche quand même.
import { isConfigured, db, collection, addDoc, serverTimestamp } from "./firebase.js";
import { cooldownOk } from "./utils.js";

var WHATSAPP_NUMBER = "243905479985";
var EVENEMENT = "Festival Punguza Stress — 2e édition";
var DATE_EVT = "dimanche 24 janvier 2027";

var form = document.getElementById("resaForm");
var errBox = document.getElementById("rsError");
var okBox = document.getElementById("rsOk");
var waLink = document.getElementById("rsWaLink");
var submit = document.getElementById("rsSubmit");

function lienWhatsApp(v) {
  var txt = "*DEMANDE DE RÉSERVATION*\n\n*Événement :* " + EVENEMENT + " (" + DATE_EVT + ", Goma)" +
    "\n*Nom :* " + v.nom + "\n*Téléphone :* " + v.tel + "\n*Catégorie :* " + v.categorie +
    "\n\nBonjour, je voudrais réserver ma place. Comment procéder au paiement ?";
  return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(txt);
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  // Réservations pas encore ouvertes (interrupteur dans js/reservation-statut.js)
  if (window.NDOSHO_RESERVATION && !window.NDOSHO_RESERVATION.ouverte) return;
  errBox.hidden = true;
  var cat = form.querySelector('input[name="rsCat"]:checked');
  var v = {
    nom: document.getElementById("rsNom").value.trim(),
    tel: document.getElementById("rsTel").value.trim(),
    categorie: cat ? cat.value : "Standard",
  };
  if (v.nom.length < 2 || v.tel.length < 5) {
    errBox.textContent = "Merci d'indiquer votre nom et un numéro de téléphone valide.";
    errBox.hidden = false; return;
  }
  if (document.getElementById("rsWebsite").value) { form.hidden = true; okBox.hidden = false; return; } // piège anti-spam
  if (!cooldownOk("ndosho_last_resa", 20000)) {
    errBox.textContent = "Merci de patienter quelques secondes avant un nouvel envoi.";
    errBox.hidden = false; return;
  }

  submit.disabled = true; submit.textContent = "Envoi en cours…";
  var url = lienWhatsApp(v);
  if (isConfigured) {
    try {
      await addDoc(collection(db, "reservations"), {
        nom: v.nom.slice(0, 80), tel: v.tel.slice(0, 30), categorie: v.categorie,
        statut: "en_attente", createdAt: serverTimestamp(),
      });
    } catch (err) { console.warn("Demande non enregistrée (WhatsApp envoyé quand même)", err); }
  }
  waLink.href = url;
  form.hidden = true; okBox.hidden = false;
  window.location.href = url;
});

// Carousel des moyens de paiement : même défilement continu que les humoristes et la galerie
// (la fonction vient de js/index.js, qui la prépare une fois la page chargée)
(function () {
  var slider = document.getElementById("paySlider");
  if (!slider) return;
  function lancer() { if (window.ndoshoAutoLoop) window.ndoshoAutoLoop(slider, 0.5); }
  if (window.ndoshoAutoLoop) lancer(); else window.addEventListener("DOMContentLoaded", lancer);
})();
