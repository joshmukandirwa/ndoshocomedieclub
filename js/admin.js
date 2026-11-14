// ============================================================
// ESPACE ADMIN — connexion Firebase Auth + liste d'admins autorisés
// (collection "admins", voir ADMIN-SETUP.md). Les vraies protections
// sont dans firestore.rules : même en bidouillant ce fichier, un
// visiteur ne peut rien lire ni modifier sans être admin.
// ============================================================
import { adminEmails } from "./firebase-config.js";
import {
  app, db, isConfigured, collection, doc, getDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp, writeBatch,
} from "./firebase.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut,
  setPersistence, browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { el, formatDate, toDate, stars, safeImg, resizeImage, TYPES, avecIcone } from "./utils.js";

const $ = function (id) { return document.getElementById(id); };
const IDLE_MS = 30 * 60 * 1000;   // déconnexion auto après 30 min d'inactivité
const MAX_FAILS = 5, LOCK_MS = 5 * 60 * 1000;

const loginView = $("loginView"), appView = $("appView");
const loginError = $("loginError"), banner = $("appBanner");

function showLoginError(msg) { loginError.textContent = msg; loginError.hidden = !msg; }
function showBanner(msg) { banner.textContent = msg; banner.hidden = !msg; }
function dateHeure(v) {
  const d = toDate(v); if (!d) return "";
  return formatDate(d) + " à " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
function btn(label, cls, onClick) {
  const b = el("button", "btn btn-sm " + cls, label); b.type = "button";
  b.addEventListener("click", function () { b.disabled = true; Promise.resolve(onClick()).finally(function () { b.disabled = false; }); });
  return b;
}
function onErr(e) { console.error(e); showBanner("Erreur : " + (e.code === "permission-denied" ? "accès refusé par les règles de sécurité (vérifiez que votre compte est bien dans la collection admins)." : (e.message || e))); }

if (!isConfigured) {
  loginView.querySelector("form").replaceWith(Object.assign(el("div", "login-card"), {}));
  const c = loginView.querySelector(".login-card");
  c.appendChild(el("h1", null, "Configuration requise"));
  c.appendChild(el("p", "login-sub", "Firebase n'est pas encore configuré. Suivez le guide ADMIN-SETUP.md puis remplissez js/firebase-config.js."));
} else {
  const auth = getAuth(app);
  let unsubs = [], idleTimer = null;

  // ---------- connexion ----------
  $("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const lockUntil = parseInt(localStorage.getItem("ndosho_admin_lock") || "0", 10);
    if (Date.now() < lockUntil) { showLoginError("Trop de tentatives. Réessayez dans quelques minutes."); return; }
    showLoginError("");
    $("loginBtn").disabled = true;
    try {
      await setPersistence(auth, browserSessionPersistence); // la session se ferme avec l'onglet
      await signInWithEmailAndPassword(auth, $("loginEmail").value.trim(), $("loginPass").value);
      localStorage.removeItem("ndosho_admin_fails");
    } catch (err) {
      const fails = parseInt(localStorage.getItem("ndosho_admin_fails") || "0", 10) + 1;
      localStorage.setItem("ndosho_admin_fails", String(fails));
      if (fails >= MAX_FAILS) { localStorage.setItem("ndosho_admin_lock", String(Date.now() + LOCK_MS)); localStorage.setItem("ndosho_admin_fails", "0"); }
      showLoginError(err.code === "auth/too-many-requests" ? "Trop de tentatives. Réessayez plus tard." : "Email ou mot de passe incorrect.");
    } finally { $("loginBtn").disabled = false; $("loginPass").value = ""; }
  });
  $("logoutBtn").addEventListener("click", function () { signOut(auth); });

  onAuthStateChanged(auth, async function (user) {
    unsubs.forEach(function (u) { u(); }); unsubs = [];
    clearTimeout(idleTimer);
    if (!user) { appView.hidden = true; loginView.hidden = false; return; }
    let ok = false;
    ok = adminEmails.indexOf(String(user.email || "").toLowerCase()) !== -1;
    if (!ok) { showLoginError("Ce compte n'a pas les droits d'administration."); await signOut(auth); return; }
    loginView.hidden = true; appView.hidden = false;
    $("appUser").textContent = user.email;
    demarrer();
    ["click", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, resetIdle, { passive: true }); });
    resetIdle();
  });
  function resetIdle() { clearTimeout(idleTimer); idleTimer = setTimeout(function () { signOut(auth); showLoginError("Session fermée après 30 minutes d'inactivité."); }, IDLE_MS); }

  // ---------- onglets ----------
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("active", x === t); });
      ["messages", "temoignages", "actualites"].forEach(function (n) { $("panel-" + n).hidden = n !== t.dataset.tab; });
    });
  });

  function demarrer() {
    showBanner("");
    ecouterMessages(); ecouterTemoignages(); ecouterActus();
  }
  function ecouter(col, champ, cb) {
    unsubs.push(onSnapshot(query(collection(db, col), orderBy(champ, "desc")), function (snap) {
      cb(snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }));
    }, onErr));
  }
  function vide(box, txt) { box.textContent = ""; box.appendChild(el("p", "empty", txt)); }
  function badge(id, n) { const b = $(id); b.textContent = n; b.hidden = !n; }
  function confirmer(txt) { return window.confirm(txt); }
  function wa(tel) { let d = String(tel || "").replace(/\D/g, ""); if (d.startsWith("0")) d = "243" + d.slice(1); return "https://wa.me/" + d; }

  // ---------- MESSAGES ----------
  function ecouterMessages() {
    ecouter("messages", "createdAt", function (list) {
      badge("badgeMessages", list.filter(function (m) { return !m.lu; }).length);
      const box = $("listMessages");
      if (!list.length) return vide(box, "Aucun message pour le moment.");
      box.textContent = "";
      list.forEach(function (m) {
        const it = el("article", "item" + (m.lu ? "" : " unread"));
        const head = el("div", "item-head");
        const left = el("div");
        left.appendChild(el("div", "item-title", m.nom));
        left.appendChild(el("div", "item-meta", dateHeure(m.createdAt)));
        head.appendChild(left); head.appendChild(el("span", "pill", m.objet));
        it.appendChild(head);
        it.appendChild(el("p", "item-text", m.message));
        const ct = el("div", "item-contact");
        const a1 = el("a"); a1.appendChild(avecIcone("tel", m.tel)); a1.href = "tel:" + String(m.tel).replace(/[^\d+]/g, ""); ct.appendChild(a1);
        const a2 = el("a"); a2.appendChild(avecIcone("mail", m.email)); a2.href = "mailto:" + m.email; ct.appendChild(a2);
        it.appendChild(ct);
        const ac = el("div", "item-actions");
        const w = el("a", "btn btn-sm btn-ok", "Répondre WhatsApp"); w.href = wa(m.tel); w.target = "_blank"; w.rel = "noopener"; ac.appendChild(w);
        const em = el("a", "btn btn-sm btn-ghost", "Répondre par email"); em.href = "mailto:" + m.email + "?subject=" + encodeURIComponent("Re : " + m.objet); ac.appendChild(em);
        ac.appendChild(btn(m.lu ? "Marquer non lu" : "Marquer lu", "btn-ghost", function () { return updateDoc(doc(db, "messages", m.id), { lu: !m.lu }).catch(onErr); }));
        ac.appendChild(btn("Supprimer", "btn-danger", function () { if (!confirmer("Supprimer ce message ?")) return; return deleteDoc(doc(db, "messages", m.id)).catch(onErr); }));
        it.appendChild(ac); box.appendChild(it);
      });
    });
  }

  // ---------- TÉMOIGNAGES ----------
  let temoignages = [], statutFiltre = "en_attente";
  function ecouterTemoignages() {
    ecouter("temoignages", "createdAt", function (list) {
      temoignages = list;
      badge("badgeTemoignages", list.filter(function (t) { return t.statut === "en_attente"; }).length);
      rendreTemoignages();
    });
  }
  $("chipsTemoignages").addEventListener("click", function (e) {
    const c = e.target.closest(".chip"); if (!c) return;
    statutFiltre = c.dataset.statut;
    document.querySelectorAll("#chipsTemoignages .chip").forEach(function (x) { x.classList.toggle("active", x === c); });
    rendreTemoignages();
  });
  function rendreTemoignages() {
    const box = $("listTemoignages");
    const list = temoignages.filter(function (t) { return t.statut === statutFiltre; });
    if (!list.length) return vide(box, statutFiltre === "en_attente" ? "Aucun témoignage en attente." : "Rien dans cette liste.");
    box.textContent = "";
    list.forEach(function (t) {
      const it = el("article", "item" + (t.statut === "en_attente" ? " unread" : ""));
      const head = el("div", "t-head");
      if (safeImg(t.photo)) { const im = el("img", "t-photo"); im.src = t.photo; im.alt = ""; head.appendChild(im); }
      const who = el("div");
      who.appendChild(el("div", "item-title", t.nom));
      who.appendChild(el("div", "stars", stars(t.note)));
      who.appendChild(el("div", "item-meta", dateHeure(t.createdAt) + " · " + t.tel));
      head.appendChild(who); it.appendChild(head);
      it.appendChild(el("p", "item-text", t.message));
      const ac = el("div", "item-actions");
      if (t.statut !== "approuve") ac.appendChild(btn("Approuver et publier", "btn-ok", function () { return approuver(t); }));
      if (t.statut !== "refuse") ac.appendChild(btn("Refuser", "btn-ghost", function () { return refuser(t); }));
      ac.appendChild(btn("Supprimer", "btn-danger", function () { return supprimerTemoignage(t); }));
      it.appendChild(ac); box.appendChild(it);
    });
  }
  // Seules les infos publiques (sans téléphone) sont copiées dans "temoignages_publics"
  function approuver(t) {
    const b = writeBatch(db);
    b.set(doc(db, "temoignages_publics", t.id), { nom: t.nom, note: t.note, message: t.message, photo: t.photo || "", date: serverTimestamp() });
    b.update(doc(db, "temoignages", t.id), { statut: "approuve" });
    return b.commit().catch(onErr);
  }
  function refuser(t) {
    const b = writeBatch(db);
    b.delete(doc(db, "temoignages_publics", t.id));
    b.update(doc(db, "temoignages", t.id), { statut: "refuse" });
    return b.commit().catch(onErr);
  }
  function supprimerTemoignage(t) {
    if (!confirmer("Supprimer définitivement ce témoignage ?")) return Promise.resolve();
    const b = writeBatch(db);
    b.delete(doc(db, "temoignages_publics", t.id));
    b.delete(doc(db, "temoignages", t.id));
    return b.commit().catch(onErr);
  }

  // ---------- ACTUALITÉS ----------
  let imageData = "", editId = null, actus = [];
  const f = { type: $("actuType"), titre: $("actuTitre"), contenu: $("actuContenu"), epingle: $("actuEpingle"), publie: $("actuPublie") };

  $("actuImage").addEventListener("change", async function () {
    const file = this.files && this.files[0]; if (!file) return;
    try { imageData = await resizeImage(file, 900, 0.72, false); majApercu(); }
    catch (e) { this.value = ""; alert(e.message || "Image non valide"); }
  });
  $("actuImageRemove").addEventListener("click", function () { imageData = ""; $("actuImage").value = ""; majApercu(); });
  function majApercu() { $("actuImagePreview").src = imageData || ""; $("actuImagePreviewBox").hidden = !imageData; }

  function resetForm() {
    editId = null; imageData = ""; $("actuForm").reset(); f.publie.checked = true; majApercu();
    $("actuSubmit").textContent = "Publier"; $("actuCancel").hidden = true;
  }
  $("actuCancel").addEventListener("click", resetForm);

  $("actuForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const data = {
      type: f.type.value, titre: f.titre.value.trim().slice(0, 140), contenu: f.contenu.value.trim().slice(0, 8000),
      image: imageData, epingle: f.epingle.checked, publie: f.publie.checked,
    };
    if (!data.titre || !data.contenu) return;
    $("actuSubmit").disabled = true;
    try {
      if (editId) await updateDoc(doc(db, "actualites", editId), data);
      else await addDoc(collection(db, "actualites"), Object.assign(data, { date: serverTimestamp(), views: 0 }));
      resetForm(); showBanner("");
    } catch (err) { onErr(err); }
    finally { $("actuSubmit").disabled = false; }
  });

  function modifier(a) {
    editId = a.id; imageData = safeImg(a.image) ? a.image : "";
    f.type.value = a.type || "actualite"; f.titre.value = a.titre; f.contenu.value = a.contenu;
    f.epingle.checked = !!a.epingle; f.publie.checked = !!a.publie; majApercu();
    $("actuSubmit").textContent = "Enregistrer"; $("actuCancel").hidden = false;
    $("actuForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function ecouterActus() {
    ecouter("actualites", "date", function (list) {
      actus = list;
      const total = list.reduce(function (s, a) { return s + (a.views || 0); }, 0);
      $("totalViews").textContent = list.length ? "· " + total + " vues au total" : "";
      const box = $("listActus");
      if (!list.length) return vide(box, "Aucune publication pour le moment.");
      box.textContent = "";
      list.forEach(function (a) {
        const it = el("article", "item");
        const head = el("div", "item-head");
        const left = el("div");
        left.appendChild(el("div", "item-title", a.titre));
        const meta = el("div", "item-meta", formatDate(a.date) + " · "); meta.appendChild(avecIcone("oeil", (a.views || 0) + " vue" + ((a.views || 0) > 1 ? "s" : ""), 14)); left.appendChild(meta);
        head.appendChild(left);
        const pills = el("div");
        pills.appendChild(el("span", "pill", TYPES[a.type] || "Actualité"));
        pills.appendChild(document.createTextNode(" "));
        pills.appendChild(el("span", "pill " + (a.publie ? "ok" : "draft"), a.publie ? "Publié" : "Brouillon"));
        if (a.epingle) { pills.appendChild(document.createTextNode(" ")); pills.appendChild(el("span", "pill pin", "À la une")); }
        head.appendChild(pills); it.appendChild(head);
        const ac = el("div", "item-actions");
        ac.appendChild(btn("Modifier", "btn-ghost", function () { modifier(a); return Promise.resolve(); }));
        ac.appendChild(btn(a.publie ? "Dépublier" : "Publier", "btn-ok", function () { return updateDoc(doc(db, "actualites", a.id), { publie: !a.publie }).catch(onErr); }));
        ac.appendChild(btn(a.epingle ? "Désépingler" : "Épingler", "btn-ghost", function () { return updateDoc(doc(db, "actualites", a.id), { epingle: !a.epingle }).catch(onErr); }));
        ac.appendChild(btn("Supprimer", "btn-danger", function () { if (!confirmer("Supprimer cette publication ?")) return; return deleteDoc(doc(db, "actualites", a.id)).catch(onErr); }));
        it.appendChild(ac); box.appendChild(it);
      });
    });
  }
}
