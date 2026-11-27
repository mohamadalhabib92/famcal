/**
 * Mise en page iPhone / iPad / Mac.
 * La colonne large est plafonnée à 1040 pt. La barre latérale s’ouvre
 * à partir de 900 pt sur Mac et de 1024 pt sur iPad. L’iPhone, même en
 * paysage, ne prend pas la barre.
 */
export const CONTENT_MAX = 1040;
export const PHONE_CONTENT_MAX = 720;
export const CONTENT_WIDE_AT = 768;
export const MAC_SIDEBAR_AT = 900;
export const PAD_SIDEBAR_AT = 1024;
/** Un peu plus grand que l’iPhone, sans changer la grille. */
export const MAC_TYPE_BOOST = 1.08;

export type ShellInput = {
  width: number;
  pad: boolean;
  mac: boolean;
  tv: boolean;
  web: boolean;
};

export type ShellMetrics = {
  wide: boolean;
  contentMax: number;
  sidebar: boolean;
  typeBoost: number;
  keyboard: boolean;
};

export function shellMetrics(input: ShellInput): ShellMetrics {
  if (input.tv) {
    return { wide: false, contentMax: PHONE_CONTENT_MAX, sidebar: false, typeBoost: 1, keyboard: false };
  }
  const sidebar =
    (input.mac && input.width >= MAC_SIDEBAR_AT) ||
    (!input.mac && input.pad && input.width >= PAD_SIDEBAR_AT) ||
    (input.web && input.width >= PAD_SIDEBAR_AT);
  const wide = input.width >= CONTENT_WIDE_AT;
  return {
    wide,
    contentMax: wide ? CONTENT_MAX : PHONE_CONTENT_MAX,
    sidebar,
    typeBoost: input.mac ? MAC_TYPE_BOOST : 1,
    keyboard: input.mac || (input.web && input.width >= MAC_SIDEBAR_AT),
  };
}

export type HostFeature = 'haptics' | 'calendar' | 'notifications';

/** Faux pour ce qui n’existe pas sur le Mac « Designed for iPad », ni sur l’Apple TV, ni sur le web. */
export function hostAllows(feature: HostFeature, host: { mac: boolean; tv: boolean; web?: boolean }): boolean {
  if (host.tv || host.web) return false;
  if (host.mac && (feature === 'haptics' || feature === 'calendar' || feature === 'notifications')) return false;
  return true;
}

export type Shortcut = 'back' | 'search';

/** Échap recule hors d’un champ. Cmd+F ou Ctrl+F ouvre la recherche, même en saisie. */
export function shortcutFor(event: {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  typing?: boolean;
}): Shortcut | null {
  const find = (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'f';
  if (find) return 'search';
  if (event.typing) return null;
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (event.key === 'Escape' || event.key === 'escape') return 'back';
  return null;
}
