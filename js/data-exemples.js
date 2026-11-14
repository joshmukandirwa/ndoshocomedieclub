// ============================================================
// DONNÉES D'EXEMPLE (démonstration)
// Affichées tant qu'aucun vrai contenu n'est publié depuis l'admin.
// Dès qu'un vrai témoignage / une vraie actualité est publié(e),
// ces exemples disparaissent automatiquement du site.
// ============================================================
export const EXEMPLES_TEMOIGNAGES = [
  { id: "ex1", nom: "Aline K.", note: 5, exemple: true,
    message: "Une soirée inoubliable ! J'ai ri du début à la fin, l'ambiance était chaleureuse et les artistes ont donné le meilleur d'eux-mêmes." },
  { id: "ex2", nom: "Patrick M.", note: 5, exemple: true,
    message: "Le Festival Punguza Stress m'a fait oublier tous mes soucis le temps d'un dimanche. Bravo au collectif, on veut plus de spectacles comme ça !" },
  { id: "ex3", nom: "Grâce B.", note: 4, exemple: true,
    message: "Très bonne organisation et des humoristes vraiment talentueux. J'ai emmené ma famille et tout le monde a adoré." },
  { id: "ex4", nom: "Jonathan S.", note: 5, exemple: true,
    message: "Enfin un club d'humour à Goma qui valorise nos talents locaux. Les sketchs étaient drôles et intelligents. Je reviendrai sans hésiter." },
  { id: "ex5", nom: "Esther T.", note: 4, exemple: true,
    message: "Une belle énergie, un public super et beaucoup de rires. Rendez-vous à la prochaine édition avec mes amis !" },
];

export const EXEMPLES_ACTUS = [
  { id: "ex-a1", type: "annonce", image: "images/punguza-2027-900.jpg", titre: "Festival Punguza Stress : 2e édition le 24 janvier 2027", epingle: true, views: 482, date: "2026-11-10T09:00:00",
    contenu: "Le rendez-vous est pris : la 2e édition du Festival Punguza Stress aura lieu le dimanche 24 janvier 2027 à Goma.\nLe lieu reste un secret et sera dévoilé très bientôt. Gardez la date et suivez-nous pour ne rien manquer." },
  { id: "ex-a2", type: "communique", image: "images/og-image.jpg", titre: "Communiqué : ouverture de la billetterie en ligne", views: 317, date: "2026-11-06T14:30:00",
    contenu: "Le Ndosho Comédie Club informe le public que la réservation des billets est désormais possible directement sur le site.\nChaque billet reçoit un QR code unique, vérifié à l'entrée. Merci de ne l'acheter que sur nos canaux officiels." },
  { id: "ex-a3", type: "actualite", image: "images/replay-festival-640.jpg", titre: "Les humoristes du collectif en répétition générale", views: 205, date: "2026-11-02T18:00:00",
    contenu: "Les artistes du collectif préparent activement leurs nouveaux sketchs. Au programme : du stand-up, des improvisations et plusieurs surprises que nous gardons pour le jour J.\nDes photos et extraits de répétition arrivent bientôt dans la galerie." },
  { id: "ex-a4", type: "message", titre: "Un grand merci à notre public", views: 154, date: "2026-10-28T11:00:00",
    contenu: "Merci à tous ceux qui sont venus rire avec nous, qui ont partagé nos vidéos et nous ont laissé leurs témoignages.\nC'est grâce à vous que l'humour continue de rassembler Goma." },
  { id: "ex-a5", type: "evenement", titre: "Appel à partenaires : associez votre marque au rire", views: 98, date: "2026-10-20T08:30:00",
    contenu: "Vous dirigez une entreprise ou une institution à Goma ? Devenez partenaire du Ndosho Comédie Club et gagnez en visibilité auprès de plusieurs milliers de spectateurs.\nÉcrivez-nous depuis la page Contacts pour recevoir notre dossier de partenariat." },
];
