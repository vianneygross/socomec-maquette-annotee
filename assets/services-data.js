/* =====================================================================
   services-data.js : Source de vérité unique du parcours Services v2
   ---------------------------------------------------------------------
   Généré depuis  : ressources/catalogue/services-design-brief.json (PIM, 22 services)
   Arbitré par    : ressources/catalogue/Catalogue de services Socomec.md (édition A, 2025)
                    → le catalogue fait foi sur les intitulés (EF-011).
   Consommé par   : site/services.html, site/assets/ma-demande.js, site/devis.html

   AUCUN contenu inventé : chaque entrée porte en commentaire sa source
   (§ = section du catalogue 2025, PIM = présent au PIM seulement).

   Écarts assumés vs specs, à arbitrer en revue de jalon :
   - 25 entrées et non 22. Le PIM expose « Contrats de maintenance » comme un
     service unique ; les specs (data-model « contrat-gold », T003 « formules
     concurrentes », cas limites de spec.md) exigent 3 formules sélectionnables
     → 1 entrée PIM devient 3 (+2). « Tesla Lab » est ajouté depuis le § 4.3 car
     EF-010 le nomme explicitement et le veut sélectionnable (+1).

   REFONTE 0.5.5, arbitrages de la revue SOCOMEC du 16/10 (décision 0004) :
   - `categorie` passe aux 7 catégories du PIM (slide 1 du PPTX de Morgane).
     C'est désormais un identifiant, pas un libellé : `nomCategorie()` rend
     l'intitulé français de maquette.
   - `familles` passe à 5 valeurs, le stockage (BESS) devenant une famille à
     part entière (D8 de la décision 0004) et les STS se détachant des ASI.
   - `contrats` arrive : les formules de maintenance qui incluent le service.
   - `besoin` et `natures` disparaissent : le filtre « besoin » est remplacé
     par les catégories PIM, et plus aucune page ne lisait `natures`.

   🔶 LE PIM EST SIMULÉ. Les valeurs de `categorie`, `familles` et `contrats`
   qui ne se lisent pas directement dans le catalogue 2025 sont des hypothèses
   de maquette, signalées 🔶 ci-dessous et listées au rapport 0.5.5 pour
   validation SOCOMEC. Elles ne sont jamais présentées comme donnée client.
   ===================================================================== */

