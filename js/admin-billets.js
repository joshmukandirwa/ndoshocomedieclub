// ============================================================
// ACCÈS ADMIN — protection simple côté client (pas une vraie
// sécurité : n'importe qui peut lire ce mot de passe dans le
// code source). Change-le régulièrement et évite d'y mettre
// des données sensibles.
// ============================================================
var ADMIN_PASSWORD = "ndosho2026"; // ← à changer

var adminGate = document.getElementById("adminGate");
var adminPanel = document.getElementById("adminPanel");
var adminPass = document.getElementById("adminPass");
var adminError = document.getElementById("adminError");
var adminUnlockBtn = document.getElementById("adminUnlockBtn");

function unlock() {
  if (adminPass.value === ADMIN_PASSWORD) {
    sessionStorage.setItem("ndosho_admin_ok", "1");
    adminGate.style.display = "none";
    adminPanel.classList.add("show");
  } else {
    adminError.classList.add("show");
  }
}

adminUnlockBtn.addEventListener("click", unlock);
adminPass.addEventListener("keydown", function (e) {
  if (e.key === "Enter") unlock();
});

if (sessionStorage.getItem("ndosho_admin_ok") === "1") {
  adminGate.style.display = "none";
  adminPanel.classList.add("show");
}

// ============================================================
// SIGNATURE DES BILLETS — permet à verifier-billets.html de
// savoir si un QR code a bien été généré par nous (et pas
// fabriqué à la main). ATTENTION : TICKET_SECRET doit être
// EXACTEMENT identique ici et dans verifier-billets.html,
// sinon tous les billets seront signalés comme faux.
// ============================================================
var TICKET_SECRET = "NDOSHO-2026-CLE-SECRETE-BILLETS"; // ← à changer, et à reporter dans verifier-billets.html

async function computeSignature(t) {
  var base = [
    t.ticketId,
    t.nom,
    t.tel,
    t.eventName,
    t.eventDate,
    t.eventLieu,
    t.montant,
    t.emissionDate,
    TICKET_SECRET,
  ].join("|");
  var enc = new TextEncoder().encode(base);
  var hashBuf = await crypto.subtle.digest("SHA-256", enc);
  var hex = Array.from(new Uint8Array(hashBuf))
    .map(function (b) {
      return b.toString(16).padStart(2, "0");
    })
    .join("");
  return hex.slice(0, 24).toUpperCase();
}

// ============================================================
// GÉNÉRATION DU BILLET
// ============================================================
var ticketForm = document.getElementById("ticketForm");
var ticketCard = document.getElementById("ticketCard");
var ticketPlaceholder = document.getElementById("ticketPlaceholder");
var ticketActions = document.getElementById("ticketActions");
var currentTicket = null;

function makeTicketId() {
  var part1 = Date.now().toString(36).toUpperCase().slice(-5);
  var part2 = Math.random().toString(36).toUpperCase().slice(2, 6);
  return "NDC-" + part1 + part2;
}

function makeTicketLink(t) {
  // Le billet est encodé dans l'URL (clés courtes pour rester léger) —
  // aucune base de données requise. Voir mon-billet.html pour le décodage.
  var payload = {
    n: t.nom,
    t: t.tel,
    e: t.eventName,
    dt: t.eventDate,
    l: t.eventLieu,
    m: t.montant,
    id: t.ticketId,
    ed: t.emissionDate,
    sig: t.sig,
  };
  var encoded = encodeURIComponent(JSON.stringify(payload));
  var base = window.location.href.replace(/admin-billets\.html.*$/, "");
  return base + "mon-billet.html?d=" + encoded;
}

function formatPhoneForWhatsapp(raw) {
  var digits = raw.replace(/[^0-9]/g, "");
  if (digits.indexOf("243") === 0) return digits;
  if (digits.charAt(0) === "0") return "243" + digits.slice(1);
  return "243" + digits;
}

ticketForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  var nom = document.getElementById("tkNom").value.trim();
  var tel = document.getElementById("tkTel").value.trim();
  var eventRaw = document.getElementById("tkEvent").value;
  var montant = document.getElementById("tkMontant").value.trim();

  if (!nom || !tel || !eventRaw || !montant) return;

  var parts = eventRaw.split("|");
  var eventName = parts[0];
  var eventDate = parts[1];
  var eventLieu = parts[2];
  var ticketId = makeTicketId();
  var emissionDate = new Date().toLocaleDateString("fr-FR");

  currentTicket = {
    nom: nom,
    tel: tel,
    eventName: eventName,
    eventDate: eventDate,
    eventLieu: eventLieu,
    montant: montant,
    ticketId: ticketId,
    emissionDate: emissionDate,
  };
  currentTicket.sig = await computeSignature(currentTicket);
  currentTicket.link = makeTicketLink(currentTicket);

  document.getElementById("tkOutEvent").textContent = "Billet";
  document.getElementById("tkOutNom").textContent = nom;
  document.getElementById("tkOutTel").textContent = tel;
  document.getElementById("tkOutLieu").textContent = eventLieu;
  document.getElementById("tkOutDate").textContent = eventDate;
  document.getElementById("tkOutMontant").textContent = montant;
  document.getElementById("tkOutId").textContent = ticketId;
  document.getElementById("tkOutIdSide").textContent = ticketId;

  var qrText =
    "NDOSHO COMÉDIE CLUB — BILLET\n" +
    "ID: " +
    ticketId +
    "\n" +
    "Nom: " +
    nom +
    "\n" +
    "Téléphone: " +
    tel +
    "\n" +
    "Événement: " +
    eventName +
    "\n" +
    "Date: " +
    eventDate +
    "\n" +
    "Lieu: " +
    eventLieu +
    "\n" +
    "Montant payé: " +
    montant +
    "\n" +
    "Émis le: " +
    emissionDate +
    "\n" +
    "SIG: " +
    currentTicket.sig +
    "\n" +
    "Ce billet est unique et non transférable.";

  // QR code généré via un service en ligne (image directe, pas de
  // librairie JS à charger — plus fiable).
  var qrImg = document.getElementById("tkQrImg");
  var qrEl = document.getElementById("tkQr");
  var qrApiUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=" +
    encodeURIComponent(qrText);

  qrImg.onerror = function () {
    qrEl.innerHTML =
      '<p style="font-size:10px;color:#c0392b;padding:6px;max-width:100px;">QR indisponible (vérifie ta connexion internet)</p>';
  };
  qrImg.src = qrApiUrl;

  ticketPlaceholder.style.display = "none";
  ticketCard.classList.add("show");
  ticketActions.style.display = "flex";
});

// ---------- Téléchargement PNG ----------
document.getElementById("downloadBtn").addEventListener("click", function () {
  if (!currentTicket) return;
  if (typeof html2canvas === "undefined") {
    alert(
      "Le téléchargement est indisponible (la librairie n'a pas pu charger). Vérifie ta connexion internet et recharge la page.",
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
        link.download = "billet-" + currentTicket.ticketId + ".png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (taintErr) {
        console.error("Erreur export PNG (image bloquée) :", taintErr);
        alert(
          "Le téléchargement a échoué à cause du QR code (restriction du navigateur). Héberge le site en ligne (Vercel) pour que ça fonctionne, ou fais une capture d'écran du billet en attendant.",
        );
      }
    })
    .catch(function (err) {
      console.error("Erreur téléchargement :", err);
      alert(
        "Le téléchargement a échoué. Réessaie, ou fais une capture d'écran du billet.",
      );
    });
});

// ---------- Copier le lien ----------
document.getElementById("copyLinkBtn").addEventListener("click", function () {
  if (!currentTicket) return;
  navigator.clipboard
    .writeText(currentTicket.link)
    .then(function () {
      var btn = document.getElementById("copyLinkBtn");
      var original = btn.textContent;
      btn.textContent = "Lien copié !";
      setTimeout(function () {
        btn.textContent = original;
      }, 1500);
    })
    .catch(function () {
      prompt("Copiez le lien manuellement :", currentTicket.link);
    });
});

// ---------- Envoi WhatsApp ----------
document.getElementById("waSendBtn").addEventListener("click", function () {
  if (!currentTicket) return;
  var waNumber = formatPhoneForWhatsapp(currentTicket.tel);
  var msg =
    "Bonjour " +
    currentTicket.nom +
    ', voici votre billet pour "' +
    currentTicket.eventName +
    '" (' +
    currentTicket.eventDate +
    "). Merci de votre confiance !\n\n" +
    "ID billet : " +
    currentTicket.ticketId +
    "\n\n" +
    "Cliquez ici pour voir et télécharger votre billet à tout moment :\n" +
    currentTicket.link;
  window.open(
    "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(msg),
    "_blank",
  );
});
