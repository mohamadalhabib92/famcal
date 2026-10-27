import type { Palette } from '@/kit/theme';

/** FamCal — clair et chaleureux (crème, corail, vert sapin). */
export const warm: Palette = {
  bg: '#FBF6F0',
  surface: '#FFFFFF',
  surface2: '#F4ECE2',
  border: '#E8DCCD',
  text: '#2A2019',
  textMuted: '#6F6052',
  primary: '#D9602E',
  primaryText: '#FFFFFF',
  accent: '#2F7D6D',
  success: '#2E8B57',
  warning: '#B7791F',
  danger: '#C53030',
  info: '#2B6CB0',
  dark: false,
  radius: 14,
  fontScale: 1,
};

/** Couleurs de membres (contraste ≥ 4,5:1 sur blanc pour le texte en gras). */
export const MEMBER_COLORS = ['#D9602E', '#2F7D6D', '#2B6CB0', '#8E44AD', '#B83280', '#B7791F', '#2C7A7B', '#4A5568'];
