// Formulaire de contact : le message arrive dans l'espace admin (onglet Messages).
import { isConfigured, db, collection, addDoc, serverTimestamp } from "./firebase.js";
import { cooldownOk } from "./utils.js";

var WHATSAPP_NUMBER = "243905479985";
var form = document.getElementById("contactForm");
var loading = document.getElementById("ctLoading");
var errorBox = document.getElementById("ctError");
var okBox = document.getElementById("ctSuccess");
var waBtn = document.getElementById("ctWhatsappBtn");

function fallbackWhatsApp(v) {
  var txt = "*NOUVEAU MESSAGE DE CONTACT*\n\n*Nom :* " + v.nom + "\n*Téléphone :* " + v.tel +
    "\n*Email :* " + v.email + "\n*Objet :* " + v.objet + "\n*Message :* " + v.message +
    "\n\n*Date :* " + new Date().toLocaleDateString("fr-FR");
  waBtn.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(txt);
  errorBox.classList.add("show");
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  var v = {
    nom: document.getElementById("ctNom").value.trim(),
    tel: document.getElementById("ctTel").value.trim(),
    email: document.getElementById("ctEmail").value.trim(),
    objet: document.getElementById("ctObjet").value,
    message: document.getElementById("ctMessage").value.trim(),
  };
  if (!v.nom || !v.tel || !v.email || !v.objet || !v.message) return;

  if (document.getElementById("ctWebsite").value) { form.style.display = "none"; okBox.classList.add("show"); return; }
  if (!cooldownOk("ndosho_last_contact", 30000)) { alert("Merci de patienter quelques secondes avant un nouvel envoi."); return; }

  form.style.display = "none";
  loading.classList.add("show");

  if (!isConfigured) {
    setTimeout(function () { loading.classList.remove("show"); fallbackWhatsApp(v); }, 1200);
    return;
  }
  try {
    await addDoc(collection(db, "messages"), {
      nom: v.nom.slice(0, 80), tel: v.tel.slice(0, 30), email: v.email.slice(0, 120),
      objet: v.objet.slice(0, 80), message: v.message.slice(0, 3000),
      lu: false, createdAt: serverTimestamp(),
    });
    loading.classList.remove("show");
    okBox.classList.add("show");
  } catch (err) {
    console.warn("Envoi message échoué", err);
    loading.classList.remove("show");
    fallbackWhatsApp(v);
  }
});
