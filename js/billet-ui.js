// ============================================================
// Billet « Festival Punguza Stress » : un seul design, partagé par
// l'admin (aperçu) et mon-billet.html (page du client).
// Le billet est dessiné ici (HTML + SVG) ; le QR reste celui signé par le serveur.
// Tout texte du billet passe par textContent (jamais innerHTML).
// ============================================================
(function () {
  var W = 880, H = 470; // taille « réelle » de la feuille (le billet est réduit à l'écran, jamais à l'export)

  // petite suite pseudo-aléatoire : la foule est toujours la même, d'un affichage à l'autre
  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  function artSvg() {
    var r = rnd(7), i, x, y, s = "";
    s += '<svg class="bp-art" viewBox="0 0 640 262" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    s += '<defs>' +
      '<linearGradient id="bpSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060d22"/><stop offset=".6" stop-color="#14265a"/><stop offset="1" stop-color="#3a3f6e"/></linearGradient>' +
      '<radialGradient id="bpLava" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb347" stop-opacity=".95"/><stop offset=".5" stop-color="#f26a22" stop-opacity=".4"/><stop offset="1" stop-color="#f24822" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="bpBeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f1d27a" stop-opacity=".30"/><stop offset="1" stop-color="#f1d27a" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="bpGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1d27a"/><stop offset="1" stop-color="#b8892f"/></linearGradient>' +
      '</defs>';
    s += '<rect width="640" height="262" fill="url(#bpSky)"/>';
    for (i = 0; i < 40; i++) s += '<circle cx="' + (r() * 640).toFixed(1) + '" cy="' + (r() * 120).toFixed(1) + '" r="' + (0.4 + r() * 0.9).toFixed(1) + '" fill="#fff" opacity="' + (0.25 + r() * 0.5).toFixed(2) + '"/>';
    // projecteurs
    s += '<path d="M470 262 L420 0 L470 0 Z" fill="url(#bpBeam)"/><path d="M560 262 L560 0 L620 0 Z" fill="url(#bpBeam)"/><path d="M380 262 L300 0 L350 0 Z" fill="url(#bpBeam)"/>';
    // Nyiragongo
    s += '<ellipse cx="430" cy="118" rx="60" ry="26" fill="url(#bpLava)"/>';
    s += '<path d="M240 214 L372 128 L398 112 L430 108 L462 114 L488 130 L620 214 Z" fill="#1b2b63"/>';
    s += '<path d="M398 112 L430 108 L462 114 L452 122 L430 118 L408 123 Z" fill="#f2893a" opacity=".85"/>';
    s += '<path d="M300 214 L400 146 L430 170 L470 142 L560 214 Z" fill="#101d4a"/>';
    s += '<path d="M0 226 L90 196 L170 214 L260 188 L350 220 L640 206 L640 262 L0 262 Z" fill="#0a1436"/>';
    // foule
    s += '<g fill="#050b1f">';
    for (i = 0; i < 48; i++) {
      x = 4 + i * 13.5 + r() * 6; y = 224 + r() * 20;
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (6.5 + r() * 2.5).toFixed(1) + '"/>' +
           '<path d="M' + (x - 12).toFixed(1) + ' 262 Q' + x.toFixed(1) + ' ' + (y + 5).toFixed(1) + ' ' + (x + 12).toFixed(1) + ' 262Z"/>';
    }
    s += '</g>';
    // micro en trait doré
    s += '<g transform="rotate(-14 560 140)" fill="none" stroke="url(#bpGold)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="540" y="62" width="40" height="64" rx="20"/><path d="M528 104v8a32 32 0 0 0 64 0v-8M560 144v34M542 182h36"/>' +
      '<path d="M548 82h24M548 94h24" stroke-width="2" opacity=".7"/></g>';
    s += '</svg>';
    return s;
  }

  var GLYPH = {
    fb: '<path d="M14 8h-2c-1 0-2 .8-2 2v2H8v3h2v6h3v-6h2.2l.5-3H13v-1.6c0-.3.3-.4.6-.4H15z"/>',
    yt: '<path d="M21 8.3c-.2-.9-.9-1.5-1.7-1.7C17.9 6.3 12 6.3 12 6.3s-5.9 0-7.3.3c-.8.2-1.5.8-1.7 1.7C2.7 9.7 2.7 12 2.7 12s0 2.3.3 3.7c.2.9.9 1.5 1.7 1.7 1.4.3 7.3.3 7.3.3s5.9 0 7.3-.3c.8-.2 1.5-.8 1.7-1.7.3-1.4.3-3.7.3-3.7s0-2.3-.3-3.7zM10 14.8V9.2l4.8 2.8z"/>',
    tt: '<path d="M16.5 3h-3v12.4a2.4 2.4 0 1 1-2.4-2.4c.2 0 .5 0 .7.1V10a5.5 5.5 0 1 0 4.7 5.4V9.1c1 .8 2.2 1.2 3.5 1.2V7.3c-2 0-3.5-1.7-3.5-4.3z"/>',
  };
  function glyph(k) { return '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">' + GLYPH[k] + '</svg>'; }

  var ICON = {
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  };
  function ico(k) { return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>'; }

  var MARKUP =
    '<div class="bp-sheet">' +
      '<div class="bp-wm" aria-hidden="true">PUNGUZA<br>PUNGUZA<br>PUNGUZA<br>PUNGUZA</div>' +
      '<div class="bp-ticket">' +
        '<div class="bp-main">' +
          '<div class="bp-top">' + artSvg() +
            '<div class="bp-fade"></div>' +
            '<div class="bp-head">' +
              '<img class="bp-logo" src="./logo/ndoshologo.png" alt="Ndosho Comédie Club" width="64" height="64" />' +
              '<span class="bp-rule"></span>' +
              '<div class="bp-pres"><span>Le Ndosho Comédie Club présente</span><b class="bp-edition" data-r="edition">2<sup>e</sup> Édition</b></div>' +
            '</div>' +
            '<div class="bp-title" data-r="titrePunguza"><span class="t1">FESTIVAL</span><span class="t2">PUNGUZA</span><span class="t3">STRESS</span></div>' +
            '<div class="bp-title bp-title-simple" data-r="titreSimple" hidden><span class="t2" data-t="titre"></span></div>' +
            '<p class="bp-slogan">Rire ensemble, c\u2019est la vie !</p>' +
          '</div>' +
          '<div class="bp-info">' +
            '<div class="bp-cell"><span class="bp-k">' + ico("cal") + 'Date</span><b data-t="date">—</b><small data-t="dateSub"></small></div>' +
            '<div class="bp-cell"><span class="bp-k">' + ico("pin") + 'Lieu</span><b data-t="lieu">—</b><small data-t="lieuSub">Goma, Nord-Kivu</small></div>' +
            '<div class="bp-cell"><span class="bp-k">' + ico("mic") + 'Au programme</span><b data-t="prog">Stand-up · Sketchs</b><small data-t="progSub">Humour et bonne humeur</small></div>' +
          '</div>' +
          '<div class="bp-foot">' +
            '<div class="bp-holder"><span class="bp-for">Billet établi au nom de</span><b class="bp-name" data-t="nom">—</b><small data-t="detail"></small></div>' +
            '<div class="bp-social"><span>' + glyph("fb") + glyph("yt") + glyph("tt") + '</span><span>@NdoshoComedieClub</span><span>ndosho-comedie-club.vercel.app</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="bp-stub">' +
          '<span class="bp-official">Billet officiel</span>' +
          '<div class="bp-qrframe"><div class="bp-qr" id="tkQr"><img id="tkQrImg" src="" alt="QR code du billet" width="120" height="120" /></div></div>' +
          '<b class="bp-admit">ADMIT ONE</b>' +
          '<span class="bp-uid">ID du billet</span><b class="bp-id" data-t="id">—</b>' +
          '<div class="bp-cat" data-cat="Standard"><small>Catégorie</small><b data-t="cat">Standard</b></div>' +
          '<p class="bp-fine" data-t="fine"></p>' +
        '</div>' +
        '<i class="bp-hole h-l"></i><i class="bp-hole h-r"></i><i class="bp-hole h-t"></i><i class="bp-hole h-b"></i>' +
      '</div>' +
    '</div>';

  var PETITES_PHRASES = [
    "Billet nominatif et unique. Toute tentative de contrefaçon sera punie d\u2019un fou rire obligatoire.",
    "Un billet, un fou rire garanti. Les copies, elles, ne font rire personne.",
    "Ce billet n\u2019est valable qu\u2019une fois : on ne rit pas deux fois à l\u2019entrée !",
    "Prévoyez des joues solides : demain, elles vous feront mal à force de rire.",
  ];
  function pick(id) { var h = 0, s = String(id || ""); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return PETITES_PHRASES[h % PETITES_PHRASES.length]; }

  function q(root, sel) { return root.querySelector(sel); }
  function setT(root, key, v) { var n = q(root, '[data-t="' + key + '"]'); if (n) n.textContent = v; }

  // le nom d'événement du billet est « Festival Punguza Stress — 2e édition · VIP » : la catégorie est après le « · »
  function decouper(eventName) {
    var m = /^(.*?)\s*[·•|]\s*(Standard|VIP|VVIP)\s*$/i.exec(String(eventName || ""));
    return m ? { titre: m[1].trim(), cat: m[2].toUpperCase() === "STANDARD" ? "Standard" : m[2].toUpperCase() } : { titre: String(eventName || "").trim(), cat: "" };
  }

  var API = {
    W: W, H: H,
    // Prépare le conteneur (une seule fois) puis le garde à la bonne taille.
    monter: function (wrap) {
      if (!wrap.querySelector(".bp-sheet")) { wrap.classList.add("bp-wrap"); wrap.innerHTML = MARKUP; }
      API.ajuster(wrap);
      if (!wrap._bpResize) { wrap._bpResize = function () { API.ajuster(wrap); }; window.addEventListener("resize", wrap._bpResize); }
    },
    ajuster: function (wrap) {
      var sheet = wrap.querySelector(".bp-sheet"); if (!sheet) return;
      var w = wrap.clientWidth || W, k = Math.min(1, w / W);
      sheet.style.transform = "scale(" + k + ")";
      wrap.style.height = Math.ceil(H * k) + "px";
    },
    remplir: function (wrap, t) {
      API.monter(wrap);
      var ev = decouper(t.eventName), punguza = /punguza/i.test(ev.titre);
      var simple = q(wrap, '[data-r="titreSimple"]'), pz = q(wrap, '[data-r="titrePunguza"]'), ed = q(wrap, '[data-r="edition"]');
      pz.hidden = !punguza; simple.hidden = punguza; ed.parentNode.hidden = !punguza; q(wrap, ".bp-rule").hidden = !punguza;
      if (!punguza) { setT(wrap, "titre", ev.titre); setT(wrap, "prog", "Humour live"); setT(wrap, "progSub", "Ndosho Comédie Club"); }
      else { setT(wrap, "prog", "Stand-up · Sketchs"); setT(wrap, "progSub", "Humour et bonne humeur"); }
      setT(wrap, "date", t.eventDate || "—"); setT(wrap, "lieu", t.eventLieu || "—");
      setT(wrap, "nom", t.nom || "—");
      setT(wrap, "detail", [t.tel, t.montant ? "payé : " + t.montant : ""].filter(Boolean).join("  ·  "));
      setT(wrap, "id", t.ticketId || "—");
      setT(wrap, "fine", pick(t.ticketId));
      var cat = q(wrap, ".bp-cat"), c = ev.cat || "Standard";
      cat.setAttribute("data-cat", c); setT(wrap, "cat", c);
      cat.hidden = !ev.cat;
      // alias pour l'ancien code (ID en double)
      wrap.setAttribute("data-ticket-id", t.ticketId || "");
    },
    qr: function (wrap, texte, onerror) {
      var img = q(wrap, "#tkQrImg");
      img.onerror = function () { if (onerror) onerror(); else img.alt = "QR indisponible (vérifiez la connexion internet)"; };
      img.src = "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=" + encodeURIComponent(texte);
    },
    // Dessine la feuille à taille réelle (880×470, ×2) même si elle est réduite à l'écran.
    versCanvas: async function (wrap) {
      if (typeof html2canvas === "undefined") throw new Error("html2canvas indisponible");
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
      var sheet = wrap.querySelector(".bp-sheet");
      var hold = document.createElement("div");
      hold.style.cssText = "position:fixed;left:-20000px;top:0;width:" + W + "px;height:" + H + "px;overflow:hidden;";
      var clone = sheet.cloneNode(true); clone.style.transform = "none";
      hold.appendChild(clone); document.body.appendChild(hold);
      try { return await html2canvas(clone, { backgroundColor: null, scale: 2, useCORS: true, width: W, height: H }); }
      finally { document.body.removeChild(hold); }
    },
  };
  window.BilletUI = API;
})();
