/* =====================================================================
   annotations-data.js : où se trouve chaque caractéristique PIM
   ---------------------------------------------------------------------
   Clé = nom du fichier de la page ('index.html', 'devis.html',
   'contrat-maintenance.html', 'powerlease.html', 'mise-en-service.html',
   'location-asi.html') ou '*' pour toutes les pages.

   Une annotation :
   {
     sel:     sélecteur CSS de l'élément porteur du picto « i » (obligatoire),
     all:     true pour annoter tous les éléments trouvés (sinon le premier),
     carac:   nom de la caractéristique PIM (obligatoire),
     code:    identifiant technique du champ,
     libelle: libellé tel qu'il apparaît au PIM,
     type:    texte, liste, nombre, image…,
     exemple: valeur d'exemple,
     source:  d'où vient la donnée,
     note:    explication libre,
     simule:  true si la valeur est simulée pour la maquette,
     dx, dy:  décalage fin du picto en pixels (optionnel). Par défaut, le picto
              se place à 14 px à droite de l'élément, à hauteur de sa 1re ligne.
     manque:  true si le contenu existe au PIM mais pas dans la maquette,
     dyn:     true si les cibles apparaissent après le chargement (liste générée),
     haut:    true pour afficher le picto au-dessus d'une liste déroulante,
     clip:    sélecteur du cadre défilant : le picto disparaît s'il en sort,
     absent:  true si le contenu de la maquette n'existe pas au PIM
   }
   ===================================================================== */
