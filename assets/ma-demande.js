/* =====================================================================
   ma-demande.js : Composant « Ma demande » partagé par tout le parcours v2
   ---------------------------------------------------------------------
   Bouton flottant avec compteur + panneau latéral (drawer >= 992px,
   bottom-sheet en dessous), calqué sur le dispositif de sélection de la v1
   (site/archives/powerlease.html) pour ne pas rompre l'identité (EF-012).

   Le panneau porte le tunnel de demande complet, en trois étapes :
   1 sélection, 2 e-mail, 3 informations complémentaires, puis confirmation.
   Ce choix vient de la revue du 2026-08-19 : ouvrir une page pleine annulait
   la rapidité du drawer. La page devis.html reste une variante possible,
   atteignable depuis le pied du panneau et le pied de page.

   Couvre  : EF-005 (récap permanent), EF-006 (persistance de session),
             EF-007 et EF-008 (demande et confirmation), EF-013 (clavier
             seul, focus visible), retrait unitaire, vidage, anti-doublon,
             sélection unique des formules de contrat.
   Dépend  : services-data.js (chargé avant) pour les intitulés.
   API     : window.MaDemande : ajouter / retirer / vider / contient / liste
                                formuleRetenue / remplacement / etape
                                ouvrir / fermer / on(callback)
   Option  : window.MA_DEMANDE_SANS_UI = true avant chargement pour n'avoir
             que la couche de données, sans bouton flottant ni panneau.
   ===================================================================== */

