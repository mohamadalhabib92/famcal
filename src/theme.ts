import type { Palette } from '@/kit/theme';

/**
 * FamCal — tokens uniques.
 * La marque reste corail #D9602E (fonds larges, icône, FAB).
 * `primaryInk` est la variante texte / bouton : #D9602E sur crème ne passe pas
 * le AA du petit texte (3,45:1), le blanc sur #D9602E non plus (3,71:1).
 */
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
  radius: 14,
  fontScale: 1,
};

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

/**
 * Palette nuit : mêmes teintes de marque (orange FamCal, vert sapin), éclaircies
 * pour rester AA sur fond sombre. Texte sur boutons : encre (#1A140F).
 */
export const night: Palette = {
  bg: '#15110E',
  surface: '#201A16',
  surface2: '#2B241F',
  border: '#3B322B',
  text: '#F6EEE6',
  textMuted: '#C4B5A7',
  primary: '#E0703F',
  primaryInk: '#F29466',
  primaryText: '#1A140F',
  accent: '#5FB8A5',
  success: '#5CC08A',
  warning: '#E3AC52',
  onWarning: '#1A140F',
  danger: '#F2837A',
  info: '#79B1EC',
  toastBg: '#F4ECE2',
  toastText: '#1A140F',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.6)',
  dark: true,
  radius: 14,
  fontScale: 1,
};

/** Palette selon l’apparence du système (clair par défaut). */
export function paletteFor(scheme: string | null | undefined): Palette {
  return scheme === 'dark' ? night : warm;
}

/** Couleur de texte sur fond nuit : éclaircit jusqu’au AA 4,5:1. */
export function readableOnDark(color: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return night.text;
  let n = parseInt(color.slice(1), 16);
  for (let i = 0; i <= 48; i++) {
    const hex = '#' + n.toString(16).padStart(6, '0');
    if (contrast(hex, night.surface) >= 4.5 && contrast(hex, night.bg) >= 4.5) return hex;
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    const up = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.08));
    const next = (up(r) << 16) | (up(g) << 8) | up(b);
    if (next === n) break;
    n = next;
  }
  return night.text;
}

/** Texte coloré lisible dans le thème courant. */
export function readableOn(color: string, dark: boolean): string {
  return dark ? readableOnDark(color) : readableOnLight(color);
}