window.ANNOTATIONS = {
  '*': [],
  'index.html': [
    { sel: '.svc h3', all: true, carac: 'DC_P_PRODUCT-NAME',
      note: 'Titre de chaque carte du catalogue.' },
    { sel: '.svc .svc-cat', all: true, carac: 'DC_P_PRODUCT_CATEGORY',
      note: 'Catégorie de chaque carte (Maintenance, Garantie, Conseil et support, Financement et location, Mise en service, Optimisation, Formation).' },
    { sel: '.svc .tags', all: true, carac: 'DC_P_PRODUCT_CATEGORY',
      note: 'Familles de produits de chaque carte (Coupure et commutation, Mesure et surveillance, Onduleurs (ASI)…) : récupérer la DC_P_PRODUCT_CATEGORY de chaque produit associé (produits compatibles, DC_P_LIEN_COMPATIBLE_PRODUCTS), sans doublon.' },
    { sel: '.svc .svc-more > p', all: true, carac: 'DC_P_OFFER_SUMMARY', absent: true,
      note: 'Résumé de l\'offre : caractéristique à créer dans le PIM, avec une description courte rédigée pour chaque service (250 caractères maximum).' },
    { sel: '.svc .gammes', all: true, carac: 'DC_P_LIEN_COMPATIBLE_PRODUCTS',
      note: 'Liste « Gammes concernées » de chaque carte. Limiter à deux lignes pour les services qui ont beaucoup de produits compatibles, et ajouter « … » s\'il y a trop de produits.' },
    { sel: '#q-liste .o-ref-famille .o-nom', all: true, dyn: true, haut: true, clip: '#q-liste', dy: 11, carac: 'DC_P_PRODUCT_CATEGORY',
      note: 'Familles proposées dans les suggestions de recherche (ex. « Commutateurs statiques (STS) », « Coupure et commutation ») : ce sont les product category des produits.' },
    { sel: '#q-liste .o-ref-produit .o-nom', all: true, dyn: true, haut: true, clip: '#q-liste', dy: 11, carac: 'DC_P_PRODUCT-NAME',
      note: 'Nom du produit dans les suggestions de recherche (ex. « STATYS HC 400 A », « ATyS 6e 125 A »).' },
    { sel: '#q-liste .o-prods', all: true, dyn: true, haut: true, clip: '#q-liste', dy: 9, carac: 'DC_P_PRODUCT-NAME',
      note: 'Produits de chaque famille dans les suggestions de recherche (ex. « STATYS », « ATyS, MEDSYS ») : ce sont les product name des produits.' },
    { sel: '#q-liste .o-type', all: true, dyn: true, haut: true, clip: '#q-liste', dy: 9, carac: 'DC_P_PRODUCT_CATEGORY',
      note: 'Type de produit affiché dans les suggestions de recherche (ex. « Commutateur statique de transfert », « Inverseur de sources automatique ») : la catégorie du produit est bien renseignée dans le PIM.' },
    { sel: '#q-liste .o-usage', all: true, dyn: true, haut: true, clip: '#q-liste', dy: 9, carac: 'Aucune caractéristique', absent: true,
      note: 'Applications du produit dans les suggestions de recherche (ex. « Salle informatique, process industriel », « Site tertiaire critique, bloc opératoire ») : non renseignées dans le PIM, à retirer.' },
    { sel: '#ann-cat-lbl', dy: 7, carac: 'DC_P_PRODUCT_CATEGORY',
      exemple: 'Conseil et support, Financement et location, Garantie, Mise en service, Maintenance, Optimisation, Formation',
      note: 'Filtres « Type de service » : une puce par valeur de la caractéristique.' },
    { sel: '#f-contrat', carac: 'DC_P_CONTRACT_LEVEL', absent: true, exemple: 'Silver, Gold, Platinum',
      note: 'Niveau de contrat (Silver, Gold, Platinum) : caractéristique à choix multiples à créer dans le PIM, avec comme choix Silver, Gold et Platinum.' }
  ],
  'devis.html': [],
  'contrat-maintenance.html': [],
  'powerlease.html': [
    { sel: '#ann-pl-image .ann-hero-img-cadre', carac: 'DC_P_MAIN_PICTURE', manque: true, dx: -34, dy: 14, note: 'Image du service, à droite du titre et de la description dans le hero. Absente de la maquette : emplacement fictif ajouté.' },
    { sel: '#ann-pl-categorie', carac: 'DC_P_PRODUCT_CATEGORY', note: 'Catégorie du service (« Financement et location »), affichée au-dessus du titre. La mention « Service unitaire » est retirée.' },
    { sel: '#ann-pl-nom', carac: 'DC_P_PRODUCT-NAME', note: 'Nom du service (« Powerlease »). Prévoir un saut de ligne après le nom : le titre ne doit pas être construit en deux parties sur une même ligne.' },
    { sel: '#ann-pl-court', carac: 'DC_P_PRODUCT_SHORT-DESCRIPTION', exemple: 'Solution de Location Longue Durée (LLD) d\'ASI', note: 'Le texte affiché dans la maquette (« location longue durée d\'ASI ») est une formulation de maquette. La vraie valeur du PIM est « Solution de Location Longue Durée (LLD) d\'ASI », à afficher sur une ligne séparée du nom (saut de ligne), sans titre en deux parties.' },
    { sel: '.hero .lead', carac: 'DC_P_UNIQUE_VALUE_PROPOSAL', note: 'Phrase d\'accroche sous le titre.' },
    { sel: '.essentiel-txt', carac: 'DC_P_FUNCTIONS', note: 'Texte du bloc « En quoi consiste ce service ».' },
    { sel: '.carac-list', carac: 'DC_P_KEY_POINTS', note: 'Liste à puces du bloc « Caractéristiques générales ». Remplace DC_P_GENERAL_CHARACTERISTICS_LIST. Nom de la caractéristique à confirmer.' },
    { sel: '.adv-grid .acard:nth-child(1) .ac-t', carac: 'DC_P_ADVANTAGE_1_TITLE', note: 'Avantage 1 : titre. La numérotation (pastille « 1 ») est retirée de la page : penser à gérer l\'ordre 1 à 5 via les caractéristiques.' },
    { sel: '.adv-grid .acard:nth-child(1) .ac-d', carac: 'DC_P_ADVANTAGE_1_TEXT', note: 'Avantage 1 : texte.' },
    { sel: '.adv-grid .acard:nth-child(2) .ac-t', carac: 'DC_P_ADVANTAGE_2_TITLE', note: 'Avantage 2 : titre. La numérotation (pastille « 2 ») est retirée de la page : penser à gérer l\'ordre 1 à 5 via les caractéristiques.' },
    { sel: '.adv-grid .acard:nth-child(2) .ac-d', carac: 'DC_P_ADVANTAGE_2_TEXT', note: 'Avantage 2 : texte.' },
    { sel: '.adv-grid .acard:nth-child(3) .ac-t', carac: 'DC_P_ADVANTAGE_3_TITLE', note: 'Avantage 3 : titre. La numérotation (pastille « 3 ») est retirée de la page : penser à gérer l\'ordre 1 à 5 via les caractéristiques.' },
    { sel: '.adv-grid .acard:nth-child(3) .ac-d', carac: 'DC_P_ADVANTAGE_3_TEXT', note: 'Avantage 3 : texte.' },
    { sel: '.adv-grid .acard:nth-child(4) .ac-t', carac: 'DC_P_ADVANTAGE_4_TITLE', note: 'Avantage 4 : titre. La numérotation (pastille « 4 ») est retirée de la page : penser à gérer l\'ordre 1 à 5 via les caractéristiques.' },
    { sel: '.adv-grid .acard:nth-child(4) .ac-d', carac: 'DC_P_ADVANTAGE_4_TEXT', note: 'Avantage 4 : texte.' },
    { sel: '.adv-grid .acard:nth-child(5) .ac-t', carac: 'DC_P_ADVANTAGE_5_TITLE', note: 'Avantage 5 : titre. La numérotation (pastille « 5 ») est retirée de la page : penser à gérer l\'ordre 1 à 5 via les caractéristiques.' },
    { sel: '.adv-grid .acard:nth-child(5) .ac-d', carac: 'DC_P_ADVANTAGE_5_TEXT', note: 'Avantage 5 : texte.' },
    { sel: '#gammes-grid', carac: 'DC_P_LIEN_COMPATIBLE_PRODUCTS', note: 'Produits compatibles : vignettes des gammes. À faire : vérifier ce qui remonte de l\'API pour voir si on peut afficher le titre + la short description des produits et l\'image produit.' },
    { sel: '#ann-compat-note', carac: 'Aucune caractéristique', absent: true, dx: 14, dy: 0, note: 'Phrase retirée de la page : « Vous n\'avez aucun équipement à choisir ici. Le type d\'ASI, la batterie, les options et le niveau de contrat de maintenance se déterminent avec l\'expert SOCOMEC qui vous rappellera. »' },
    { sel: '#ann-specificites .ann-sp:nth-child(2) .ann-sp-t', carac: 'DC_P_SPECIFICITY_1_TITLE', manque: true, note: 'Spécificité 1 : titre.' },
    { sel: '#ann-specificites .ann-sp:nth-child(2) .ann-sp-x', carac: 'DC_P_SPECIFICITY_1_TEXT', manque: true, note: 'Spécificité 1 : texte.' },
    { sel: '#ann-specificites .ann-sp:nth-child(3) .ann-sp-t', carac: 'DC_P_SPECIFICITY_2_TITLE', manque: true, note: 'Spécificité 2 : titre.' },
    { sel: '#ann-specificites .ann-sp:nth-child(3) .ann-sp-x', carac: 'DC_P_SPECIFICITY_2_TEXT', manque: true, note: 'Spécificité 2 : texte.' },
    { sel: '#ann-specificites .ann-sp:nth-child(4) .ann-sp-t', carac: 'DC_P_SPECIFICITY_3_TITLE', manque: true, note: 'Spécificité 3 : titre.' },
    { sel: '#ann-specificites .ann-sp:nth-child(4) .ann-sp-x', carac: 'DC_P_SPECIFICITY_3_TEXT', manque: true, note: 'Spécificité 3 : texte.' },
    { sel: '#faq-t', carac: 'Aucune caractéristique', absent: true, note: 'Bloc « Questions fréquentes » : section à retirer de la page. Elle n\'existe pas au PIM, les questions sont rédigées pour la maquette à partir des textes des spécificités 2 et 3.' },
    { sel: '#ann-formules .ann-formule-txt', carac: 'DC_P_FORMULAS', manque: true, note: 'Formules : texte d\'exemple, bloc à ajouter après la FAQ.' }
  ],
  'mise-en-service.html': [],
  'location-asi.html': []
};
