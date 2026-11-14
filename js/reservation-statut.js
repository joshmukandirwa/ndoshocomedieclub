// ============================================================
// RÉSERVATIONS : interrupteur unique pour tout le site.
//
//   OUVERT = false  -> « Réservation bientôt disponible » partout (boutons grisés,
//                      page réservation remplacée par un message, envoi bloqué).
//   OUVERT = true   -> tout redevient normal (boutons actifs, formulaire visible).
//
// Le jour de l'ouverture : mettre OUVERT à true (ou renseigner OUVERTURE_ISO ci-dessous
// pour une ouverture automatique à une date précise, ex. "2026-12-01T08:00:00+02:00").
// ============================================================
(function () {
  var OUVERT = false;
  var OUVERTURE_ISO = "";

  if (OUVERTURE_ISO && Date.now() >= new Date(OUVERTURE_ISO).getTime()) OUVERT = true;
  window.NDOSHO_RESERVATION = { ouverte: OUVERT };
  if (OUVERT) return;

  var LIBELLE = "Réservation bientôt disponible";
  var INFO = "Les réservations ne sont pas encore ouvertes. On vous prévient dès que c'est possible.";
  var FB = "https://www.facebook.com/profile.php?id=61591598038843";

  function griser(a) {
    if (a.dataset.resaGrise) return;
    a.dataset.resaGrise = "1";
    a.removeAttribute("href"); a.removeAttribute("target");
    a.classList.add("btn-indispo");
    a.setAttribute("aria-disabled", "true"); a.setAttribute("role", "button"); a.tabIndex = -1;
    a.title = INFO;
    a.textContent = LIBELLE;
    a.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); });
  }
  function balayer(racine) {
    if (!racine.querySelectorAll) return;
    var liens = racine.querySelectorAll('a[href$="reservation.html"]');
    for (var i = 0; i < liens.length; i++) griser(liens[i]);
  }

  function pageReservation() {
    var form = document.getElementById("resaForm");
    if (!form) return;
    var h1 = document.querySelector(".reserv-hero h1");
    if (h1) h1.textContent = "Réservations bientôt ouvertes";
    var label = document.querySelector(".reserv-hero .label-orange");
    if (label) label.textContent = "Billetterie";
    var f = document.querySelector(".reserv-form-section"), p = document.querySelector(".pay-section");
    if (f) f.hidden = true;
    if (p) p.hidden = true;
    var sec = document.createElement("section");
    sec.className = "resa-bientot";
    sec.innerHTML =
      '<div class="resa-bientot-box">' +
      "<h2>On y travaille !</h2>" +
      "<p>La billetterie du Festival Punguza Stress n'est pas encore ouverte. Dès qu'elle l'est, vous pourrez réserver votre place ici, en quelques secondes.</p>" +
      "<p>Pour être prévenu en premier, suivez la page du festival.</p>" +
      '<a class="btn-orange" href="' + FB + '" target="_blank" rel="noopener">Suivre la page Punguza Stress</a>' +
      '<a class="btn-outline-full" href="evenements.html">Voir l\'événement</a>' +
      "</div>";
    (f || p).parentNode.insertBefore(sec, f || p);
  }

  function noteFestival() {
    var actions = document.querySelector(".featured-actions");
    if (!actions || actions.parentNode.querySelector(".featured-resa-note")) return;
    var n = document.createElement("p");
    n.className = "featured-resa-note";
    n.textContent = "Les réservations ouvrent bientôt. On vous prévient ici et sur la page du festival.";
    actions.parentNode.insertBefore(n, actions);
  }

  function init() {
    balayer(document);
    pageReservation();
    noteFestival();
    // cartes créées plus tard (événements chargés depuis la base)
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.matches && n.matches('a[href$="reservation.html"]')) griser(n); balayer(n); } }); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
