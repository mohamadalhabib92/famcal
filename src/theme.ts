import type { Palette } from '@/kit/theme';

/**
 * Familycal — tokens.
 * Clair : crème et corail. Sombre : encre chaude, le corail reste la marque.
 * `primaryInk` est le fond de bouton (contraste AA avec `primaryText`).
 */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const motionMs = { fast: 120, base: 200, slow: 320 } as const;
export const radii = { sm: 12, md: 16, lg: 20, xl: 28, pill: 999 } as const;

export const warm: Palette = {
  bg: '#FBF6F0',
  surface: '#FFFFFF',
  surface2: '#F4ECE2',
  border: '#E8DCCD',
  text: '#2A2019',
  textMuted: '#6F6052',
  primary: '#D9602E',
  primaryInk: '#B85227',
  primaryText: '#FFFFFF',
  accent: '#2F7D6D',
  /** #2E8B57 + texte blanc = 4,25:1. #2C8554 passe le AA (4,58:1). */
  success: '#2C8554',
  warning: '#B7791F',
  onWarning: '#1A140F',
  danger: '#C53030',
  info: '#2B6CB0',
  toastBg: '#1D1D1F',
  toastText: '#FFFFFF',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.45)',
  dark: false,
  radius: radii.lg,
  fontScale: 1,
};

export const night: Palette = {
  bg: '#14110F',
  surface: '#211C18',
  surface2: '#2C261F',
  border: '#3F362F',
  text: '#F7F2EB',
  textMuted: '#D2C3B4',
  primary: '#E7A88A',
  primaryInk: '#F3D7C8',
  primaryText: '#2A160F',
  accent: '#9ED9CC',
  success: '#9ED9B4',
  warning: '#E8C98A',
  onWarning: '#1A140F',
  danger: '#F0B4B4',
  info: '#B7D0F2',
  toastBg: '#F7F2EB',
  toastText: '#1A140F',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.62)',
  dark: true,
  radius: radii.lg,
  fontScale: 1,
};

export function paletteFor(appearance: 'system' | 'light' | 'dark', scheme: 'light' | 'dark' | null | undefined): Palette {
  const dark = appearance === 'dark' || (appearance === 'system' && scheme === 'dark');
  return dark ? night : warm;
}

/**
 * 8 teintes de membres, toujours accompagnées d’une initiale.
 * Les valeurs déjà enregistrées sur un profil ne sont pas réécrites.
 * Le glyphe choisit blanc ou encre via `inkOn` (le doré #B7791F échoue en blanc).
 */
export const MEMBER_COLORS = ['#D9602E', '#2F7D6D', '#2B6CB0', '#8E44AD', '#B83280', '#B7791F', '#2C7A7B', '#4A5568'];

const PAPER = '#FFFFFF';
const CREAM = '#FBF6F0';
const INK = '#1A140F';

function channel(c: number) {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport WCAG de deux couleurs #rrggbb. */
export function contrast(a: string, b: string): number {
  if (!/^#[0-9a-fA-F]{6}$/.test(a) || !/^#[0-9a-fA-F]{6}$/.test(b)) return 1;
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Glyphe (initiale, coche) lisible sur un fond coloré. */
export function inkOn(bg: string): string {
  return contrast(PAPER, bg) >= 4.5 ? PAPER : INK;
}

/** Couleur de texte sur crème / blanc : assombrit jusqu’au AA 4,5:1. */
export function readableOnLight(color: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return INK;
  let n = parseInt(color.slice(1), 16);
  for (let i = 0; i <= 48; i++) {
    const hex = '#' + n.toString(16).padStart(6, '0');
    if (contrast(hex, PAPER) >= 4.5 && contrast(hex, CREAM) >= 4.5) return hex;
    const r = Math.round(((n >> 16) & 255) * 0.94);
    const g = Math.round(((n >> 8) & 255) * 0.94);
    const b = Math.round((n & 255) * 0.94);
    const next = (r << 16) | (g << 8) | b;
    if (next === n) break;
    n = next;
  }
  return INK;
}
