// ============================================================
// NDOSHO COMÉDIE CLUB — index.js (vanilla, sans dépendances)
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

  // ---------- Menu mobile (tiroir droite -> gauche) ----------
  var menuBtn = document.getElementById('menuBtn');
  var mobileMenu = document.getElementById('mobileMenu');

  if (menuBtn && mobileMenu) {
    var backdrop = document.createElement('div');
    backdrop.className = 'menu-backdrop';
    document.body.appendChild(backdrop);

    function setMenu(open) {
      mobileMenu.classList.toggle('open', open);
      menuBtn.classList.toggle('active', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      backdrop.classList.toggle('show', open);
      document.body.classList.toggle('menu-lock', open);
    }

    menuBtn.addEventListener('click', function () {
      setMenu(!mobileMenu.classList.contains('open'));
    });

    backdrop.addEventListener('click', function () { setMenu(false); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });

    // Si l'écran devient large, on referme proprement
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1460) setMenu(false);
    });

    // Page courante mise en évidence
    var currentPage = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var mobileLinks = mobileMenu.querySelectorAll('a');
    for (var i = 0; i < mobileLinks.length; i++) {
      var target = (mobileLinks[i].getAttribute('href') || '').split('#')[0].toLowerCase();
      if (target === currentPage) mobileLinks[i].setAttribute('aria-current', 'page');
      mobileLinks[i].addEventListener('click', function () { setMenu(false); });
    }
  }

  // ---------- Agenda (accueil) : "Dans X jours" ----------
  var soon = document.getElementById('homeSoon');
  if (soon) {
    var diff = new Date(soon.getAttribute('data-target')).getTime() - Date.now();
    if (!isNaN(diff)) {
      var days = Math.floor(diff / 86400000);
      if (diff <= -86400000) soon.textContent = 'Terminé';
      else if (diff <= 0) soon.textContent = "Aujourd'hui";
      else if (days === 0) soon.textContent = 'Demain';
      else soon.textContent = 'Dans ' + days + ' jours';
    }
  }

  // ---------- Slider générique ----------
  function initSlider(sliderEl, prevBtn, nextBtn, dotsEl) {
    if (!sliderEl) return;
    var items = sliderEl.children;
    if (items.length === 0) return;

    var index = 0;

    function itemsPerView() {
      var w = window.innerWidth;
      var breakpoint = parseInt(sliderEl.getAttribute('data-grid-break') || '1024', 10);
      if (w >= breakpoint) return 4;
      if (w >= 1100) return 3;
      if (w >= 700) return 2;
      return 1;
    }

    function maxIndex() {
      return Math.max(0, items.length - itemsPerView());
    }

    function buildDots() {
      if (!dotsEl) return;
      dotsEl.innerHTML = '';
      var total = maxIndex() + 1;
      for (var d = 0; d < total; d++) {
        var dot = document.createElement('span');
        if (d === index) dot.classList.add('active');
        (function (dIndex) {
          dot.addEventListener('click', function () {
            index = dIndex;
            update();
          });
        })(d);
        dotsEl.appendChild(dot);
      }
    }

    function update() {
      var perView = itemsPerView();
      var itemWidth = items[0].getBoundingClientRect().width;
      var gap = parseFloat(window.getComputedStyle(sliderEl).gap) || 0;
      var offset = index * (itemWidth + gap);
      sliderEl.scrollTo({ left: offset, behavior: 'smooth' });

      if (dotsEl) {
        var dots = dotsEl.children;
        for (var k = 0; k < dots.length; k++) {
          dots[k].classList.toggle('active', k === index);
        }
      }
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        index = index > 0 ? index - 1 : maxIndex();
        update();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        index = index < maxIndex() ? index + 1 : 0;
        update();
      });
    }

    window.addEventListener('resize', function () {
      index = Math.min(index, maxIndex());
      buildDots();
      update();
    });

    buildDots();
  }

  window.initNdoshoSlider = initSlider;


  // ---------- Barre de navigation : ombre quand on descend ----------
  var siteHeader = document.querySelector('header');
  if (siteHeader) {
    var onScroll = function () {
      siteHeader.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------- Rangées à défilement automatique en boucle (galerie, humoristes) ----------
  function autoLoop(strip, speed) {
    if (!strip || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var originals = Array.prototype.slice.call(strip.children);
    // Peu d'éléments : tout tient à l'écran, inutile de les copier (sinon le même élément s'affiche deux fois)
    if (strip.scrollWidth <= strip.clientWidth + 2) return;
    originals.forEach(function (el) {
      var clone = el.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      if (clone.tagName === 'A') clone.setAttribute('tabindex', '-1');
      strip.appendChild(clone);
    });

    var pos = 0;
    var paused = false;
    var resume = null;
    var stopped = false;
    strip.__stop = function () { stopped = true; };

    function period() {
      return strip.children[originals.length].offsetLeft - originals[0].offsetLeft;
    }

    function pause() {
      paused = true;
      clearTimeout(resume);
      resume = setTimeout(function () {
        pos = strip.scrollLeft;
        paused = false;
      }, 2500);
    }
    ['touchstart', 'pointerdown', 'wheel', 'mouseenter'].forEach(function (ev) {
      strip.addEventListener(ev, pause, { passive: true });
    });

    function tick() {
      if (stopped) return;
      var p = period();
      if (!paused) {
        pos += speed;
        if (p > 0 && pos >= p) pos -= p;
        strip.scrollLeft = pos;
      } else if (p > 0 && strip.scrollLeft >= p) {
        strip.scrollLeft -= p;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  window.ndoshoAutoLoop = autoLoop;

  autoLoop(document.querySelector('.galerie-grid'), 0.6);
  autoLoop(document.getElementById('humorRow'), 0.5);

});

