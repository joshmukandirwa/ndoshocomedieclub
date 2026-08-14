// ---------- Filtres d'événements ----------
var filtersWrap = document.getElementById("evntFilters");
var cards = document.querySelectorAll("#evntGrid .evnt-card");
var emptyMsg = document.getElementById("evntEmpty");

if (filtersWrap) {
  filtersWrap.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter-btn");
    if (!btn) return;

    var current = filtersWrap.querySelector(".filter-btn.active");
    if (current) current.classList.remove("active");
    btn.classList.add("active");

    var filter = btn.getAttribute("data-filter");
    var visibleCount = 0;

    cards.forEach(function (card) {
      var match =
        filter === "tous" || card.getAttribute("data-category") === filter;
      card.style.display = match ? "" : "none";
      if (match) visibleCount++;
    });

    emptyMsg.classList.toggle("show", visibleCount === 0);
  });
}

// ---------- Newsletter événements ----------
var evntSubscribeForm = document.getElementById("evntSubscribeForm");
if (evntSubscribeForm) {
  evntSubscribeForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var input = evntSubscribeForm.querySelector('input[type="email"]');
    var email = input.value.trim();
    if (!email) return;

    var existingMsg = evntSubscribeForm.querySelector(".form-msg");
    if (existingMsg) existingMsg.remove();

    var msg = document.createElement("p");
    msg.className = "form-msg";
    msg.textContent = "Merci ! On vous tient au courant à " + email;
    evntSubscribeForm.appendChild(msg);

    evntSubscribeForm.reset();
  });
}

// ---------- Lien copiable par événement ----------
function slugify(str) {
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fallbackCopy(text) {
  var ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch (err) {}
  document.body.removeChild(ta);
}

function showCopyToast() {
  var old = document.querySelector(".copy-toast");
  if (old) old.remove();
  var toast = document.createElement("div");
  toast.className = "copy-toast";
  toast.textContent = "Lien copié !";
  document.body.appendChild(toast);
  requestAnimationFrame(function () {
    toast.classList.add("show");
  });
  setTimeout(function () {
    toast.classList.remove("show");
    setTimeout(function () {
      toast.remove();
    }, 300);
  }, 1800);
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(showCopyToast)
      .catch(function () {
        fallbackCopy(text);
        showCopyToast();
      });
  } else {
    fallbackCopy(text);
    showCopyToast();
  }
}

var shareableCards = document.querySelectorAll(".evnt-card, .featured-card");
shareableCards.forEach(function (card) {
  var titleEl = card.querySelector("h3");
  if (!titleEl) return;

  var slug = slugify(titleEl.textContent);
  if (!slug) return;
  card.id = slug;

  var shareBtn = document.createElement("button");
  shareBtn.type = "button";
  shareBtn.className = "evnt-share-btn";
  shareBtn.title = "Copier le lien de cet événement";
  shareBtn.setAttribute("aria-label", "Copier le lien de cet événement");
  shareBtn.innerHTML = "&#128279;";
  shareBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    var url = window.location.origin + window.location.pathname + "#" + slug;
    copyToClipboard(url);
  });
  card.appendChild(shareBtn);
});

// Si on arrive via un lien #slug, on scrolle vers la carte et on la met en évidence
window.addEventListener("load", function () {
  if (window.location.hash) {
    var target = document.querySelector(window.location.hash);
    if (target) {
      setTimeout(function () {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("evnt-highlight");
        setTimeout(function () {
          target.classList.remove("evnt-highlight");
        }, 2200);
      }, 300);
    }
  }
});

// ---------- Animation d'envoi + redirection WhatsApp ----------
var festivalCta = document.getElementById("festivalCta");
if (festivalCta) {
  festivalCta.addEventListener("click", function (e) {
    e.preventDefault();

    var overlay = document.getElementById("waOverlay");
    var spinner = document.getElementById("waSpinner");
    var check = document.getElementById("waCheck");
    var text = document.getElementById("waOverlayText");

    spinner.style.display = "block";
    check.classList.remove("show");
    text.textContent = "Envoi en cours...";
    overlay.classList.add("show");

    setTimeout(function () {
      spinner.style.display = "none";
      check.classList.add("show");
      text.textContent = "Redirection vers WhatsApp...";
    }, 1200);

    setTimeout(function () {
      var message =
        "*DEMANDE DE CANDIDATURE — FESTIVAL PUNGUZA STRESS*\n\nBonjour,\nJe souhaite soumettre ma candidature pour participer à la 2ème édition du Festival Punguza Stress";
      var waUrl =
        "https://wa.me/243905479985?text=" + encodeURIComponent(message);
      window.location.href = waUrl;
      setTimeout(function () {
        overlay.classList.remove("show");
      }, 600);
    }, 2000);
  });
}
