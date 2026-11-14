// Formulaire "Laisser un témoignage" : envoi vers l'admin (statut "en attente").
// Le témoignage n'apparaît sur le site qu'après validation par l'admin.
import { isConfigured, db, collection, addDoc, serverTimestamp } from "./firebase.js";
import { resizeImage, cooldownOk } from "./utils.js";

var WHATSAPP_NUMBER = "243905479985";
var form = document.getElementById("avisForm");
var loading = document.getElementById("avisLoading");
var errorBox = document.getElementById("avisError");
var okBox = document.getElementById("avisSuccess");
var waBtn = document.getElementById("avisWhatsappBtn");
var photoInput = document.getElementById("avisPhoto");
var photoPreview = document.getElementById("avisPhotoPreview");
var photoData = "";

photoInput.addEventListener("change", async function () {
  photoData = "";
  photoPreview.hidden = true;
  var f = photoInput.files && photoInput.files[0];
  if (!f) return;
  try {
    photoData = await resizeImage(f, 320, 0.75, true); // carré 320 px, léger
    photoPreview.src = photoData;
    photoPreview.hidden = false;
  } catch (e) {
    photoInput.value = "";
    alert(e.message || "Image non valide");
  }
});

function fallbackWhatsApp(nom, tel, noteText, message) {
  var d = new Date();
  var txt = "*NOUVEAU TÉMOIGNAGE*\n\n*Nom :* " + nom + "\n*Téléphone :* " + tel +
    "\n*Témoignage :* " + message + "\n\n*Date :* " + d.toLocaleDateString("fr-FR") + "\n*Note :* " + noteText;
  waBtn.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(txt);
  errorBox.classList.add("show");
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  var nom = document.getElementById("avisNom").value.trim();
  var tel = document.getElementById("avisTel").value.trim();
  var noteEl = document.getElementById("avisNote");
  var note = parseInt(noteEl.value, 10);
  var noteText = noteEl.options[noteEl.selectedIndex] ? noteEl.options[noteEl.selectedIndex].text : "";
  var message = document.getElementById("avisMessage").value.trim();
  if (!nom || !tel || !note || !message) return;

  // Piège anti-robots : champ caché rempli = on fait semblant que tout va bien
  if (document.getElementById("avisWebsite").value) { form.style.display = "none"; okBox.classList.add("show"); return; }
  if (!cooldownOk("ndosho_last_avis", 60000)) { alert("Merci de patienter une minute avant d'envoyer un nouveau témoignage."); return; }

  form.style.display = "none";
  loading.classList.add("show");

  if (!isConfigured) {
    setTimeout(function () { loading.classList.remove("show"); fallbackWhatsApp(nom, tel, noteText, message); }, 1200);
    return;
  }
  try {
    await addDoc(collection(db, "temoignages"), {
      nom: nom.slice(0, 80), tel: tel.slice(0, 30), note: note,
      message: message.slice(0, 1200), photo: photoData,
      statut: "en_attente", createdAt: serverTimestamp(),
    });
    loading.classList.remove("show");
    okBox.classList.add("show");
  } catch (err) {
    console.warn("Envoi témoignage échoué", err);
    loading.classList.remove("show");
    fallbackWhatsApp(nom, tel, noteText, message);
  }
});
