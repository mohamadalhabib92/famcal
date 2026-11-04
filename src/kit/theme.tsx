import React, { createContext, useContext, useMemo } from 'react';
import { useReduceTransparency } from './a11y';
import { mix } from './contrast';

export type Palette = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  /** Texte et fonds de bouton : variante assombrie de primary, contraste AA. */
  primaryInk: string;
  primaryText: string;
  accent: string;
  success: string;
  warning: string;
  /** Texte posé sur `warning` (badge hors ligne). */
  onWarning: string;
  danger: string;
  info: string;
  toastBg: string;
  toastText: string;
  shadow: string;
  overlay: string;
  dark: boolean;
  radius: number;
  fontScale: number;
};

const Ctx = createContext<Palette | null>(null);

/** Fond plein utilisé par alpha() quand « Réduire la transparence » est actif. */
let solidBase: string | null = null;

export function ThemeProvider({ value, children }: { value: Palette; children: React.ReactNode }) {
  const reduceTransparency = useReduceTransparency();
  solidBase = reduceTransparency ? value.surface : null;
  // Nouvelle référence quand le réglage change : tous les écrans se redessinent.
  const v = useMemo(() => ({ ...value }), [value, reduceTransparency]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useTheme(): Palette {
  const v = useContext(Ctx);
  if (!v) throw new Error('ThemeProvider manquant');
  return v;
}

/** Ajoute une transparence (00-ff) à une couleur hex #rrggbb (pleine si « Réduire la transparence »). */
export function alpha(hex: string, a: number): string {
  // Réduire la transparence : couleur pleine équivalente (aucun voile).
  if (solidBase && /^#[0-9a-fA-F]{6}$/.test(hex)) return mix(hex, solidBase, a);
  const h = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex.length === 7 ? hex + h : hex;
}
