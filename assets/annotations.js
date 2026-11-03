/* =====================================================================
   annotations.js : pictos « i » indiquant la caractéristique PIM d'un contenu
   ---------------------------------------------------------------------
   Les annotations se déclarent dans assets/annotations-data.js. Ce fichier
   ne contient que le mécanisme : calque de pictos positionnés au-dessus de la
   page (aucune modification de la mise en page), fiche au clic, et bouton
   pour tout afficher ou masquer (état mémorisé).
   ===================================================================== */
(function () {
  'use strict';

  var DATA = window.ANNOTATIONS || {};
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (page === 'services.html') page = 'index.html';
  var entries = (DATA['*'] || []).concat(DATA[page] || []);

  var CLE = 'socomec-annotations';
  var visible = localStorage.getItem(CLE) !== 'off';
  var calque, calqueHaut, fiche, bouton, marqueurs = [], ouvert = null;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function injecterStyle() {
    var s = el('style');
    s.textContent =
      '.ann-calque{position:absolute;left:0;top:0;width:0;height:0;z-index:25;pointer-events:none}' +
      '.ann-calque[hidden]{display:none}' +
      '.ann-calque.ann-haut{z-index:40}' +
      '.ann-i{position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;' +
        'background:#E6007E;color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);' +
        'font:700 13px/1 Georgia,serif;font-style:italic;cursor:pointer;padding:0;pointer-events:auto;' +
        'display:flex;align-items:center;justify-content:center}' +
      '.ann-i:hover,.ann-i[aria-expanded="true"]{background:#B3005F;transform:scale(1.12)}' +
      '.ann-i:focus-visible{outline:3px solid #FFCC00;outline-offset:2px}' +
      '.ann-i[hidden]{display:none}' +
      '.ann-fiche{position:absolute;z-index:95;width:320px;max-width:calc(100vw - 24px);background:#fff;' +
        'color:#1E1E1C;border:1px solid #C9D3E0;border-top:4px solid #E6007E;' +
        'box-shadow:0 8px 28px rgba(0,31,63,.28);padding:14px 16px 14px;font:400 13px/1.5 Roboto,Arial,sans-serif}' +
      '.ann-fiche[hidden]{display:none}' +
      '.ann-fiche .ann-lbl{font:800 10.5px Poppins,Roboto,sans-serif;letter-spacing:.12em;color:#E6007E;margin-bottom:4px}' +
      '.ann-fiche .ann-carac{font:600 15px Poppins,Roboto,sans-serif;color:#082B5C;word-break:break-word}' +
      '.ann-fiche .ann-code{display:inline-block;margin-top:6px;padding:2px 7px;background:#EAF4FC;' +
        'font:500 12px Consolas,monospace;color:#004F9E}' +
      '.ann-fiche p{margin:10px 0 0;color:#4A4A47}' +
      '.ann-fiche dl{margin:10px 0 0;display:grid;grid-template-columns:auto 1fr;gap:4px 10px}' +
      '.ann-fiche dt{color:#686864;font-weight:500}' +
      '.ann-fiche dd{margin:0}' +
      '.ann-fiche .ann-sim{margin-top:10px;padding:6px 8px;background:#FFF6D6;border-left:3px solid #FFCC00;font-size:12px}' +
      '.ann-fiche .ann-x{position:absolute;right:6px;top:6px;width:28px;height:28px;border:none;background:none;' +
        'cursor:pointer;font-size:18px;line-height:1;color:#4A4A47}' +
      '.ann-fiche .ann-x:focus-visible{outline:3px solid #0070C0}' +
      '.ann-toggle{position:fixed;left:12px;bottom:12px;z-index:96;display:flex;align-items:center;gap:8px;' +
        'min-height:40px;padding:8px 14px;border:none;border-radius:999px;background:#E6007E;color:#fff;' +
        'font:600 12.5px Poppins,Roboto,sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.3)}' +
      '.ann-toggle[aria-pressed="false"]{background:#4A4A47}' +
      '.ann-toggle:focus-visible{outline:3px solid #FFCC00;outline-offset:2px}' +
      '.ann-off .ann-ajout,.ann-off .ann-hero-img{display:none}' +
      'html:not(.ann-off) .o-type{margin-right:22px}' +
      '.ann-hero-img{display:flex;flex-direction:column;align-items:flex-start;margin:0 0 36px}' +
      '.ann-hero-img-cadre{width:100%;aspect-ratio:16/10;display:flex;align-items:center;justify-content:center;' +
        'background:rgba(255,240,248,.95);border:2px dashed #E6007E;color:#E6007E;font:600 16px Poppins,Roboto,sans-serif}' +
      '.ann-hero-img .ann-ajout-tag{margin-bottom:0}' +
      '@media(min-width:992px){.ann-hero-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:48px;align-items:center}' +
        '.ann-hero-img{margin:0 0 56px}}' +
      '.ann-ajout{background:#FFF0F8;border-top:1px solid #E2E5EB}' +
      '.ann-ajout-inner{max-width:1280px;margin:0 auto;padding:36px 16px;border-left:4px dashed #E6007E}' +
      '.ann-ajout-tag{display:inline-block;margin-bottom:18px;padding:4px 10px;background:#E6007E;color:#fff;' +
        'font:800 10.5px Poppins,Roboto,sans-serif;letter-spacing:.1em}' +
      '.ann-sp{margin-bottom:26px;max-width:860px}' +
      '.ann-sp:last-child{margin-bottom:0}' +
      '.ann-sp-t{display:inline-block;font:600 20px/1.3 Poppins,Roboto,sans-serif;color:#082B5C;margin:0 0 8px}' +
      '.ann-sp-x{font:400 15px/1.65 Roboto,Arial,sans-serif;color:#4A4A47;margin:0}' +
      '.ann-ancre-p{margin:14px 0 0;line-height:0}' +
      '.ann-ancre{display:inline-block;width:1px;height:22px;vertical-align:top}' +
      '.ann-vide{font:400 15px/1.6 Roboto,Arial,sans-serif;color:#4A4A47;margin:0}' +
      '.ann-formule{max-width:860px;background:#fff;border:1px solid #C9D3E0;padding:24px 26px;display:flex;flex-direction:column;gap:20px}' +
      '.ann-formule-txt{display:inline-block;margin:0;font:400 16px/1.65 Roboto,Arial,sans-serif;color:#1E1E1C}' +
      '@media(min-width:992px){.ann-ajout-inner{padding:48px 40px}}';
    document.head.appendChild(s);
  }

  function cibles(e) {
    var liste = Array.prototype.slice.call(document.querySelectorAll(e.sel));
    return e.all ? liste : liste.slice(0, 1);
  }

  function creerMarqueur(e, cible) {
    var b = el('button', 'ann-i', 'i');
    b.type = 'button';
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-label', 'Caractéristique PIM : ' + (e.carac || ''));
    b.addEventListener('click', function (ev) { ev.stopPropagation(); basculer(b, e); });
    (e.haut ? calqueHaut : calque).appendChild(b);
    marqueurs.push({ b: b, cible: cible, e: e });
  }

  /* Contenus générés après le chargement (liste de suggestions) : les pictos
     suivent les éléments qui apparaissent et disparaissent. */
  function synchroniser() {
    marqueurs = marqueurs.filter(function (m) {
      if (!m.e.dyn || document.body.contains(m.cible)) return true;
      if (ouvert && ouvert.b === m.b) { fiche.hidden = true; ouvert = null; }
      m.b.remove();
      return false;
    });
    entries.forEach(function (e) {
      if (!e.dyn) return;
      cibles(e).forEach(function (cible) {
        var deja = marqueurs.some(function (m) { return m.cible === cible && m.e === e; });
        if (!deja) creerMarqueur(e, cible);
      });
    });
  }

  function construire() {
    calque = el('div', 'ann-calque');
    calque.hidden = !visible;
    document.body.appendChild(calque);
    calqueHaut = el('div', 'ann-calque ann-haut');
    calqueHaut.hidden = !visible;
    document.body.appendChild(calqueHaut);

    entries.forEach(function (e) {
      cibles(e).forEach(function (cible) { creerMarqueur(e, cible); });
    });

    fiche = el('div', 'ann-fiche');
    fiche.hidden = true;
    fiche.setAttribute('role', 'dialog');
    document.body.appendChild(fiche);

    bouton = el('button', 'ann-toggle', '<span aria-hidden="true">ⓘ</span> Annotations PIM');
    bouton.type = 'button';
    bouton.setAttribute('aria-pressed', String(visible));
    bouton.addEventListener('click', function () {
      visible = !visible;
      localStorage.setItem(CLE, visible ? 'on' : 'off');
      bouton.setAttribute('aria-pressed', String(visible));
      calque.hidden = !visible;
      calqueHaut.hidden = !visible;
      document.documentElement.classList.toggle('ann-off', !visible);
      if (!visible) fermer();
      placer();
    });
    document.body.appendChild(bouton);
  }

  /* Le picto se pose sur l'angle haut-droit de la cible ; une cible masquée
     (filtre, onglet, display:none) n'affiche pas son picto. */
  function placer() {
    synchroniser();
    var sx = window.pageXOffset, sy = window.pageYOffset;
    var decalage = {};
    marqueurs.forEach(function (m) {
      var r = m.cible.getBoundingClientRect();
      var cache = !r.width && !r.height;
      // Cible défilante (liste de suggestions) : hors de son cadre, pas de picto.
      if (!cache && m.e.clip) {
        var c = m.cible.closest(m.e.clip);
        var rc = c && c.getBoundingClientRect();
        cache = !rc || r.top < rc.top || r.bottom > rc.bottom;
      }
      m.b.hidden = cache;
      if (cache) return;
      var largeur = document.documentElement.clientWidth;
      var x = Math.min(r.right + sx + (m.e.dx != null ? m.e.dx : 14), largeur + sx - 14);
      var y = r.top + sy + (m.e.dy != null ? m.e.dy : 12);
      // Deux pictos sur le même angle : on les décale pour qu'ils restent cliquables.
      var k = Math.round(x) + ':' + Math.round(y);
      var n = decalage[k] || 0;
      decalage[k] = n + 1;
      m.b.style.left = (x - n * 26) + 'px';
      m.b.style.top = y + 'px';
    });
    if (ouvert) positionnerFiche(ouvert.b);
  }

  function positionnerFiche(b) {
    var r = b.getBoundingClientRect();
    var w = fiche.offsetWidth, sx = window.pageXOffset, sy = window.pageYOffset;
    var x = Math.min(Math.max(r.left + sx - w / 2, sx + 8), sx + document.documentElement.clientWidth - w - 8);
    fiche.style.left = x + 'px';
    fiche.style.top = (r.bottom + sy + 10) + 'px';
  }

  function ligne(k, v) {
    return v ? '<dt>' + k + '</dt><dd>' + v + '</dd>' : '';
  }

  function remplir(e) {
    var infos = ligne('Libellé PIM', esc(e.libelle)) +
      ligne('Type', esc(e.type)) +
      ligne('Exemple', esc(e.exemple)) +
      ligne('Source', esc(e.source));
    fiche.innerHTML =
      '<button type="button" class="ann-x" aria-label="Fermer">×</button>' +
      '<div class="ann-lbl">CARACTÉRISTIQUE PIM</div>' +
      '<div class="ann-carac">' + esc(e.carac) + '</div>' +
      (e.code ? '<span class="ann-code">' + esc(e.code) + '</span>' : '') +
      (e.note ? '<p>' + esc(e.note) + '</p>' : '') +
      (infos ? '<dl>' + infos + '</dl>' : '') +
      (e.simule ? '<div class="ann-sim">🔶 Valeur simulée pour la maquette, à valider avec SOCOMEC.</div>' : '') +
      (e.absent ? '<div class="ann-sim">⚠️ Ce contenu n\'existe pas dans le PIM.</div>' : '') +
      (e.manque ? '<div class="ann-sim">➕ Contenu du PIM absent de la maquette : bloc ajouté ici pour mémoire.</div>' : '');
    fiche.querySelector('.ann-x').addEventListener('click', fermer);
  }

  function basculer(b, e) {
    if (ouvert && ouvert.b === b) { fermer(); return; }
    fermer();
    remplir(e);
    fiche.hidden = false;
    b.setAttribute('aria-expanded', 'true');
    ouvert = { b: b, e: e };
    positionnerFiche(b);
  }

  function fermer() {
    if (!ouvert) return;
    ouvert.b.setAttribute('aria-expanded', 'false');
    ouvert.b.focus({ preventScroll: true });
    fiche.hidden = true;
    ouvert = null;
  }

  function init() {
    document.documentElement.classList.toggle('ann-off', !visible);
    injecterStyle();
    construire();
    placer();
    var raf = 0;
    function replacer() { cancelAnimationFrame(raf); raf = requestAnimationFrame(placer); }
    window.addEventListener('resize', replacer);
    window.addEventListener('load', replacer);
    window.addEventListener('scroll', replacer, { passive: true, capture: true });
    if (window.ResizeObserver) new ResizeObserver(replacer).observe(document.body);
    // Les filtres, onglets et tiroirs modifient la page sans la redimensionner.
    new MutationObserver(replacer).observe(document.body, { attributes: true, subtree: true, childList: true,
      attributeFilter: ['class', 'hidden', 'style', 'aria-expanded'] });
    document.addEventListener('click', function (ev) {
      if (ouvert && !fiche.contains(ev.target)) fermer();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') fermer();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
