// ============================================================
// CONFIGURATION
// ============================================================
var WHATSAPP_NUMBER = "243987255741"; // format international sans le +
var VERIF_DURATION_MS = 4000; // durée de l'animation de vérification

var reservForm = document.getElementById("reservForm");
var resSubmitBtn = document.getElementById("resSubmitBtn");
var resLoading = document.getElementById("resLoading");
var resError = document.getElementById("resError");
var resWhatsappBtn = document.getElementById("resWhatsappBtn");

reservForm.addEventListener("submit", function (e) {
  e.preventDefault();

  var nom = document.getElementById("resNom").value.trim();
  var tel = document.getElementById("resTel").value.trim();
  var eventSelectEl = document.getElementById("resEvent");
  var eventText = eventSelectEl.options[eventSelectEl.selectedIndex]
    ? eventSelectEl.options[eventSelectEl.selectedIndex].text
    : "";

  if (!nom || !tel || !eventSelectEl.value) {
    return;
  }

  // Le texte de l'option est du type "Nom de l'événement — Date"
  var eventParts = eventText.split("—");
  var evenement = eventParts[0] ? eventParts[0].trim() : eventText.trim();
  var eventDate = eventParts[1] ? eventParts[1].trim() : "";

  // Étape 1 : on cache le formulaire et on lance l'animation de vérification
  reservForm.style.display = "none";
  resLoading.classList.add("show");

  setTimeout(function () {
    // Étape 2 : la vérification "échoue" et on propose la suite sur WhatsApp
    resLoading.classList.remove("show");
    resError.classList.add("show");

    var waText =
      "*DEMANDE DE RÉSERVATION*\n" +
      "*Client :* " + nom + "\n" +
      "*Téléphone :* " + tel + "\n" +
      "*Événement :* " + evenement + "\n" +
      "*Date :* " + eventDate + "\n" +
      "*Type de réservation :* Gratuite\n" +
      "*Statut :* Demande reçue";

    resWhatsappBtn.href =
      "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(waText);
  }, VERIF_DURATION_MS);
});

