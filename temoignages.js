// ============================================================
// CONFIGURATION
// ============================================================
var WHATSAPP_NUMBER = "243987255741"; // format international sans le +
var VERIF_DURATION_MS = 4000; // durée de l'animation d'envoi

var avisForm = document.getElementById("avisForm");
var avisLoading = document.getElementById("avisLoading");
var avisError = document.getElementById("avisError");
var avisWhatsappBtn = document.getElementById("avisWhatsappBtn");

var MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function dateDuJour() {
  var d = new Date();
  return d.getDate() + " " + MOIS_FR[d.getMonth()] + " " + d.getFullYear();
}

avisForm.addEventListener("submit", function (e) {
  e.preventDefault();

  var nom = document.getElementById("avisNom").value.trim();
  var tel = document.getElementById("avisTel").value.trim();
  var noteEl = document.getElementById("avisNote");
  var noteText = noteEl.options[noteEl.selectedIndex]
    ? noteEl.options[noteEl.selectedIndex].text
    : "";
  var message = document.getElementById("avisMessage").value.trim();

  if (!nom || !tel || !noteEl.value || !message) {
    return;
  }

  // Étape 1 : on cache le formulaire et on lance l'animation d'envoi
  avisForm.style.display = "none";
  avisLoading.classList.add("show");

  setTimeout(function () {
    // Étape 2 : l'envoi "échoue" et on propose la suite sur WhatsApp
    avisLoading.classList.remove("show");
    avisError.classList.add("show");

    var waText =
      "*NOUVEAU TÉMOIGNAGE*\n\n" +
      "*Nom :* " + nom + "\n" +
      "*Téléphone :* " + tel + "\n" +
      "*Témoignage :* " + message + "\n\n" +
      "*Date :* " + dateDuJour() + "\n" +
      "*Note :* " + noteText;

    avisWhatsappBtn.href =
      "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(waText);
  }, VERIF_DURATION_MS);
});
