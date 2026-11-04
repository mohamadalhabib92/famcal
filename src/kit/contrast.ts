/** Rapport de contraste WCAG (texte normal : 4,5:1, grand texte et UI : 3:1). */
export function contrast(a: string, b: string): number {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length >= 6 ? h.slice(0, 6) : h;
  const channel = (i: number) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/**
 * Couleur pleine équivalente à `fg` posé à l’opacité `a` sur `bg`.
 * Sert au calcul du contraste des fonds teintés, et de repli opaque
 * quand « Réduire la transparence » est activé.
 */
export function mix(fg: string, bg: string, a: number): string {
  const p = (hex: string, i: number) => parseInt(hex.replace('#', '').slice(i, i + 2), 16);
  const k = Math.max(0, Math.min(1, a));
  let out = '#';
  for (const i of [0, 2, 4]) {
    const v = Math.round(p(fg, i) * k + p(bg, i) * (1 - k));
    out += v.toString(16).padStart(2, '0');
  }
  return out.toUpperCase();
}

/** Encre la plus lisible (noir doux ou blanc) sur un fond donné. */
export function bestInk(bg: string): string {
  return contrast('#FFFFFF', bg) >= contrast('#111111', bg) ? '#FFFFFF' : '#111111';
}

/** Toasts : fond neutre inversé, identique dans toute l’app. */
export const TOAST = {
  light: { bg: '#1D1D1F', fg: '#FFFFFF' },
  dark: { bg: '#F2F2F2', fg: '#111111' },
} as const;

/**
 * Garde la teinte mais la rapproche de `toward` (couleur de texte du thème)
 * jusqu’au seuil demandé sur `bg`. Utilisé pour les badges et puces teintés.
 */
export function ensureContrast(fg: string, bg: string, toward: string, min = 4.5): string {
  if (!/^#[0-9a-fA-F]{6}/.test(fg) || !/^#[0-9a-fA-F]{6}/.test(bg)) return fg;
  const base = fg.slice(0, 7);
  for (let k = 0; k <= 1.0001; k += 0.05) {
    const c = k === 0 ? base : mix(toward, base, k);
    if (contrast(c, bg) >= min) return c;
  }
  return toward;
}
