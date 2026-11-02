/* =====================================================================
   hors-perimetre.js : message sur les liens absents de la maquette
   ---------------------------------------------------------------------
   Decision 0010 D5, revue SOCOMEC du 21/10 : « un participant aux tests ne
   doit jamais se retrouver bloque ». Le chrome de la maquette (menu, fil
   d'Ariane, pied de page, icones d'en-tete) reproduit celui du site en
   production ; ses entrees ne menent nulle part, et un clic sans reponse
   laisse croire a une panne.

   Depuis la revue du 27/10 (decision 0011 D5) le message n'est plus une
   modale mais un TOASTER : il ne bloque rien, ne prend pas le focus, et
   liste les pages reellement construites plutot que de renvoyer au seul
   catalogue. Il reste affiche jusqu'a sa fermeture, parce qu'il porte des
   liens : une disparition automatique les emporterait avec elle.

   Il ne touche RIEN de ce qui marche : pages de la maquette, ancres
   internes, liens « Voir la gamme » vers socomec.fr, adresses e-mail,
   contact et devis.

   Charge par les 6 pages vivantes. Zero dependance.
   ===================================================================== */
(function () {
  'use strict';

  /* Entrees sans destination. Les classes viennent du chrome, identique
     d'une page a l'autre. Les elements qui ne sont pas des liens (icones
     d'en-tete, selecteur de pays, reseaux sociaux) recoivent au passage
     role="button" et un arret de tabulation : jusqu'ici, le clavier ne les
     atteignait meme pas. */
  var CIBLES = [
    'a[href="#"]',
    '.hdr-nav-links .nl',
    '.hdr-icons .sq',
    '.nav-icons-desktop .box',
    '.ft-country',
    '.ft-social .s'
  ].join(',');

  /* Les 6 pages vivantes, dans l'ordre du parcours. Le toaster les liste :
     c'est la carte de ce qui existe, et la sortie de l'impasse. */
  var PAGES = [
    { url: 'services.html',                     nom: 'Catalogue des services' },
    { url: 'services/contrat-maintenance.html', nom: 'Contrats de maintenance' },
    { url: 'services/mise-en-service.html',     nom: 'Mise en service sur site' },
    { url: 'services/location-asi.html',        nom: "Location courte durée d'ASI" },
    { url: 'services/powerlease.html',          nom: 'Powerlease, location longue durée' },
    { url: 'devis.html',                        nom: 'Demande de devis' }
  ];

  /* Chemin de la racine du parcours, deduit du src de ce script : une page
     detail sous site/services/ le charge en « ../assets/ ». Meme procede que
     ma-demande.js. */
  var BASE = (function () {
    var s = document.currentScript;
    if (!s) return '';
    var m = s.getAttribute('src').match(/^(.*?)assets\/hors-perimetre\.js/);
    return m ? m[1] : '';
  })();

  /* Fichier de la page courante. La racine du site est reecrite vers le hub
     (vercel.json), d'ou le repli. */
  var ICI = location.pathname.replace(/^.*\//, '') || 'services.html';

  /* Nom de repli donne aux icones sans libelle. Le message ne le cite pas :
     « « Entrée du site, absente de la maquette » fait partie du menu » se
     mordrait la queue. */
  var NOM_REPLI = 'Entrée du site, absente de la maquette';

  var zone = null;

  function echapper(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Ce que l'utilisateur vient de cliquer, pour le lui rappeler. Un libelle
     vide (une icone seule) se rabat sur son title, puis sur rien du tout. */
  function libelle(n) {
    var t = (n.textContent || '').replace(/\s+/g, ' ').trim();
    if (!t) t = n.getAttribute('title') || n.getAttribute('aria-label') || '';
    if (t === NOM_REPLI) return '';
    return t.length > 60 ? t.slice(0, 57) + '...' : t;
  }

  function listePages() {
    return PAGES.map(function (p) {
      var fichier = p.url.replace(/^.*\//, '');
      if (fichier === ICI) {
        return '<li><span class="hp-ici">' + echapper(p.nom) +
               ' <em>vous y êtes</em></span></li>';
      }
      return '<li><a href="' + echapper(BASE + p.url) + '">' + echapper(p.nom) + '</a></li>';
    }).join('');
  }

  /* Un seul toaster a la fois : on reecrit la zone vivante, on n'empile
     pas. La reecriture d'une region aria-live la fait re-annoncer, ce qui
     est exactement ce qu'il faut au deuxieme clic. */
  function ouvrir(nom) {
    zone.innerHTML =
      '<div class="hp-toast">' +
        '<button type="button" class="hp-fermer" id="hp-fermer" aria-label="Fermer le message">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
        '<p class="hp-t">Cette page n\'existe pas dans la maquette</p>' +
        '<p class="hp-d">' + (nom ? '« ' + echapper(nom) +' »' : 'Cette entrée') +
        ' fait partie du menu du site, reproduit ici pour le décor. ' +
        'Les pages construites sont&nbsp;:</p>' +
        '<ul class="hp-pages">' + listePages() + '</ul>' +
      '</div>';
  }

  function fermer() {
    if (zone) zone.innerHTML = '';
  }

  function monter() {
    zone = document.createElement('div');
    zone.className = 'hp-live';
    zone.id = 'hp-live';
    zone.setAttribute('role', 'status');
    zone.setAttribute('aria-live', 'polite');
    document.body.appendChild(zone);

    /* Le focus n'est jamais deplace : le toaster ne bloque rien, l'annonce
       suffit. Echap ferme depuis n'importe ou. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && zone.innerHTML) fermer();
    });

    /* Les entrees sans destination qui ne sont pas des liens deviennent des
       boutons pour le clavier et les technologies d'assistance.
       Un role sans nom accessible serait pire que pas de role : certaines de
       ces entrees ne portent qu'une icone. On leur en donne un, a defaut
       generique mais exact. */
    Array.prototype.forEach.call(document.querySelectorAll(CIBLES), function (n) {
      if (n.tagName === 'A' || n.tagName === 'BUTTON') return;
      n.setAttribute('role', 'button');
      n.setAttribute('tabindex', '0');
      if (!libelle(n)) n.setAttribute('aria-label', NOM_REPLI);
    });

    document.addEventListener('click', function (e) {
      if (e.target.closest('#hp-fermer')) { fermer(); return; }
      if (e.target.closest('.hp-toast')) return;        /* liens du toaster */
      var n = e.target.closest(CIBLES);
      if (!n) return;
      e.preventDefault();
      ouvrir(libelle(n));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var n = e.target.closest ? e.target.closest(CIBLES) : null;
      if (!n || n.tagName === 'A' || n.tagName === 'BUTTON') return;
      e.preventDefault();
      ouvrir(libelle(n));
    });
  }

  /* Les couleurs sont lues dans les tokens de la page quand ils existent,
     avec une valeur de repli : l'asset est partage par 6 pages et ne peut
     pas supposer leur feuille de style (candidate 4 du rapport 0.6.4). */
  var CSS = [
    /* La zone vivante reste en place, vide : une region aria-live posee au
       moment du message ne serait pas annoncee. Vide, elle ne doit rien
       intercepter, d'ou pointer-events. Le bord droit est degage pour le
       bouton flottant « Ma demande ». */
    '.hp-live{position:fixed;z-index:70;left:12px;right:84px;bottom:16px;',
    'display:flex;pointer-events:none}',
    '@media(min-width:576px){.hp-live{left:20px;bottom:20px}}',
    '.hp-toast{pointer-events:auto;position:relative;width:100%;max-width:420px;background:#fff;',
    'border-left:4px solid var(--bleu,#004F9E);padding:16px 48px 16px 18px;',
    'box-shadow:0 18px 44px rgba(10,30,60,.26)}',
    '.hp-t{margin:0 0 6px;font:600 14.5px/1.35 var(--title,Arial,sans-serif);color:var(--ink,#1E1E1C)}',
    '.hp-d{margin:0 0 10px;font:400 13px/1.6 var(--sans,Arial,sans-serif);color:var(--ink-2,#4A4A47)}',
    '.hp-pages{margin:0;padding:0;list-style:none;display:flex;flex-direction:column}',
    '.hp-pages li{border-top:1px solid var(--line,#E2E5EB)}',
    '.hp-pages a{display:flex;align-items:center;min-height:36px;padding:7px 0}',
    '.hp-pages .hp-ici{display:block;padding:9px 0}',
    '.hp-pages a,.hp-pages .hp-ici{font:500 13px/1.4 var(--sans,Arial,sans-serif)}',
    '.hp-pages a{color:var(--bleu-lien,#0070C0);text-decoration:none}',
    '.hp-pages a:hover{color:var(--bleu,#004F9E);text-decoration:underline}',
    '.hp-pages .hp-ici{color:var(--ink-3,#686864)}',
    '.hp-pages .hp-ici em{font-style:normal;margin-left:6px;font:600 10px var(--title,Arial,sans-serif);',
    'letter-spacing:.08em;text-transform:uppercase;color:var(--ink-4,#636A74)}',
    '.hp-fermer{position:absolute;top:4px;right:4px;width:44px;height:44px;border:none;background:none;',
    'cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink-3,#686864)}',
    '.hp-fermer:hover{color:var(--ink,#1E1E1C)}',
    '.hp-fermer svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.5}',
    '.hp-toast a:focus-visible,.hp-fermer:focus-visible',
    '{outline:3px solid var(--bleu-lien,#0070C0);outline-offset:2px}'
  ].join('');

  function init() {
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    monter();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
