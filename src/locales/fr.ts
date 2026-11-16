/** Textes français. Le nom affiché est Familycal ; le slug et la clé locale restent famcal. */
export const fr = {
  appName: 'Familycal',
  tagline: 'Le calendrier partagé de toute la famille — chacun voit les plans, personne n’oublie.',
  localMode: 'Mode local : les agendas restent sur cet appareil. La synchronisation familiale démarre lorsque Supabase est configuré.',
  syncPending: 'Modifications en attente. Elles partent dès que la synchronisation répond.',
  calendarPermission:
    'Familycal peut lire les agendas que vous choisissez sur ce téléphone, et, si vous l’activez, recopier ses événements dans un agenda de l’appareil. Rien n’est lu sans votre accord. L’agenda familial fonctionne sans cette autorisation.',
  reminderDefault: 'Rappels par défaut : 1 jour avant et 1 heure avant.',
  digest: 'Chaque matin, une notification résume les plans du jour.',
  assignment: 'Quand un événement qui vous concerne arrive ou change, cet appareil vous prévient.',
  privacyChild:
    'Un tuteur voit les événements des enfants. Un enfant voit les événements partagés avec toute la famille, et les siens.',
  busy: 'Qui est occupé',
  visibilityFamily: 'Toute la famille',
  visibilitySelected: 'Personnes choisies',
  visibilityPrivate: 'Privé',
  roleGuardian: 'Tuteur',
  roleParent: 'Parent',
  roleMember: 'Membre',
  roleChild: 'Enfant',
} as const;

export type LocaleKey = keyof typeof fr;
