import { en } from './en';
import { fr } from './fr';

export const locales = { fr, en } as const;
export type LocaleId = keyof typeof locales;

/** L’interface de l’app est en français. L’anglais est le second catalogue présent. */
export const strings = locales.fr;
