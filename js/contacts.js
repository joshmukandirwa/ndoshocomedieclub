// ============================================================
// CONFIGURATION
// ============================================================
var WHATSAPP_NUMBER = "243905479985"; // format international sans le +
var VERIF_DURATION_MS = 4000; // durée de l'animation d'envoi

var contactForm = document.getElementById("contactForm");
var ctSubmitBtn = document.getElementById("ctSubmitBtn");
var ctLoading = document.getElementById("ctLoading");
var ctError = document.getElementById("ctError");
var ctWhatsappBtn = document.getElementById("ctWhatsappBtn");

var MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function dateDuJour() {
  var d = new Date();
  return d.getDate() + " " + MOIS_FR[d.getMonth()] + " " + d.getFullYear();
}

contactForm.addEventListener("submit", function (e) {
  e.preventDefault();

  var nom = document.getElementById("ctNom").value.trim();
  var tel = document.getElementById("ctTel").value.trim();
  var email = document.getElementById("ctEmail").value.trim();
  var objetEl = document.getElementById("ctObjet");
  var objet = objetEl.value;
  var message = document.getElementById("ctMessage").value.trim();

  if (!nom || !tel || !email || !objet || !message) {
    return;
  }

  // Étape 1 : on cache le formulaire et on lance l'animation d'envoi
  contactForm.style.display = "none";
  ctLoading.classList.add("show");

  setTimeout(function () {
    // Étape 2 : l'envoi "échoue" et on propose la suite sur WhatsApp
    ctLoading.classList.remove("show");
    ctError.classList.add("show");

    var waText =
      "*NOUVEAU MESSAGE DE CONTACT*\n\n" +
      "*Nom :* " + nom + "\n" +
      "*Téléphone :* " + tel + "\n" +
      "*Email :* " + email + "\n" +
      "*Objet :* " + objet + "\n" +
      "*Message :* " + message + "\n\n" +
      "*Date :* " + dateDuJour() + "\n" +
      "*Statut :* Message reçu";

    ctWhatsappBtn.href =
      "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(waText);
  }, VERIF_DURATION_MS);
});