window.MaDemande = (function () {
  'use strict';

  var CLE = 'socomec.maDemande';

  /* Chemin racine du parcours, déduit du src de ce script : une page détail
     sous site/services/ charge « ../assets/ma-demande.js ». */
  var BASE = (function () {
    var s = document.currentScript;
    if (!s) return '';
    var m = s.getAttribute('src').match(/^(.*?)assets\/ma-demande\.js/);
    return m ? m[1] : '';
  })();

  var ecouteurs = [];
  /* Dernier remplacement de formule, pour l'annoncer dans le panneau. */
  var remplacement = null;
  /* Lu tout de suite (et non dans init) : les pages consommatrices
     interrogent liste()/contient() avant DOMContentLoaded. */
  var ids = lire();
  var el = {};              /* noeuds du composant, remplis à l'init */
  var dernierFocus = null;

  /* ---------------------------------------------------------------- état */

  function lire() {
    try {
      var brut = sessionStorage.getItem(CLE);
      var v = brut ? JSON.parse(brut) : [];
      return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }) : [];
    } catch (e) { return []; }          /* sessionStorage bloqué : mode volatile */
  }

  function ecrire() {
    try { sessionStorage.setItem(CLE, JSON.stringify(ids)); } catch (e) { /* volatile */ }
  }

  function service(id) {
    var d = window.SERVICES_DATA;
    if (!d) return null;
    for (var i = 0; i < d.services.length; i++) {
      if (d.services[i].id === id) return d.services[i];
    }
    return null;
  }

  /* `categorie` est un identifiant depuis la refonte 0.5.5 : le referentiel
     rend l'intitule. Repli sur l'identifiant si la page n'a pas charge les
     donnees (archives anterieures). */
  function nomCategorie(id) {
    var d = window.SERVICES_DATA;
    return (d && d.nomCategorie) ? d.nomCategorie(id) : (id || '');
  }

  function notifier() {
    ecrire();
    rendre();
    ecouteurs.forEach(function (cb) { cb(ids.slice()); });
  }

  /* ------------------------------------------------------------- actions */

  function contient(id) { return ids.indexOf(id) !== -1; }

  /* Selection unique pour les formules de contrat : retenir Gold quand Silver
     etait coche remplace Silver au lieu de cumuler. Cumuler etait autorise par
     la spec, mais illisible pour l'utilisateur ; l'expert orientera vers une
     autre formule si besoin (retour client du 2026-08-19). */
  function ajouter(id) {
    remplacement = null;
    if (contient(id)) return false;      /* anti-doublon (EF-004 / recit 2 sc. 4) */
    var entrant = service(id);
    if (entrant && entrant.formule) {
      for (var i = ids.length - 1; i >= 0; i--) {
        var sortant = service(ids[i]);
        if (sortant && sortant.formule) {
          remplacement = { ancien: sortant.nom, nouveau: entrant.nom };
          ids.splice(i, 1);              /* splice direct : pas de notification intermediaire */
        }
      }
    }
    ids.push(id);
    notifier();
    return true;
  }

  function retirer(id) {
    remplacement = null;
    var i = ids.indexOf(id);
    if (i === -1) return false;
    ids.splice(i, 1);
    notifier();
    return true;
  }

  function vider() {
    remplacement = null;
    if (!ids.length) return false;
    ids = [];
    notifier();
    return true;
  }

  /* Formule de contrat actuellement retenue, s'il y en a une. La selection
     etant unique, il y en a au plus une. */
  function formuleRetenue() {
    for (var i = 0; i < ids.length; i++) {
      var s = service(ids[i]);
      if (s && s.formule) return s;
    }
    return null;
  }


  /* ==================================================================
     TUNNEL DE DEMANDE DANS LE PANNEAU
     Modele repris de site/archives/powerlease.html : conseiller incarne,
     liste des services, CTA d'etape et reassurance toujours visibles.
     Trois etapes : 1 selection, 2 email, 3 informations complementaires,
     puis l'ecran de confirmation. Retour de revue du 2026-08-19 : ouvrir
     une page pleine annulait la rapidite du drawer.
     La page devis.html reste disponible comme variante, accessible depuis
     le pied du panneau et depuis le pied de page.
     ================================================================== */
  var etape = 1;                 /* 1, 2 ou 3 */
  var envoye = false;

  /* Mode contact expert (ticket 002). Il REMPLACE le contenu du drawer sans
     toucher a l'etat de la demande de devis : on peut en revenir et retrouver
     sa selection intacte. Le contact ne consomme pas la demande. */
  var contact = { actif: false, envoye: false };
  var saisieContact = { email: '', objet: '', detail: '' };
  var fautesContact = {};
  var saisie = { email: '', nom: '', societe: '', fonction: '', tel: '', message: '' };
  var recapEnvoi = [];           /* capture avant vidage de la selection */
  var fautes = {};

  var CONSEILLER = {
    1: "Dites-moi ce qui vous intéresse, je m'occupe de faire chiffrer.",
    2: "Votre e-mail professionnel suffit pour commencer.",
    3: "Encore deux informations et je transmets à l'expert de votre région.",
    envoye: "C'est transmis. Un expert de votre région vous répond sous 24 heures ouvrées.",
    contact: "Dites-moi ce qui vous amène, je vous mets en relation avec le bon expert.",
    contactEnvoye: "C'est transmis. Un expert de votre région vous répond sous 24 heures ouvrées."
  };

  function echapper(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function emailValide(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }

  function ligneReassurance(chemin, texte) {
    return '<div class="md-reas-l"><svg viewBox="0 0 24 24" aria-hidden="true">' + chemin +
           '</svg><span>' + texte + '</span></div>';
  }

  /* Une ligne de la liste des services. `lecture` retire le bouton
     « Retirer » : c'est l'affichage replie des etapes de coordonnees. */
  function ligneService(id, lecture) {
    var s = service(id);
    var nom = s ? s.nom : id;
    /* `categorie` est un identifiant depuis la refonte 0.5.5. */
    var meta = s ? nomCategorie(s.categorie) : '';
    return '<li class="md-item"><div class="md-item-txt">' +
      '<span class="md-nom">' + echapper(nom) + '</span>' +
      (meta ? '<span class="md-gammes">' + echapper(meta) + '</span>' : '') + '</div>' +
      (lecture ? '' :
        '<button type="button" class="md-retirer" data-id="' + echapper(id) + '">Retirer' +
        '<span class="md-sr"> ' + echapper(nom) + '</span></button>') + '</li>';
  }

  function rendre() {
    if (!el.panneau) return;
    var n = ids.length;

    el.compteurFab.textContent = n;
    el.compteurPanneau.textContent = n;
    el.fab.setAttribute('aria-label', n === 0
      ? 'Ma demande, aucun service sélectionné'
      : 'Ma demande, ' + n + (n === 1 ? ' service sélectionné' : ' services sélectionnés'));

    if (contact.actif) { rendreContact(); return; }

    /* Retour du mode contact : on remet l'en-tete de la demande. */
    el.titre.textContent = 'Ma demande';
    el.compteurPanneau.hidden = false;

    /* Conseiller : pleine taille a l'etape 1 et sur la confirmation */
    el.conseiller.classList.toggle('compact', !(etape === 1 || envoye));
    el.conseillerMsg.textContent = envoye ? CONSEILLER.envoye : CONSEILLER[etape];

    /* ---------------------------------------------------------- corps */
    var corps = '';

    if (envoye) {
      corps += '<div class="md-envoye">' +
        '<div class="md-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="5,13 10,18 19,7"></polyline></svg></div>' +
        '<div class="md-envoye-t">Votre demande est transmise</div>' +
        '<div class="md-envoye-d">Un expert SOCOMEC vous recontacte à ' + echapper(saisie.email) +
        ' pour préciser votre besoin et finaliser le chiffrage.</div></div>';
      if (recapEnvoi.length) {
        corps += '<div class="md-recap"><div class="md-recap-k">CE QUE NOUS AVONS RETENU</div>' +
          recapEnvoi.map(function (nom) {
            return '<div class="md-recap-l">' + echapper(nom) + '</div>';
          }).join('') + '</div>';
      }
      if (saisie.message) {
        corps += '<div class="md-recap"><div class="md-recap-k">VOTRE MESSAGE</div>' +
                 '<div class="md-recap-libre">' + echapper(saisie.message) + '</div></div>';
      }
    } else {
      /* Remplacement de formule : signale a l'etape 1 */
      if (remplacement && etape === 1) {
        corps += '<div class="md-avis"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="5,13 10,18 19,7"></polyline></svg>' +
          '<span>' + echapper(remplacement.nouveau) + ' remplace ' + echapper(remplacement.ancien) +
          ' : une seule formule de contrat à la fois.</span></div>';
      }

      if (n) {
        /* Aux etapes de coordonnees la liste se replie (0011 D4) : elle a
           deja ete validee, et deployee elle repoussait les champs sous la
           ligne de flottaison. Repliee elle reste consultable, en lecture :
           on ne retire pas un service au moment de laisser ses coordonnees,
           on revient a l'etape 1 pour cela. */
        var lecture = etape !== 1;
        var items = ids.map(function (id) { return ligneService(id, lecture); }).join('');
        corps += lecture
          ? '<details class="md-panier"><summary class="md-panier-t">' +
            n + (n === 1 ? ' service dans votre demande' : ' services dans votre demande') +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="6,9 12,15 18,9"></polyline></svg>' +
            '</summary><ul class="md-liste">' + items + '</ul></details>'
          : '<ul class="md-liste">' + items + '</ul>';
      } else {
        /* L'etat vide ne doit pas etre un cul-de-sac : il ouvre sur le
           contact expert (ticket 002, R1). */
        corps += '<p class="md-vide">Votre demande est vide. Parcourez le catalogue et ajoutez ' +
                 'les services qui vous intéressent. Vous pourrez aussi formuler une demande libre.</p>' +
                 '<div class="md-ou"><span>ou</span></div>' +
                 '<div class="md-cta md-cta-corps">' +
                 '<button type="button" class="md-btn md-continue" id="md-contact">Contactez un expert</button>' +
                 '</div>';
      }

      if (etape === 2) {
        corps += '<div class="md-etape"><div class="md-etape-t">Laissez-nous votre e-mail, nous préparons votre devis.</div>' +
          '<div class="md-etape-d">Votre e-mail professionnel pour commencer, le reste vient ensuite.</div>' +
          champ({ id:'md-email', libelle:'E-mail professionnel', type:'email', requis:true,
                  auto:'email', exemple:'nom@societe.fr',
                  valeur:saisie.email, faute:fautes.email }) + '</div>';
      }

      if (etape === 3) {
        corps += '<div class="md-etape">' +
          '<div class="md-email-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="5,13 10,18 19,7"></polyline></svg>' +
          '<span class="md-em">' + echapper(saisie.email) + '</span>' +
          '<button type="button" class="md-modif" id="md-modif-email">Modifier</button></div>' +
          '<div class="md-etape-t">Encore quelques informations et c\'est parti.</div>' +
          champ({ id:'md-nom', libelle:'Nom et prénom', type:'text', requis:true,
                  auto:'name', valeur:saisie.nom, faute:fautes.nom }) +
          champ({ id:'md-societe', libelle:'Société', type:'text', requis:true,
                  auto:'organization', valeur:saisie.societe, faute:fautes.societe }) +
          champ({ id:'md-fonction', libelle:'Fonction occupée', type:'text',
                  auto:'organization-title', exemple:'Responsable maintenance',
                  valeur:saisie.fonction }) +
          champ({ id:'md-tel', libelle:'Téléphone', type:'tel',
                  auto:'tel', valeur:saisie.tel }) +
          champ({ id:'md-message', libelle:'Précisions', type:'zone',
                  exemple:'Équipements concernés, échéance...',
                  valeur:saisie.message }) + '</div>';
      }
    }
    /* CTA d'etape : TOUJOURS dans le corps, a la suite de ce qui le precede.
       Modele de site/archives/powerlease-pim.html. A l'etape 1 il suit la
       liste des services, aux etapes 2 et 3 le dernier champ. L'ancrer en
       pied obligeait a faire l'aller-retour entre le haut et le bas du
       panneau (revues 0.2.0 et 0.3.0). */
    if (!envoye) {
      if (etape === 1) {
        /* Demande vide : c'est le bouton de contact qui porte l'action, le CTA
           devis desactive ferait doublon (ticket 002, R1). */
        if (n) {
          corps += '<div class="md-cta md-cta-corps"><button type="button" class="md-btn md-devis" ' +
                   'id="md-go-2">Demander mon devis</button></div>';
        }
      } else if (etape === 2) {
        corps += '<div class="md-cta md-cta-corps"><button type="button" class="md-btn md-continue" id="md-go-3">Continuer</button></div>';
      } else {
        corps += '<div class="md-cta md-cta-corps"><button type="button" class="md-btn md-devis" id="md-envoyer">Envoyer ma demande</button></div>';
      }
    }
    el.corps.innerHTML = corps;

    /* ----------------------------------------------------------- pied */
    var pied = '';
    if (!envoye) {
      pied += '<div class="md-reas">' +
        ligneReassurance('<path d="M12 3l7 3v5c0 4.8-3.2 7.7-7 9-3.8-1.3-7-4.2-7-9V6z"></path>',
                         "Sans engagement : un expert valide le périmètre avec vous.") +
        ligneReassurance('<circle cx="12" cy="12" r="9"></circle><polyline points="12,7 12,12 16,14"></polyline>',
                         "Réponse sous 24 heures ouvrées.") +
        ligneReassurance('<circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"></path>',
                         "Un interlocuteur SOCOMEC dédié, de l'étude à l'intervention.") +
        '</div>';
      if (etape === 1) {
        pied += '<p class="md-alt"><a href="' + BASE + 'devis.html">Ou passer par le formulaire complet</a></p>';
      }
      if (n && etape === 1) {
        pied += '<button type="button" class="md-vider">Vider ma demande</button>';
      }
    } else {
      pied += '<div class="md-cta"><button type="button" class="md-btn md-continue" id="md-fermer-fin">Revenir au catalogue</button></div>';
    }
    el.pied.innerHTML = pied;
    cablerPied();
  }

  /* ==================================================================
     CONTACT EXPERT (ticket 002, R2)
     Le formulaire remplace le contenu du drawer. L'etat de la demande de
     devis n'est pas touche : le retour arriere le restitue tel quel, et
     l'envoi ne vide pas la selection, un contact n'etant pas un devis.
     ================================================================== */
  /* Fabrique de champ commune aux deux formulaires du drawer (contact et
     tunnel devis, D13). Motif pose en 0.5.2 : libelle visible, aria-required
     sur les requis, aria-invalid et aria-describedby en erreur. Le placeholder
     n'est qu'un exemple de saisie, jamais le seul porteur de l'information.
       o = { id, libelle, type: 'text'|'email'|'tel'|'zone', valeur, faute,
             requis, auto, exemple } */
  function champ(o) {
    var attrs = (o.requis ? ' aria-required="true"' : '') +
                (o.auto ? ' autocomplete="' + o.auto + '"' : '') +
                (o.exemple ? ' placeholder="' + echapper(o.exemple) + '"' : '') +
                (o.faute ? ' aria-invalid="true" aria-describedby="' + o.id + '-err"' : '');
    var balise = o.type === 'zone'
      ? '<textarea class="md-fld md-area" id="' + o.id + '"' + attrs + '>' +
        echapper(o.valeur) + '</textarea>'
      : '<input class="md-fld" id="' + o.id + '" type="' + o.type + '" value="' +
        echapper(o.valeur) + '"' + attrs + '>';
    return '<div class="md-champ"><label class="md-lbl" for="' + o.id + '">' + o.libelle +
           (o.requis ? '' : ' <span class="md-opt">(facultatif)</span>') + '</label>' + balise +
           (o.faute ? '<p class="md-err" id="' + o.id + '-err">' + o.faute + '</p>' : '') + '</div>';
  }

  function rendreContact() {
    el.titre.textContent = 'Contacter un expert';
    el.compteurPanneau.hidden = true;
    el.conseiller.classList.toggle('compact', !contact.envoye);
    el.conseillerMsg.textContent = contact.envoye ? CONSEILLER.contactEnvoye : CONSEILLER.contact;

    var corps = '', pied = '';

    if (contact.envoye) {
      corps += '<div class="md-envoye">' +
        '<div class="md-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="5,13 10,18 19,7"></polyline></svg></div>' +
        '<div class="md-envoye-t">Votre demande de contact est transmise</div>' +
        '<div class="md-envoye-d">Un expert SOCOMEC vous recontacte à ' + echapper(saisieContact.email) +
        '. Votre demande de devis en cours est conservée.</div></div>';
      if (saisieContact.objet) {
        corps += '<div class="md-recap"><div class="md-recap-k">OBJET</div>' +
                 '<div class="md-recap-l">' + echapper(saisieContact.objet) + '</div></div>';
      }
      if (saisieContact.detail) {
        corps += '<div class="md-recap"><div class="md-recap-k">VOTRE DEMANDE</div>' +
                 '<div class="md-recap-libre">' + echapper(saisieContact.detail) + '</div></div>';
      }
      pied += '<div class="md-cta"><button type="button" class="md-btn md-continue" id="mdc-retour-fin">' +
              'Revenir à ma demande</button></div>';
    } else {
      corps += '<div class="md-retour-rang">' +
        '<button type="button" class="md-retour" id="mdc-retour">Revenir à ma demande</button></div>' +
        '<p class="md-etape-d">Décrivez votre besoin : un expert de votre région vous rappelle. ' +
        'Les trois champs lui servent à préparer son appel. ' +
        'Ce n\'est pas une commande, et cela ne consomme pas votre demande de devis.</p>' +
        champ({ id:'mdc-email', libelle:'E-mail professionnel', type:'email', requis:true,
                auto:'email', valeur:saisieContact.email, faute:fautesContact.email }) +
        champ({ id:'mdc-objet', libelle:'Objet de la demande', type:'text', requis:true,
                valeur:saisieContact.objet, faute:fautesContact.objet }) +
        champ({ id:'mdc-detail', libelle:'Détail de la demande', type:'zone', requis:true,
                valeur:saisieContact.detail, faute:fautesContact.detail }) +
        '<div class="md-cta md-cta-corps">' +
        '<button type="button" class="md-btn md-devis" id="mdc-envoyer">Envoyer ma demande</button></div>';
      pied += '<div class="md-reas">' +
        ligneReassurance('<path d="M12 3l7 3v5c0 4.8-3.2 7.7-7 9-3.8-1.3-7-4.2-7-9V6z"></path>',
                         "Sans engagement : un expert vous rappelle pour comprendre votre besoin.") +
        ligneReassurance('<circle cx="12" cy="12" r="9"></circle><polyline points="12,7 12,12 16,14"></polyline>',
                         "Réponse sous 24 heures ouvrées.") +
        '</div>';
    }

    el.corps.innerHTML = corps;
    el.pied.innerHTML = pied;
    cablerContact();
  }

  /* On ne retombe sur la valeur precedente que si le champ n'est pas a l'ecran.
     Un champ present mais vide doit rester vide, sinon le vider ne servirait a
     rien et la validation passerait sur une valeur fantome. */
  function memoriserContact() {
    ['email', 'objet', 'detail'].forEach(function (k) {
      var e = el.panneau.querySelector('#mdc-' + k);
      if (e) saisieContact[k] = e.value;
    });
  }

  /* D16 : capte ce qui est a l'ecran, quel que soit le formulaire affiche.
     Appelee avant CHAQUE bascule et avant chaque fermeture : c'est le dernier
     moment ou l'on sait encore ce que l'utilisateur avait tape. Jusqu'ici
     seul « Envoyer » memorisait le contact, donc la croix, Echap, le retour
     et le bouton flottant perdaient la saisie, alors que le tunnel devis la
     gardait depuis la 0.5.6.
     Les deux fonctions appelees ne lisent que les champs presents a l'ecran
     (regle D12) : sur une confirmation ou sur la liste, c'est sans effet. */
  function memoriserAffichage() {
    if (contact.actif) memoriserContact();
    else               memoriserEcran();
  }

  function cablerContact() {
    function sur(id, fn) { var e = el.panneau.querySelector(id); if (e) e.onclick = fn; }

    sur('#mdc-retour', function () { quitterContact(); });
    sur('#mdc-retour-fin', function () { quitterContact(); });

    sur('#mdc-envoyer', function () {
      memoriserContact();
      fautesContact = {};
      if (!saisieContact.email.trim()) {
        fautesContact.email = "Indiquez votre e-mail professionnel : c'est par là que l'expert vous répondra.";
      } else if (!emailValide(saisieContact.email)) {
        fautesContact.email = "Cette adresse semble incomplète. Vérifiez le format : nom@societe.fr";
      }
      if (!saisieContact.objet.trim()) {
        fautesContact.objet = "Indiquez l'objet de votre demande, en quelques mots.";
      }
      if (!saisieContact.detail.trim()) {
        fautesContact.detail = "Décrivez votre besoin : c'est ce qui permet à l'expert de préparer son appel.";
      }
      var premiereFaute = ['email', 'objet', 'detail'].filter(function (k) { return fautesContact[k]; })[0];
      if (premiereFaute) {
        rendreContact();                       /* la saisie est conservee */
        var c = el.panneau.querySelector('#mdc-' + premiereFaute);
        if (c) c.focus();
        return;
      }
      /* Envoi simule. La selection n'est PAS videe : un contact n'est pas un devis. */
      contact.envoye = true;
      rendreContact();
      el.corps.scrollTop = 0;
    });
  }

  function ouvrirContact() {
    memoriserAffichage();
    contact.actif = true;
    contact.envoye = false;
    fautesContact = {};
    rendre();
    var c = el.panneau.querySelector('#mdc-email');
    if (c) c.focus();
  }

  function quitterContact() {
    memoriserAffichage();
    /* Une confirmation vue est une demande consommee : la suivante repart
       vierge. Le reset doit etre ICI, quitterContact() remettant `envoye` a
       faux avant qu'ouvrirContact() puisse le constater. */
    if (contact.envoye) saisieContact = { email: '', objet: '', detail: '' };
    contact.actif = false;
    contact.envoye = false;
    fautesContact = {};
    rendre();
    el.fermer.focus();
  }

  /* Les commandes du pied et des etapes sont regenerees a chaque rendu. */
  function cablerPied() {
    function sur(id, fn) { var e = el.panneau.querySelector(id); if (e) e.onclick = fn; }

    sur('#md-go-2', function () {
      if (!ids.length) return;
      etape = 2; fautes = {}; remplacement = null;
      rendre();
      var c = el.panneau.querySelector('#md-email'); if (c) c.focus();
    });

    sur('#md-go-3', function () {
      var c = el.panneau.querySelector('#md-email');
      saisie.email = c ? c.value : '';
      if (!saisie.email.trim()) fautes.email = "Indiquez votre e-mail professionnel : c'est par là que l'expert vous répondra.";
      else if (!emailValide(saisie.email)) fautes.email = "Cette adresse semble incomplète. Vérifiez le format : nom@societe.fr";
      else fautes.email = null;
      if (fautes.email) { rendre(); el.panneau.querySelector('#md-email').focus(); return; }
      etape = 3; fautes = {};
      rendre();
      var f = el.panneau.querySelector('#md-nom'); if (f) f.focus();
    });

    sur('#md-modif-email', function () {
      memoriserEcran();
      etape = 2; fautes = {};
      rendre();
      var c = el.panneau.querySelector('#md-email'); if (c) c.focus();
    });

    sur('#md-envoyer', function () {
      memoriserEcran();
      fautes = {};
      if (!saisie.nom.trim()) fautes.nom = "Indiquez votre nom, pour que l'expert sache à qui il s'adresse.";
      if (!saisie.societe.trim()) fautes.societe = "Indiquez votre société.";
      if (fautes.nom || fautes.societe) {
        rendre();
        var premier = el.panneau.querySelector('[aria-invalid="true"]');
        if (premier) premier.focus();
        return;
      }
      /* Envoi simule : on capture le recapitulatif AVANT de vider (EF-008). */
      recapEnvoi = ids.map(function (id) { var s = service(id); return s ? s.nom : id; });
      envoye = true;
      ids = [];
      ecrire();
      rendre();
      ecouteurs.forEach(function (cb) { cb([]); });
      el.corps.scrollTop = 0;
    });

    sur('#md-fermer-fin', function () {
      envoye = false; etape = 1;
      saisie = { email: '', nom: '', societe: '', fonction: '', tel: '', message: '' };
      recapEnvoi = [];
      fermer();
      rendre();
    });

    sur('#md-contact', function () { ouvrirContact(); });

    var v = el.panneau.querySelector('.md-vider');
    if (v) v.onclick = function () { vider(); el.fermer.focus(); };
  }

  /* Capture ce qui est A L'ECRAN, quelle que soit l'etape. Appelee avant
     chaque changement d'etape et avant le retour a la liste de D14 : sans
     elle, un nom tape puis jamais valide disparaitrait a la reouverture, et
     D14 ferait perdre la saisie qu'elle promet de garder.
     D12 : on ne lit que les champs presents, jamais de repli sur la valeur
     precedente. Un champ requis rempli puis vide doit echouer a la
     validation, pas passer sur une valeur invisible. */
  function memoriserEcran() {
    ['email', 'nom', 'societe', 'fonction', 'tel', 'message'].forEach(function (k) {
      var e = el.panneau.querySelector('#md-' + k);
      if (e) saisie[k] = e.value;
    });
  }

  /* ------------------------------------------------------- ouverture UI */

  function focusables() {
    return Array.prototype.filter.call(
      el.panneau.querySelectorAll('button, [href], input, textarea, select'),
      function (n) { return !n.hidden && n.offsetParent !== null && !n.disabled; }
    );
  }

  function ouvrir() {
    if (!el.panneau) return;
    if (el.panneau.classList.contains('is-open')) return;
    var aRendre = false;

    /* La capture passe avant toute bascule : apres, le corps du panneau est
       refait et ce qui etait tape n'existe plus. */
    memoriserAffichage();

    /* Le bouton flottant porte « Ma demande » : il ouvre toujours la demande,
       jamais le formulaire de contact laisse ouvert a la fermeture precedente. */
    if (contact.actif) {
      if (contact.envoye) saisieContact = { email: '', objet: '', detail: '' };
      contact.actif = false; contact.envoye = false; aRendre = true;
    }

    /* D14 : le drawer rouvre sur la LISTE, d'ou que l'utilisateur soit parti.
       On capte d'abord ce qui etait affiche : le retour a l'etape 1 refait le
       corps du panneau, et un champ tape mais pas encore valide serait perdu.
       Quitter en etape 2 ou 3 puis revenir par « Ma demande » le ramenait au
       formulaire, alors que le bouton annonce sa demande.
       La saisie survit a une sortie en cours de tunnel : on la retrouve en
       re-avancant. Une confirmation vue, elle, est une demande consommee et
       repart vierge, comme le formulaire de contact depuis 0.5.2 ; sans quoi
       les deux sorties de la confirmation (« Revenir au catalogue » d'un cote,
       Echap ou la croix de l'autre) ne donneraient pas le meme etat. */
    if (envoye) {
      saisie = { email: '', nom: '', societe: '', fonction: '', tel: '', message: '' };
      recapEnvoi = [];
    }
    if (envoye || etape !== 1) {
      envoye = false;
      etape = 1;
      fautes = {};
      aRendre = true;
    }

    if (aRendre) { rendre(); el.corps.scrollTop = 0; }
    dernierFocus = document.activeElement;
    el.panneau.classList.add('is-open');
    el.panneau.removeAttribute('inert');
    el.scrim.classList.add('is-open');
    document.body.classList.add('md-open');
    el.fermer.focus();
  }

  function fermer() {
    if (!el.panneau) return;
    if (!el.panneau.classList.contains('is-open')) return;
    /* D16 : la croix et Echap sortent sans passer par aucun bouton d'etape. */
    memoriserAffichage();
    el.panneau.classList.remove('is-open');
    el.panneau.setAttribute('inert', '');
    el.scrim.classList.remove('is-open');
    document.body.classList.remove('md-open');
    if (dernierFocus && dernierFocus.focus) dernierFocus.focus();
    else el.fab.focus();
  }

  /* ---------------------------------------------------------------- init */

  var CSS = [
    '.md-fab{position:fixed;right:0;bottom:16%;z-index:50;display:flex;flex-direction:column;align-items:center;gap:14px;',
    'background:var(--jaune,#FFCC00);color:var(--ink,#1E1E1C);padding:20px 12px;border:none;border-radius:6px 0 0 6px;',
    'box-shadow:-6px 10px 30px rgba(0,31,63,.3);cursor:pointer;font:inherit}',
    '.md-fab:hover{filter:brightness(.96)}',
    'body.md-open .md-fab{display:none}',
    '.md-fab svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.5}',
    '.md-badge{width:26px;height:26px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;',
    'font:700 12px var(--sans,Arial,sans-serif);background:var(--ink,#1E1E1C);color:var(--jaune,#FFCC00)}',
    '.md-fab-lbl{writing-mode:vertical-rl;font:700 12px var(--title,Arial,sans-serif);letter-spacing:.18em;text-transform:uppercase}',
    '.md-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}',
    /* scrim mobile uniquement, comme en v1 */
    '.md-scrim{position:fixed;inset:0;z-index:58;background:rgba(12,24,40,.4);display:none}',
    '.md-scrim.is-open{display:block}',
    '@media(min-width:992px){.md-scrim{display:none!important}}',
    /* bottom-sheet puis drawer */
    '.md-panneau{position:fixed;left:0;right:0;bottom:0;z-index:60;background:#fff;display:none;flex-direction:column;',
    'height:82dvh;box-shadow:0 -18px 50px rgba(0,31,63,.3)}',
    '.md-panneau.is-open{display:flex}',
    /* Sous 576px le drawer prend toute la hauteur visible (0011 D4) : en
       bottom-sheet a 82dvh, les champs des etapes 2 et 3 tombaient sous la
       ligne de flottaison des que le clavier virtuel s'ouvrait. Repli en vh
       pour les navigateurs sans dvh. Le bouton flottant est masque tant que
       le panneau est ouvert : il ne recouvre rien. */
    '@media(max-width:575px){.md-panneau{height:100vh;height:100dvh}}',
    '@media(min-width:992px){.md-panneau{left:auto;right:0;top:0;bottom:0;width:460px;max-width:94vw;height:100%;',
    'box-shadow:-18px 0 50px rgba(0,31,63,.25)}}',
    '.md-grab{display:flex;justify-content:center;padding:10px 0 2px;flex-shrink:0}',
    '.md-grab i{width:38px;height:4px;border-radius:100px;background:var(--line-2,#C9D3E0)}',
    '@media(min-width:992px){.md-grab{display:none}}',
    '.md-head{display:flex;align-items:center;gap:10px;padding:10px 20px 14px;border-bottom:1px solid var(--line,#E2E5EB);flex-shrink:0}',
    '@media(min-width:992px){.md-head{padding:18px 24px}}',
    '.md-head h2{margin:0;font:600 17px var(--title,Arial,sans-serif);color:var(--ink,#1E1E1C)}',
    '.md-count{width:24px;height:24px;border-radius:50%;background:var(--bleu,#004F9E);color:#fff;display:flex;',
    'align-items:center;justify-content:center;font:700 12px var(--sans,Arial,sans-serif)}',
    '.md-fermer{margin-left:auto;width:34px;height:34px;display:flex;align-items:center;justify-content:center;',
    'cursor:pointer;color:var(--ink-3,#686864);border:none;background:none}',
    '.md-fermer:hover{background:var(--gris-bg,#F0F3F9);color:var(--ink,#1E1E1C)}',
    '.md-fermer svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2}',
    /* conseiller incarne, present des l'etape 1 (modele v1) */
    '.md-conseiller{display:flex;align-items:center;gap:10px;padding:12px 20px;border-bottom:1px solid var(--line,#E2E5EB);flex-shrink:0}',
    '@media(min-width:992px){.md-conseiller{padding:14px 24px}}',
    '.md-conseiller .av{flex-shrink:0;width:40px;height:40px;overflow:hidden;transition:width .25s,height .25s}',
    '.md-conseiller .av img{width:100%;height:100%;object-fit:cover;display:block}',
    '.md-conseiller.compact{padding-top:8px;padding-bottom:8px}',
    '.md-conseiller.compact .av{width:28px;height:28px}',
    '@media(min-width:992px){.md-conseiller .av,.md-conseiller.compact .av{width:44px;height:44px}}',
    '.md-a-nom{font:600 13px var(--title,Arial,sans-serif);color:var(--ink,#1E1E1C)}',
    '.md-a-msg{font:400 11.5px/1.45 var(--sans,Arial,sans-serif);color:var(--ink-3,#686864);margin-top:1px}',
    '@media(min-width:992px){.md-a-nom{font-size:13.5px}.md-a-msg{font-size:12px}}',
    '.md-body{overflow-y:auto;flex:1;min-height:0;padding:4px 20px}',
    '@media(min-width:992px){.md-body{padding:6px 24px}}',
    /* liste des services retenus */
    '.md-liste{list-style:none;margin:0;padding:0}',
    '.md-item{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--gris-bg,#F0F3F9)}',
    '.md-item-txt{flex:1;min-width:0}',
    '.md-nom{display:block;font:500 13.5px var(--sans,Arial,sans-serif);color:var(--ink,#1E1E1C)}',
    '.md-gammes{display:block;font:400 11.5px var(--sans,Arial,sans-serif);color:var(--ink-4,#9AA1AB);margin-top:1px}',
    '.md-retirer{border:none;background:none;cursor:pointer;font:400 12px var(--sans,Arial,sans-serif);',
    'color:var(--ink-3,#686864);text-decoration:underline;padding:4px;flex-shrink:0}',
    '.md-retirer:hover{color:var(--ink,#1E1E1C)}',
    /* Panier replie des etapes de coordonnees (0011 D4) */
    '.md-panier-t{min-height:44px;display:flex;align-items:center;gap:10px;cursor:pointer;',
    'list-style:none;font:500 13px var(--sans,Arial,sans-serif);color:var(--ink-2,#4A4A47)}',
    '.md-panier-t::-webkit-details-marker{display:none}',
    '.md-panier-t:hover{color:var(--ink,#1E1E1C)}',
    '.md-panier-t:focus-visible{outline:3px solid var(--bleu-lien,#0070C0);outline-offset:2px}',
    '.md-panier-t svg{width:13px;height:13px;margin-left:auto;flex-shrink:0;',
    'fill:none;stroke:currentColor;stroke-width:2.5}',
    '.md-panier[open] .md-panier-t svg{transform:rotate(180deg)}',
    '.md-panier .md-item{padding:8px 0;border-bottom:none}',
    '.md-panier .md-liste{padding-bottom:6px}',
    '.md-vide{font:400 13.5px/1.6 var(--sans,Arial,sans-serif);color:var(--ink-3,#686864);padding:14px 0}',
    /* Separateur « ou » de l'etat vide (ticket 002, R1) */
    '.md-ou{display:flex;align-items:center;gap:12px;margin:4px 0 14px;',
    'font:600 11px var(--title,Arial,sans-serif);letter-spacing:.1em;text-transform:uppercase;',
    'color:var(--ink-4,#9AA1AB)}',
    '.md-ou::before,.md-ou::after{content:"";flex:1;height:1px;background:var(--line,#E2E5EB)}',
    /* Formulaire de contact : libelles visibles, pas de placeholder seul */
    '.md-champ{margin-bottom:4px}',
    '.md-lbl{display:block;font:500 13px var(--sans,Arial,sans-serif);color:var(--ink-2,#4A4A47);margin-bottom:6px}',
    '.md-opt{font:400 12px var(--sans,Arial,sans-serif);color:var(--ink-3,#686864)}',
    '.md-retour-rang{padding:10px 0 2px}',
    '.md-retour{min-height:44px;border:none;background:none;cursor:pointer;padding:4px 0;',
    'font:500 13px var(--sans,Arial,sans-serif);color:var(--bleu-lien,#0070C0);text-decoration:underline}',
    '.md-retour:hover{color:var(--bleu,#004F9E)}',
    '.md-btn{min-height:44px}',
    /* avis de remplacement de formule */
    '.md-avis{display:flex;gap:8px;align-items:flex-start;background:var(--tint,#EAF4FC);color:var(--bleu,#004F9E);',
    'font:500 12.5px/1.5 var(--sans,Arial,sans-serif);padding:10px 12px;margin:10px 0}',
    '.md-avis svg{width:14px;height:14px;flex-shrink:0;margin-top:2px;fill:none;stroke:currentColor;stroke-width:2.5}',
    /* blocs d etape */
    '.md-etape{border-top:1px solid var(--line,#E2E5EB);margin-top:16px;padding-top:18px}',
    '.md-etape-t{font:600 14px var(--title,Arial,sans-serif);color:var(--ink,#1E1E1C);margin-bottom:5px}',
    '.md-etape-d{font:400 12.5px/1.5 var(--sans,Arial,sans-serif);color:var(--ink-3,#686864);margin-bottom:12px}',
    '.md-fld{width:100%;box-sizing:border-box;height:48px;border:1px solid var(--line-2,#C9D3E0);padding:0 14px;',
    'font:400 14px var(--sans,Arial,sans-serif);color:var(--ink,#1E1E1C);outline:none;margin-bottom:10px;background:#fff}',
    /* Champ en focus : contour net de 2px, sans rectangle detache (revue 0.2.0).
       L'epaisseur passe par une ombre interne, aucun voisin n'est decale. */
    '.md-fld:focus{outline:none;border-color:var(--bleu-lien,#0070C0);box-shadow:inset 0 0 0 1px var(--bleu-lien,#0070C0)}',
    '.md-fld[aria-invalid="true"]{border-color:#C0281E;background:#FFF8F7}',
    '.md-area{height:80px;padding:12px 14px;resize:vertical;line-height:1.55}',
    '.md-err{font:400 12.5px/1.45 var(--sans,Arial,sans-serif);color:#C0281E;margin:-4px 0 12px}',
    '.md-email-ok{display:flex;align-items:center;gap:8px;margin-bottom:14px;font:400 13px var(--sans,Arial,sans-serif);color:var(--ink-3,#686864)}',
    '.md-email-ok svg{width:14px;height:14px;fill:none;stroke:var(--bleu,#004F9E);stroke-width:2.5;flex-shrink:0}',
    '.md-em{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.md-modif{border:none;background:none;padding:0;cursor:pointer;font:500 13px var(--sans,Arial,sans-serif);',
    'color:var(--bleu-lien,#0070C0);text-decoration:underline;flex-shrink:0}',
    /* ecran de confirmation */
    '.md-envoye{text-align:center;padding:22px 0 4px}',
    '.md-ok{width:44px;height:44px;border-radius:50%;background:var(--tint,#EAF4FC);display:flex;align-items:center;',
    'justify-content:center;margin:0 auto 12px}',
    '.md-ok svg{width:20px;height:20px;fill:none;stroke:var(--bleu,#004F9E);stroke-width:2.5}',
    '.md-envoye-t{font:600 16px var(--title,Arial,sans-serif);color:var(--ink,#1E1E1C);margin-bottom:5px}',
    '.md-envoye-d{font:400 13px/1.6 var(--sans,Arial,sans-serif);color:var(--ink-3,#686864)}',
    '.md-recap{margin-top:20px}',
    '.md-recap-k{font:800 10.5px var(--title,Arial,sans-serif);letter-spacing:.1em;color:var(--ink-3,#686864);',
    'text-transform:uppercase;margin-bottom:6px}',
    '.md-recap-l{font:500 13px var(--sans,Arial,sans-serif);color:var(--ink,#1E1E1C);padding:8px 0;',
    'border-bottom:1px solid var(--gris-bg,#F0F3F9)}',
    '.md-recap-libre{font:400 13px/1.6 var(--sans,Arial,sans-serif);color:var(--ink-2,#4A4A47);white-space:pre-wrap}',
    /* pied : CTA d etape, reassurance, variante */
    '.md-foot{flex-shrink:0;border-top:1px solid var(--line,#E2E5EB);background:#fff}',
    '.md-cta{padding:14px 20px 8px}',
    /* CTA rendu dans le corps : il suit le dernier champ, sans le decalage
       lateral du pied puisque le corps a deja son propre rembourrage. */
    '.md-cta-corps{padding:4px 0 20px}',
    '@media(min-width:992px){.md-cta{padding:16px 24px 8px}}',
    '.md-btn{width:100%;border:none;font:600 14px var(--title,Arial,sans-serif);padding:15px 0;cursor:pointer;',
    'transition:filter .15s,background .15s}',
    '.md-devis{background:var(--jaune,#FFCC00);color:var(--ink,#1E1E1C)}',
    '.md-devis:hover{filter:brightness(.96)}',
    '.md-devis:disabled{background:var(--line,#E2E5EB);color:var(--ink-4,#9AA1AB);cursor:default;filter:none}',
    '.md-continue{background:var(--bleu,#004F9E);color:#fff}',
    '.md-continue:hover{background:var(--bleu-nav,#0C4392)}',
    '.md-reas{padding:16px 20px 6px;display:flex;flex-direction:column;gap:10px}',
    '@media(min-width:992px){.md-reas{padding:12px 24px 6px;gap:12px}}',
    '.md-reas-l{display:flex;gap:10px;align-items:flex-start;font:400 12px/1.5 var(--sans,Arial,sans-serif);color:var(--ink-3,#686864)}',
    '.md-reas-l svg{width:15px;height:15px;flex-shrink:0;fill:none;stroke:var(--bleu-lien,#0070C0);stroke-width:2}',
    '.md-alt{margin:0;padding:4px 20px 6px;font:400 12.5px var(--sans,Arial,sans-serif);text-align:center}',
    '.md-alt a{color:var(--ink-3,#686864);text-decoration:underline}',
    '.md-alt a:hover{color:var(--bleu-lien,#0070C0)}',
    '.md-vider{display:block;margin:0 auto 14px;border:none;background:none;cursor:pointer;',
    'font:400 12.5px var(--sans,Arial,sans-serif);color:var(--ink-3,#686864);text-decoration:underline}',
    '.md-vider:hover{color:var(--ink,#1E1E1C)}',
    '.md-fab:focus-visible,.md-panneau button:focus-visible,.md-panneau a:focus-visible'+'{outline:3px solid var(--bleu-lien,#0070C0);outline-offset:2px}',
    '.md-panneau input:focus-visible,.md-panneau textarea:focus-visible{outline:none}'
  ].join('');

  var CROIX = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function init() {
    /* Une page peut n'avoir besoin que du contrat de donnees (lecture de la
       selection, vidage) sans du bouton flottant : c'est le cas de devis.html,
       ou le formulaire EST le recapitulatif. On evite ainsi de redeclarer la
       cle de session ailleurs (research.md D3, source de verite unique). */
    if (window.MA_DEMANDE_SANS_UI) return;

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var hote = document.createElement('div');
    hote.innerHTML =
      '<button type="button" class="md-fab">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14l-1.2 12H6.2L5 7zM9 7V5a3 3 0 0 1 6 0v2"/></svg>' +
        '<span class="md-badge">0</span>' +
        '<span class="md-fab-lbl">Ma demande</span>' +
      '</button>' +
      '<div class="md-scrim"></div>' +
      '<aside class="md-panneau" role="dialog" aria-modal="true" aria-labelledby="md-titre" inert>' +
        '<div class="md-grab"><i></i></div>' +
        '<div class="md-head">' +
          '<h2 id="md-titre">Ma demande</h2><span class="md-count">0</span>' +
          '<button type="button" class="md-fermer" aria-label="Fermer ma demande">' + CROIX + '</button>' +
        '</div>' +
        '<div class="md-conseiller">' +
          '<div class="av"><img src="' + BASE + 'assets/conseiller-julien.jpg" alt="" style="object-position:50% 12%"></div>' +
          '<div style="flex:1;min-width:0">' +
            '<div class="md-a-nom">Votre conseiller : Julien Marchal</div>' +
            '<div class="md-a-msg"></div>' +
          '</div>' +
        '</div>' +
        '<div class="md-body"></div>' +
        '<div class="md-foot"></div>' +
      '</aside>';
    while (hote.firstChild) document.body.appendChild(hote.firstChild);

    el.fab = document.querySelector('.md-fab');
    el.compteurFab = el.fab.querySelector('.md-badge');
    el.scrim = document.querySelector('.md-scrim');
    el.panneau = document.querySelector('.md-panneau');
    el.titre = el.panneau.querySelector('#md-titre');
    el.compteurPanneau = el.panneau.querySelector('.md-count');
    el.fermer = el.panneau.querySelector('.md-fermer');
    el.conseiller = el.panneau.querySelector('.md-conseiller');
    el.conseillerMsg = el.panneau.querySelector('.md-a-msg');
    el.corps = el.panneau.querySelector('.md-body');
    el.pied = el.panneau.querySelector('.md-foot');

    el.fab.addEventListener('click', ouvrir);
    el.fermer.addEventListener('click', fermer);
    el.scrim.addEventListener('click', fermer);
    el.corps.addEventListener('click', function (e) {
      var b = e.target.closest('.md-retirer');
      if (!b) return;
      retirer(b.getAttribute('data-id'));
      el.fermer.focus();
    });

    document.addEventListener('keydown', function (e) {
      if (!el.panneau.classList.contains('is-open')) return;
      if (e.key === 'Escape') { fermer(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var premier = f[0], dernier = f[f.length - 1];
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
    });

    rendre();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return {
    ajouter: ajouter, retirer: retirer, vider: vider,
    contient: contient,
    liste: function () { return ids.slice(); },
    formuleRetenue: formuleRetenue,
    remplacement: function () { return remplacement; },
    etape: function () { return envoye ? 'envoye' : etape; },
    ouvrir: ouvrir, fermer: fermer,
    /* Ouvre le drawer directement sur le formulaire de contact, quel que soit
       l'etat de la selection (ticket 002, R2). */
    contacterExpert: function () {
      if (!el.panneau) return;
      memoriserAffichage();
      dernierFocus = document.activeElement;
      /* Entree directe depuis un CTA de page : on peut arriver ici sans etre
         passe par quitterContact, d'ou ce garde-fou. */
      if (contact.envoye) saisieContact = { email: '', objet: '', detail: '' };
      contact.actif = true;
      contact.envoye = false;
      fautesContact = {};
      el.panneau.classList.add('is-open');
      el.panneau.removeAttribute('inert');
      el.scrim.classList.add('is-open');
      document.body.classList.add('md-open');
      rendre();
      var c = el.panneau.querySelector('#mdc-email');
      if (c) c.focus(); else el.fermer.focus();
    },
    enContact: function () { return contact.actif ? (contact.envoye ? 'envoye' : 'formulaire') : null; },
    on: function (cb) { if (typeof cb === 'function') ecouteurs.push(cb); }
  };
})();
