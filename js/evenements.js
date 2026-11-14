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

  var isFeatured = card.classList.contains("featured-card");
  var shareIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>';
  var canNativeShare = typeof navigator.share === "function";

  var shareBtn = document.createElement("button");
  shareBtn.type = "button";
  shareBtn.className = "evnt-share-btn" + (isFeatured ? " evnt-share-btn--pill" : "");
  var shareLabel = canNativeShare ? "Partager cet événement" : "Copier le lien de cet événement";
  shareBtn.title = shareLabel;
  shareBtn.setAttribute("aria-label", shareLabel);
  shareBtn.innerHTML = shareIcon + (isFeatured ? "<span>" + (canNativeShare ? "Partager" : "Copier le lien") + "</span>" : "");

  shareBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    // Ce lien affiche l'affiche (image légère 1200x630) dans l'aperçu WhatsApp, Facebook, etc.
    var url = window.location.origin + "/api/evenement?id=" + slug;
    if (canNativeShare) {
      navigator
        .share({ title: titleEl.textContent.trim(), text: titleEl.textContent.trim() + " — Ndosho Comédie Club", url: url })
        .catch(function (err) {
          // Annulation par l'utilisateur : rien à faire. Autre erreur : on copie le lien.
          if (err && err.name !== "AbortError") copyToClipboard(url);
        });
    } else {
      copyToClipboard(url);
    }
  });

  var actions = isFeatured ? card.querySelector(".featured-actions") : null;
  (actions || card).appendChild(shareBtn);
});

// ---------- Compte à rebours ----------
(function () {
  var box = document.getElementById("countdown");
  if (!box) return;
  var target = new Date(box.getAttribute("data-target")).getTime();
  var cells = {};
  box.querySelectorAll("[data-unit]").forEach(function (el) {
    cells[el.getAttribute("data-unit")] = el;
  });
  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }
  function tick() {
    var diff = target - Date.now();
    if (isNaN(target) || diff <= 0) {
      box.hidden = true;
      return false;
    }
    var s = Math.floor(diff / 1000);
    cells.days.textContent = Math.floor(s / 86400);
    cells.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    cells.minutes.textContent = pad(Math.floor((s % 3600) / 60));
    cells.seconds.textContent = pad(s % 60);
    return true;
  }
  if (tick()) {
    var timer = setInterval(function () {
      if (!tick()) clearInterval(timer);
    }, 1000);
  }
})();

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
