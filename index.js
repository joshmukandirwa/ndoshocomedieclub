// ============================================================
// NDOSHO COMEDIE CLUB — index.js (vanilla, sans dépendances)
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

  // ---------- Menu mobile ----------
  var menuBtn = document.getElementById('menuBtn');
  var mobileMenu = document.getElementById('mobileMenu');

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.toggle('open');
      menuBtn.classList.toggle('active', isOpen);
      menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    var mobileLinks = mobileMenu.querySelectorAll('a');
    for (var i = 0; i < mobileLinks.length; i++) {
      mobileLinks[i].addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        menuBtn.classList.remove('active');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
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

  initSlider(
    document.getElementById('humorSlider'),
    document.getElementById('humorPrev'),
    document.getElementById('humorNext'),
    document.getElementById('humorDots')
  );

  initSlider(
    document.getElementById('temoigSlider'),
    document.getElementById('temoigPrev'),
    document.getElementById('temoigNext'),
    document.getElementById('temoigDots')
  );

  // ---------- Scroll to top ----------
  var scrollTopBtn = document.getElementById('scrollTop');
  if (scrollTopBtn) {
    window.addEventListener('scroll', function () {
      scrollTopBtn.classList.toggle('show', window.scrollY > 400);
    });
    scrollTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---------- Formulaire newsletter ----------
  var subscribeForm = document.getElementById('subscribeForm');
  if (subscribeForm) {
    subscribeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = subscribeForm.querySelector('input[type="email"]');
      var email = input.value.trim();
      if (!email) return;

      var existingMsg = subscribeForm.querySelector('.form-msg');
      if (existingMsg) existingMsg.remove();

      var msg = document.createElement('p');
      msg.className = 'form-msg';
      msg.textContent = 'Merci ! On vous tient au courant à ' + email;
      subscribeForm.appendChild(msg);

      subscribeForm.reset();
    });
  }

});