window.SERVICES_DATA = (function () {
  'use strict';

  /* Catégories de services : les 7 du PIM (PPTX Morgane, slide 1).
     `pim` garde l'intitulé d'origine pour que le rapprochement avec le
     référentiel SOCOMEC reste lisible quand les vraies valeurs arriveront. */
  var categories = [
    { id: 'conseil',         nom: 'Conseil et support',      pim: 'advice and support' },
    { id: 'financement',     nom: 'Financement et location',  pim: 'financing and leasing' },
    { id: 'garantie',        nom: 'Garantie',                 pim: 'warranty' },
    { id: 'mise-en-service', nom: 'Mise en service',          pim: 'commissioning' },
    { id: 'maintenance',     nom: 'Maintenance',              pim: 'maintenance' },
    { id: 'optimisation',    nom: 'Optimisation',             pim: 'optimisation' },
    { id: 'formation',       nom: 'Formation',                pim: 'training' }
  ];

  /* Familles d'équipements. Le catalogue 2025 en décrit 3 ; la décision 0004
     en retient 5 : les STS se détachent des ASI et le stockage (BESS) devient
     une famille à part entière. Les libellés grand public restent à valider
     par SOCOMEC sur les données PIM. */
  var familles = [
    { id: 'asi',         nom: 'Onduleurs (ASI)',              gammes: ['NETYS', 'ITYS', 'OFYS RT', 'MASTERYS', 'MODULYS', 'DELPHYS'] },
    { id: 'sts',         nom: 'Commutateurs statiques (STS)', gammes: ['STATYS'] },
    { id: 'commutation', nom: 'Coupure et commutation',       gammes: ['ATyS', 'MEDSYS'] },
    { id: 'mesure',      nom: 'Mesure et surveillance',       gammes: ['ISOM', 'COUNTIS', 'DIRIS', 'WEBVIEW', "N'VIEW", 'COSYS'] },
    { id: 'stockage',    nom: "Stockage d'énergie (BESS)",    gammes: ['SUNSYS'] }
  ];

  /* =====================================================================
     GAMMES D'EQUIPEMENTS (passe 0.6.3)
     Alimente les vignettes produit des pages detail, sur le modele de la
     rubrique « Pour quels produits ? » du site en production.

     `url` : page CATEGORIE de socomec.fr. Les 14 URL ont ete VERIFIEES le
     2026-10-19, statut 200, et chacune cite bien sa gamme dans son contenu :
     ce ne sont pas des cibles supposees. `categorie` reprend le titre de la
     page, tel qu'il s'y lit.

     `visuel` : chemin RELATIF A assets/, les pages detail etant un cran plus
     bas que le hub. `largeur` et `hauteur` sont les dimensions REELLES du
     fichier : les declarer approximativement reserverait une mauvaise boite
     et couterait du CLS au chargement. `null` quand aucun visuel n'existe dans le projet : la
     vignette bascule alors sur une presentation typographique, jamais sur une
     image de remplacement qui laisserait croire a un autre produit.
     ===================================================================== */
  var gammes = [
    { id:'masterys', nom:'MASTERYS', famille:'asi',  visuel:'gammes/masterys.webp', largeur:272, hauteur:320,
      url:'https://www.socomec.fr/fr/c/onduleurs-triphases', categorie:'Onduleurs triphasés' },
    { id:'modulys',  nom:'MODULYS',  famille:'asi',  visuel:'gammes/modulys.webp', largeur:148, hauteur:320,
      url:'https://www.socomec.fr/fr/c/onduleurs-modulaires', categorie:'Onduleurs modulaires' },
    { id:'delphys',  nom:'DELPHYS',  famille:'asi',  visuel:'gammes/delphys.webp', largeur:166, hauteur:320,
      url:'https://www.socomec.fr/fr/c/onduleurs-triphases', categorie:'Onduleurs triphasés' },
    { id:'itys',     nom:'ITYS',     famille:'asi',  visuel:'gammes/itys.webp', largeur:264, hauteur:320,
      url:'https://www.socomec.fr/fr/c/onduleurs-monophases', categorie:'Onduleurs monophasés' },
    { id:'netys',    nom:'NETYS',    famille:'asi',  visuel:null,
      url:'https://www.socomec.fr/fr/c/onduleurs-monophases', categorie:'Onduleurs monophasés' },
    { id:'statys',   nom:'STATYS',   famille:'sts',  visuel:'gammes/statys.webp', largeur:320, hauteur:259,
      url:'https://www.socomec.fr/fr/c/systemes-de-transfert-statique', categorie:'Systèmes de transfert statique' },
    { id:'atys',     nom:'ATyS',     famille:'commutation', visuel:null,
      url:'https://www.socomec.fr/fr/c/inverseurs-de-sources', categorie:'Inverseurs de sources' },
    { id:'medsys',   nom:'MEDSYS',   famille:'commutation', visuel:null,
      url:'https://www.socomec.fr/fr/c/systemes-pour-locaux-a-usage-medical', categorie:'Systèmes pour locaux à usage médical' },
    { id:'isom',     nom:'ISOM',     famille:'mesure', visuel:null,
      url:'https://www.socomec.fr/fr/c/controleurs-permanents-disolement', categorie:"Contrôleurs permanents d'isolement" },
    { id:'diris',    nom:'DIRIS',    famille:'mesure', visuel:null,
      url:'https://www.socomec.fr/fr/c/centrales-de-mesure', categorie:'Centrales de mesure' },
    { id:'countis',  nom:'COUNTIS',  famille:'mesure', visuel:null,
      url:'https://www.socomec.fr/fr/c/compteurs-denergie', categorie:"Compteurs d'énergie" },
    { id:'webview',  nom:'WEBVIEW',  famille:'mesure', visuel:null,
      url:'https://www.socomec.fr/fr/c/logiciels-de-management-de-lenergie', categorie:"Logiciels de management de l'énergie" },
    { id:'cosys',    nom:'COSYS',    famille:'mesure', visuel:null,
      url:'https://www.socomec.fr/fr/c/compensation-denergie-reactive', categorie:"Compensation d'énergie réactive" },
    { id:'sunsys',   nom:'SUNSYS',   famille:'stockage', visuel:null,
      url:'https://www.socomec.fr/fr/c/systemes-modulaires-de-stockage-de-lenergie', categorie:"Systèmes modulaires de stockage de l'énergie" }
  ];

  /* Formules de contrat de maintenance, de la plus légère à la plus couvrante.
     L'ordre compte : il porte la logique « tout ce qui est inclus en Silver
     l'est aussi en Gold ». */
  var formulesContrat = [
    { id: 'silver',   nom: 'Silver' },
    { id: 'gold',     nom: 'Gold' },
    { id: 'platinum', nom: 'Platinum' }
  ];

  var services = [

    /* ---- Contrats de maintenance : catalogue § 1.3 (grille ASI & STS) ---- */
    {
      id: 'contrat-silver', nom: 'Contrat de maintenance Silver',
      categorie: 'maintenance', formule: 'silver', contrats: [],
      familles: ['asi', 'sts'], gammes: ['MASTERYS', 'MODULYS', 'DELPHYS', 'STATYS', 'ITYS', 'NETYS'],
      description: "Visite de maintenance préventive annuelle, accès à la Hot Line technique et services cloud cyber-sécurisés SoLink et SoLive.",
      pageDetail: 'services/contrat-maintenance.html'
    },
    {
      id: 'contrat-gold', nom: 'Contrat de maintenance Gold',
      categorie: 'maintenance', formule: 'gold', contrats: [],
      familles: ['asi', 'sts'], gammes: ['MASTERYS', 'MODULYS', 'DELPHYS', 'STATYS', 'ITYS', 'NETYS'],
      description: "Le périmètre Silver, complété par la main-d'œuvre et les déplacements pour maintenance corrective, avec un délai d'intervention garanti sous 6 heures.",
      pageDetail: 'services/contrat-maintenance.html'
    },
    {
      id: 'contrat-platinum', nom: 'Contrat de maintenance Platinum',
      categorie: 'maintenance', formule: 'platinum', contrats: [],
      familles: ['asi', 'sts'], gammes: ['MASTERYS', 'MODULYS', 'DELPHYS', 'STATYS', 'ITYS', 'NETYS'],
      description: "Couverture maximale : pièces détachées d'origine incluses, intervention sous 4 heures, remplacement préventif des pièces d'usure et imagerie thermique.",
      pageDetail: 'services/contrat-maintenance.html'
    },

    /* ---- Contrats : catalogue § 2.2, § 2.4 / § 3.3 ---- */
    {
      id: 'contrats-inspection-atys', nom: "Contrats d'inspection ATyS",
      categorie: 'maintenance', formule: null, contrats: [],
      familles: ['commutation'], gammes: ['ATyS'],
      description: "Vérification périodique des inverseurs de sources : visite d'inspection annuelle, test hors charge et imagerie thermique des connexions, en formules Silver, Gold et Platinum.",
      pageDetail: null
    },
    {
      id: 'flex-service-package', nom: 'Flex Service Package',
      categorie: 'maintenance', formule: null, contrats: [],
      familles: ['commutation', 'mesure'], gammes: ['ATyS', 'DIRIS', 'WEBVIEW', "N'VIEW", 'COSYS'],
      description: "Forfait de jours d'intervention à réserver à l'année, dont les prestations se choisissent à la carte : recherche de défauts, mises à jour logicielles, rapports d'état, formations continues.",
      pageDetail: null
    },

    /* ---- Garantie constructeur : PIM (« Garantie constructeur ») ---- */
    {
      id: 'extension-garantie-asi-triphasees', nom: 'Extension de garantie ASI triphasées',
      categorie: 'garantie', formule: null, contrats: [],
      familles: ['asi'], gammes: ['MODULYS XS', 'MASTERYS GP4', 'MODULYS GP 2.0'],
      description: "Prolongation de la garantie constructeur jusqu'à 5 ans, à conditions identiques à la garantie standard : pièces et main-d'œuvre couvertes.",
      pageDetail: null
    },
    {
      id: 'extension-garantie-netys-rt', nom: 'Extension de garantie NETYS RT',
      categorie: 'garantie', formule: null, contrats: [],
      familles: ['asi'], gammes: ['NETYS RT'],
      description: "Couverture prolongée des ASI monophasées en options 2+1 ou 2+3 ans, batteries incluses, avec service de remplacement anticipé Advanced Swap.",
      pageDetail: null
    },
    {
      /* 🔶 famille `stockage` : la BESS n'existait pas au catalogue 2025,
         elle est créée par la décision 0004. */
      id: 'extension-garantie-sunsys', nom: "Extension de garantie systèmes de stockage SUNSYS",
      categorie: 'garantie', formule: null, contrats: [],
      familles: ['stockage'], gammes: ['SUNSYS'],
      description: "Prolongation de la garantie des systèmes modulaires de stockage d'énergie jusqu'à 20 ans, pièces et main-d'œuvre incluses.",
      pageDetail: null
    },
    {
      id: 'platinum-warranty', nom: 'Platinum Warranty',
      categorie: 'garantie', formule: null, contrats: [],
      familles: ['asi'], gammes: ['MASTERYS', 'MODULYS', 'DELPHYS', 'ITYS'],
      description: "Garantie usine améliorée dès le premier jour de mise en service : assistance technique prioritaire et délai de réponse défini pendant toute la durée de la garantie.",
      pageDetail: null
    },

    /* ---- Mise en service : catalogue § 1.2 ---- */
    {
      id: 'mise-en-service-sur-site', nom: 'Mise en service sur site',
      categorie: 'mise-en-service', formule: null, contrats: [],
      familles: ['asi', 'sts', 'commutation', 'mesure'], gammes: ['MASTERYS', 'MODULYS', 'DELPHYS', 'STATYS', 'ATyS', 'MEDSYS', 'ISOM', 'DIRIS', 'COSYS'],
      description: "Inspection de l'environnement, contrôle de l'installation et de l'équipement, essais de fonctionnement, rapport détaillé et certificat de mise en service sécurisée et fiable.",
      pageDetail: 'services/mise-en-service.html'
    },
    {
      id: 'mise-en-service-asi-distance', nom: 'Mise en service à distance',
      categorie: 'mise-en-service', formule: null, contrats: [],
      familles: ['asi'], gammes: ['MASTERYS de 10 à 40 kVA'],
      description: "Mise en service sans déplacement via une connexion sécurisée par code à usage unique : planification simplifiée, procédure guidée depuis un smartphone, audit de cybersécurité indépendant.",
      pageDetail: null
    },

    /* ---- Location et financement : catalogue § 1.1, § 3.4 ---- */
    {
      id: 'location-courte-duree-asi', nom: "Location courte durée d'ASI",
      categorie: 'financement', formule: null, contrats: [],
      familles: ['asi'], gammes: ['NETYS', 'ITYS', 'MASTERYS', 'MODULYS'],
      description: "ASI de 10 à 200 kVA louées d'une semaine à plusieurs mois, prise en charge intégrale : transport, mise en service, maintenance, démontage et enlèvement.",
      pageDetail: 'services/location-asi.html'
    },
    {
      id: 'powerlease', nom: "Powerlease, location longue durée d'ASI",
      categorie: 'financement', formule: null, contrats: [],
      familles: ['asi'], gammes: ['MASTERYS', 'MODULYS', 'DELPHYS'],
      description: "Location d'une ASI dernière génération sans apport, sur 5 à 6 ans : type d'ASI, batteries, options et niveau de contrat de maintenance se configurent selon le besoin.",
      pageDetail: 'services/powerlease.html'
    },

    /* ---- Support et optimisation : catalogue § 1.1, § 3.4 ---- */
    {
      /* 🔶 contrats : inclusion supposée à partir du Gold, le catalogue ne
         rattache pas cette assistance à une formule. */
      id: 'assistance-webview-l', nom: 'Assistance logicielle Webview-L',
      categorie: 'conseil', formule: null, contrats: ['gold', 'platinum'],
      familles: ['mesure'], gammes: ['WEBVIEW'],
      description: "Visite sur site pour vérifier que le serveur web local remonte les bons indicateurs, que l'espace disque d'historisation est optimisé et que le logiciel est à jour.",
      pageDetail: null
    },
    {
      /* 🔶 contrats : inclusion supposée en Platinum seulement. */
      id: 'metrologie-sur-site', nom: 'Métrologie sur site',
      categorie: 'optimisation', formule: null, contrats: ['platinum'],
      familles: ['mesure'], gammes: ['DIRIS', 'COUNTIS', 'WEBVIEW'],
      description: "Validation de la cohérence de la chaîne de comptage à 3 %, du capteur de courant à l'afficheur. Prestation attendue dans un système de management de l'énergie certifié ISO 50001.",
      pageDetail: null
    },

    /* ---- Services connectés : catalogue § 1.4 et PIM.
       « Services cloud cyber-sécurisés natifs (SoLink, SoLive) » figure dans
       la grille § 1.3 sur les trois formules, et le § 1.4 titre « inclus
       d'office » : l'inclusion de SoLink, SoLive et du diagnostic à distance
       est donc une DONNÉE RÉELLE, pas une hypothèse. ---- */
    {
      id: 'solink', nom: 'SoLink',
      categorie: 'maintenance', formule: null, contrats: ['silver', 'gold', 'platinum'],
      familles: ['asi'], gammes: ['MASTERYS', 'MODULYS', 'DELPHYS'],
      description: "Surveillance à distance 24h/24 et 7j/7 : en cas de dépassement de tolérance, le centre technique SOCOMEC le plus proche est alerté automatiquement et peut agir immédiatement.",
      pageDetail: null
    },
    {
      id: 'solive', nom: 'SoLive',
      categorie: 'optimisation', formule: null, contrats: ['silver', 'gold', 'platinum'],
      familles: ['asi'], gammes: ['MASTERYS', 'MODULYS', 'DELPHYS'],
      description: "Application mobile de suivi en temps réel de l'état de l'ASI, du niveau de charge des batteries et des alarmes.",
      pageDetail: null
    },
    {
      id: 'diagnostic-distance', nom: 'Diagnostic et dépannage à distance',
      categorie: 'maintenance', formule: null, contrats: ['silver', 'gold', 'platinum'],
      familles: ['asi', 'sts'], gammes: ['MASTERYS', 'MODULYS', 'DELPHYS', 'STATYS'],
      description: "Connexion sécurisée à l'ASI, après accord de l'exploitant, pour conduire un diagnostic approfondi avec la même précision qu'une intervention physique.",
      pageDetail: null
    },
    {
      /* 🔶 contrats : inclusion supposée en Platinum seulement. */
      id: 'sodata', nom: 'SoData',
      categorie: 'optimisation', formule: null, contrats: ['platinum'],
      familles: ['asi', 'mesure'], gammes: ['MASTERYS', 'MODULYS', 'DIRIS', 'COUNTIS'],
      description: "Interface cloud unique et standardisée pour récupérer les données brutes des équipements SOCOMEC dans vos propres outils de gestion.",
      pageDetail: null
    },
    {
      /* 🔶 famille `stockage` (décision 0004). Hors contrats ASI et STS. */
      id: 'solive-pro', nom: 'SoLive PRO',
      categorie: 'optimisation', formule: null, contrats: [],
      familles: ['stockage'], gammes: ['SUNSYS'],
      description: "Visualisation cloud en temps réel des systèmes de stockage d'énergie, par tableaux de bord prédéfinis ou personnalisés, sur l'ensemble des sites.",
      pageDetail: null
    },

    /* ---- Formation : catalogue § 1.6 et § 3.5 ---- */
    {
      /* 🔶 contrats : inclusion supposée en Platinum seulement. */
      id: 'formation', nom: 'Programme de formation constructeur certifié',
      categorie: 'formation', formule: null, contrats: ['platinum'],
      familles: ['asi', 'sts', 'commutation', 'mesure'], gammes: ['MASTERYS', 'MODULYS', 'DELPHYS', 'STATYS', 'ISOM', 'DIRIS', 'WEBVIEW', "N'VIEW"],
      description: "Cours théoriques et travaux pratiques à l'usine SOCOMEC, sur site ou à distance : exploitation quotidienne, interprétation des alarmes, simulation de cas réels.",
      pageDetail: null
    },

    /* ---- Conseil, audits et essais : catalogue § 3.1, § 4.2, § 4.3 (EF-010).
       Ces services formaient la zone transversale « Services professionnels ».
       La décision 0004 les réintègre au catalogue, rattachés à « advice and
       support » (annotation de Morgane, PPTX slide 2). ---- */
    {
      id: 'audit-compensation-reactive', nom: "Audit de compensation de l'énergie réactive",
      categorie: 'conseil', formule: null, contrats: [],
      familles: ['mesure'], gammes: ['COSYS'],
      description: "Enregistrement d'au moins une semaine de consommation réelle sur site, puis analyse par le bureau d'études pour identifier les charges polluantes et dimensionner le système de compensation.",
      pageDetail: null
    },
    {
      id: 'verification-couverture-lorawan', nom: "Vérification de couverture LoRaWAN®",
      categorie: 'conseil', formule: null, contrats: [],
      familles: ['mesure'], gammes: ['DIRIS', 'COUNTIS'],
      description: "Évaluation de la couverture radio du site et positionnement optimal des capteurs et passerelles, pour garantir une transmission fiable des données de mesure.",
      pageDetail: null
    },
    {
      id: 'audit-qualite-alimentation', nom: "Audit de la qualité de l'alimentation électrique",
      categorie: 'conseil', formule: null, contrats: [],
      familles: ['asi', 'mesure'], gammes: ['DIRIS', 'DIRIS Q800'],
      description: "Pose d'analyseurs de réseaux sur 7 jours minimum pour relever creux et surtensions, distorsion harmonique, transitoires et déséquilibres, avec rapport de diagnostic et préconisations.",
      pageDetail: null
    },
    {
      /* 🔶 catégorie provisoire. Tesla Lab est absent du PIM et une catégorie
         « tests » est à l'étude côté SOCOMEC (point ouvert O-2) : rattaché à
         « conseil et support » en attendant l'arbitrage de Morgane. */
      id: 'tesla-lab', nom: 'Tesla Lab : tests de puissance et certification',
      categorie: 'conseil', formule: null, contrats: [],
      familles: ['asi', 'sts', 'commutation', 'mesure'], gammes: [],
      description: "Laboratoire indépendant accrédité COFRAC, membre fondateur de l'ASEFA et de LOVAG : essais de court-circuit, d'échauffement et d'endurance jusqu'à 100 kA, et prise en charge des démarches de certification internationale.",
      pageDetail: null
    }
  ];

  /* =====================================================================
     RÉFÉRENTIEL PRODUITS (ticket 001, R5)
     Dérivé des gammes réelles du catalogue 2025. Il alimente la recherche
     guidée du hub : l'utilisateur choisit un produit, on lui montre les
     services compatibles.

     CONTENU D'EXEMPLE. Les gammes (MASTERYS, MODULYS, DELPHYS, ATyS, DIRIS…)
     et les plages de puissance viennent du catalogue. Les références
     précises sont plausibles mais ne sont pas une donnée client : elles ne
     doivent jamais être présentées comme telles. La vraie liste viendra
     d'une API Drupal, pas d'ici.

     `gamme` sert la correspondance avec le champ `gammes` des services.
     OFYS RT est écarté : aucun service du catalogue ne le cite, un produit
     de cette gamme ne renverrait jamais rien.
     ===================================================================== */
  var produits = [
    /* --- Onduleurs (ASI) --- */
    { ref: 'MASTERYS GP4 20 kVA',      gamme: 'MASTERYS', famille: 'asi',
      type: 'ASI triphasée',           usage: 'Salle informatique, process industriel' },
    { ref: 'MASTERYS GP4 60 kVA',      gamme: 'MASTERYS', famille: 'asi',
      type: 'ASI triphasée',           usage: 'Site tertiaire critique, bloc opératoire' },
    { ref: 'MASTERYS GP4 RK 40 kVA',   gamme: 'MASTERYS', famille: 'asi',
      type: 'ASI triphasée en rack',   usage: 'Baie informatique, local technique exigu' },
    { ref: 'MASTERYS BC+ 80 kVA',      gamme: 'MASTERYS', famille: 'asi',
      type: 'ASI triphasée',           usage: 'Continuité de production, forte charge' },
    { ref: 'MASTERYS IP+ 15 kVA',      gamme: 'MASTERYS', famille: 'asi',
      type: 'ASI triphasée renforcée', usage: 'Environnement poussiéreux ou humide' },
    { ref: 'MODULYS GP 50 kW',         gamme: 'MODULYS', famille: 'asi',
      type: 'ASI modulaire',           usage: 'Puissance évolutive, redondance N+1' },
    { ref: 'MODULYS GP 150 kW',        gamme: 'MODULYS', famille: 'asi',
      type: 'ASI modulaire',           usage: 'Data center, extension à chaud' },
    { ref: 'MODULYS XS 10 kW',         gamme: 'MODULYS', famille: 'asi',
      type: 'ASI modulaire compacte',  usage: 'Petit local technique, agence' },
    { ref: 'MODULYS XL 200 kW',        gamme: 'MODULYS', famille: 'asi',
      type: 'ASI modulaire',           usage: 'Forte puissance, brique de rechange sur site' },
    { ref: 'DELPHYS XM 250 kVA',       gamme: 'DELPHYS', famille: 'asi',
      type: 'ASI forte puissance',     usage: 'Site critique, salle dédiée' },
    { ref: 'DELPHYS XL 800 kVA',       gamme: 'DELPHYS', famille: 'asi',
      type: 'ASI forte puissance',     usage: 'Infrastructure industrielle, hôpital' },
    { ref: 'ITYS 10 kVA',              gamme: 'ITYS', famille: 'asi',
      type: 'ASI monophasée tour',     usage: 'Serveurs de proximité, autonomie extensible' },
    { ref: 'NETYS RT 3300 VA',         gamme: 'NETYS', famille: 'asi',
      type: 'ASI monophasée rack-tour', usage: 'Baie réseau, équipement isolé' },

    /* --- Commutateurs statiques (STS) --- */
    { ref: 'STATYS HC 400 A',          gamme: 'STATYS', famille: 'sts',
      type: 'Commutateur statique de transfert', usage: 'Bascule de source sans coupure' },

    /* --- Coupure et commutation --- */
    { ref: 'ATyS 6e 125 A',            gamme: 'ATyS', famille: 'commutation',
      type: 'Inverseur de sources automatique', usage: 'Secours groupe électrogène' },
    { ref: 'ATyS M 400 A',             gamme: 'ATyS', famille: 'commutation',
      type: 'Inverseur de sources motorisé',    usage: 'Bascule réseau et secours, tableau BT' },
    { ref: 'MEDSYS 8 kVA',             gamme: 'MEDSYS', famille: 'commutation',
      type: "Alimentation sécurisée pour locaux médicaux", usage: 'Bloc opératoire, groupe 2' },

    /* --- Mesure et surveillance --- */
    { ref: 'DIRIS Q800',               gamme: 'DIRIS', famille: 'mesure',
      type: 'Analyseur de réseau',     usage: "Qualité de l'onde, conformité EN 50160" },
    { ref: 'DIRIS A40',                gamme: 'DIRIS', famille: 'mesure',
      type: 'Centrale de mesure',      usage: 'Suivi de consommation par départ' },
    { ref: 'COUNTIS E53',              gamme: 'COUNTIS', famille: 'mesure',
      type: "Compteur d'énergie",      usage: 'Sous-comptage, refacturation' },
    { ref: 'ISOM Digiware',            gamme: 'ISOM', famille: 'mesure',
      type: "Contrôleur permanent d'isolement", usage: 'Régime de neutre IT, locaux médicaux' },
    { ref: 'COSYS 100 kvar',           gamme: 'COSYS', famille: 'mesure',
      type: "Compensation d'énergie réactive", usage: 'Réduction des pénalités tarifaires' },

    /* --- Stockage d'énergie (BESS) ---
       Référence d'exemple : la gamme SUNSYS est citée par le catalogue, les
       capacités ci-dessous sont plausibles et non une donnée client. */
    { ref: 'SUNSYS PCS² 100 kW',       gamme: 'SUNSYS', famille: 'stockage',
      type: "Convertisseur de stockage d'énergie", usage: 'Écrêtage de pointe, autoconsommation' },
    { ref: 'SUNSYS HES L 250 kWh',     gamme: 'SUNSYS', famille: 'stockage',
      type: "Système de stockage conteneurisé",    usage: 'Secours longue durée, site industriel' }
  ];

  /* Synthèse comparée des 3 formules : catalogue § 1.3, grille ASI & STS.
     5 différences clés retenues ; la grille complète relève de la page
     détail contrat (EF-001, clarification du 2026-08-19). */
  var syntheseContrats = {
    formules: [
      { id: 'silver',   service: 'contrat-silver',   nom: 'Silver',   accroche: "L'essentiel du suivi préventif" },
      { id: 'gold',     service: 'contrat-gold',     nom: 'Gold',     accroche: 'Le correctif pris en charge' },
      { id: 'platinum', service: 'contrat-platinum', nom: 'Platinum', accroche: 'La disponibilité maximale' }
    ],
    lignes: [
      { intitule: 'Visite de maintenance préventive annuelle',        silver: 'oui',    gold: 'oui',      platinum: 'oui' },
      { intitule: "Main-d'œuvre et déplacements pour correctif",      silver: 'non',    gold: 'oui',      platinum: 'oui' },
      { intitule: "Délai d'intervention sur site garanti",            silver: 'non',    gold: '< 6 h',    platinum: '< 4 h' },
      { intitule: "Pièces détachées d'origine incluses",              silver: 'non',    gold: 'non',      platinum: 'oui' },
      { intitule: "Remplacement préventif des pièces d'usure",        silver: 'option', gold: 'option',   platinum: 'oui' }
    ]
  };

  /* Retrouve une gamme par son intitule. Les pages detail citent les gammes
     par leur nom (« MASTERYS »), pas par leur identifiant. La comparaison
     ignore la casse : le catalogue ecrit « ATyS », les cartes « ATYS ». */
  function gamme(nom) {
    var n = String(nom).toLowerCase().trim();
    for (var i = 0; i < gammes.length; i++) {
      if (gammes[i].nom.toLowerCase() === n) return gammes[i];
    }
    return null;
  }

  function nomCategorie(id) {
    for (var i = 0; i < categories.length; i++) if (categories[i].id === id) return categories[i].nom;
    return id;
  }
  function nomFamille(id) {
    for (var i = 0; i < familles.length; i++) if (familles[i].id === id) return familles[i].nom;
    return id;
  }

  return {
    categories: categories,
    familles: familles,
    gammes: gammes,
    formulesContrat: formulesContrat,
    produits: produits,
    services: services,
    syntheseContrats: syntheseContrats,
    nomCategorie: nomCategorie,
    nomFamille: nomFamille,
    gamme: gamme
  };
})();
