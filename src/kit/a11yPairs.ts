import type { Palette } from './theme';
import { bestInk, ensureContrast, mix } from './contrast';

/** [libellé, encre, fond, seuil] — 4,5 pour le texte, 3 pour icônes et contours. */
export type Pair = [string, string, string, number];

/** Ce que les composants de CETTE app dessinent réellement. */
export type KitSpec = {
  /** [nom, texte, fond] de chaque variante de bouton plein. */
  buttons: [string, string, string][];
  /** Texte du bouton discret (ghost). */
  ghostInk: string;
  /** Encre d’une puce sélectionnée / d’un badge pour une couleur donnée. */
  chipInk: (c: string) => string;
  badgeInk: (c: string) => string;
  /** Couleurs de badge utilisées par l’app (en plus du neutre). */
  badgeColors: [string, string][];
  toast: { bg: string; fg: string };
  /** Encre de l’icône d’état vide (inkOf). */
  emptyInk: string;
  fieldError: string;
};

/**
 * Tous les couples encre/fond dessinés par les composants du kit
 * (fonds teintés ramenés à leur couleur pleine équivalente, celle aussi
 * utilisée quand « Réduire la transparence » est activé).
 */
export function kitPairs(p: Palette, name: string, spec: KitSpec): Pair[] {
  const out: Pair[] = [];
  const add = (label: string, fg: string, bg: string, min = 4.5) => out.push([`${name} · ${label}`, fg, bg, min]);
  for (const [k, bg] of [['fond', p.bg], ['surface', p.surface], ['surface 2', p.surface2]] as const) {
    add(`texte / ${k}`, p.text, bg);
    add(`texte atténué / ${k}`, p.textMuted, bg);
  }
  for (const [k, fg, bg] of spec.buttons) add(`bouton ${k}`, fg, bg);
  add('bouton discret / fond', spec.ghostInk, p.bg);
  add('bouton discret / surface', spec.ghostInk, p.surface);
  add('bouton secondaire', p.text, p.surface2);
  add('puce sélectionnée / surface', spec.chipInk(p.primary), mix(p.primary, p.surface, 0.16));
  add('puce sélectionnée / fond', spec.chipInk(p.primary), mix(p.primary, p.bg, 0.16));
  add('segment actif', p.text, p.surface);
  add('segment inactif', p.textMuted, p.surface2);
  for (const [k, c] of [['info', p.info], ['alerte', p.warning], ['danger', p.danger], ['succès', p.success], ['accent', p.accent]] as const) {
    const bg = mix(c, p.bg, 0.12);
    add(`bandeau ${k} : texte`, p.text, bg);
    add(`bandeau ${k} : icône`, ensureContrast(c, bg, p.text, 3), bg, 3);
  }
  for (const [k, c] of [['neutre', p.textMuted] as [string, string], ...spec.badgeColors]) {
    add(`badge ${k} / surface`, spec.badgeInk(c), mix(c, p.surface, 0.15));
  }
  const halo = mix(p.primary, mix(p.primary, p.bg, p.dark ? 0.1 : 0.07), p.dark ? 0.2 : 0.14);
  add('état vide : icône', ensureContrast(spec.emptyInk, halo, p.text, 3), halo, 3);
  const warnHalo = mix(p.warning, p.bg, 0.14);
  add('état d’erreur : icône', ensureContrast(p.warning, warnHalo, p.text, 3), warnHalo, 3);
  add('réussite : icône', p.success, mix(p.success, p.surface, 0.16), 3);
  add('champ : erreur', spec.fieldError, p.bg);
  add('toast : texte', spec.toast.fg, spec.toast.bg);
  for (const [k, tone] of [['info', p.info], ['succès', p.success], ['erreur', p.danger]] as const) add(`toast ${k} : pictogramme`, bestInk(tone), tone, 3);
  add('hors ligne', p.onWarning, p.warning);
  return out;
}
