/**
 * Verre — surfaces translucides partagées (clair et sombre).
 * Le texte est mesuré sur le pire fond (orbe blanc derrière le verre),
 * pas seulement sur la couleur de page. Réduire la transparence revient
 * aux aplats opaques déjà testés AA.
 */

export type Verre = {
  solid: string;
  fill: string;
  fillHex: string;
  fillAlpha: number;
  stroke: string;
  highlight: string;
  wash: string;
  wash2: string;
};

export const lightVerre: Verre = {
  solid: '#FFFFFF',
  fill: 'rgba(255,255,255,0.58)',
  fillHex: '#FFFFFF',
  fillAlpha: 0.58,
  stroke: 'rgba(255,255,255,0.74)',
  highlight: 'rgba(255,255,255,0.96)',
  wash: 'rgba(217,96,46,0.22)',
  wash2: 'rgba(47,125,109,0.18)',
};

/** 0,80 de #211C18 : le texte secondaire reste ≥ 4,5:1 même sur un orbe blanc. */
export const nightVerre: Verre = {
  solid: '#211C18',
  fill: 'rgba(33,28,24,0.80)',
  fillHex: '#211C18',
  fillAlpha: 0.8,
  stroke: 'rgba(255,255,255,0.16)',
  highlight: 'rgba(255,255,255,0.34)',
  wash: 'rgba(231,168,138,0.22)',
  wash2: 'rgba(158,217,204,0.12)',
};

export function verreFor(dark: boolean): Verre {
  return dark ? nightVerre : lightVerre;
}

export function composite(bottom: string, top: string, alpha: number): string {
  const bn = parseInt(bottom.slice(1), 16);
  const tn = parseInt(top.slice(1), 16);
  const channel = (shift: number) => {
    const b = (bn >> shift) & 255;
    const t = (tn >> shift) & 255;
    return Math.round(t * alpha + b * (1 - alpha));
  };
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(channel(16))}${hex(channel(8))}${hex(channel(0))}`;
}

export type Relief = {
  shadow: string;
  ambientOpacity: number;
  ambientRadius: number;
  ambientY: number;
  contactOpacity: number;
  contactRadius: number;
  contactY: number;
  elevation: number;
  translateY: number;
  highlight: string;
};

/** Deux ombres (contact + ambiance) et un liseré clair. L’enfoncement ne translate pas si les animations sont réduites. */
export function relief(dark: boolean, pressed: boolean, reduceMotion: boolean): Relief {
  const shadow = dark ? '#000000' : '#3A2418';
  const highlight = pressed
    ? dark
      ? 'rgba(255,255,255,0.10)'
      : 'rgba(255,255,255,0.42)'
    : dark
      ? 'rgba(255,255,255,0.34)'
      : 'rgba(255,255,255,0.96)';
  if (pressed) {
    return {
      shadow,
      ambientOpacity: dark ? 0.22 : 0.07,
      ambientRadius: 3,
      ambientY: 1,
      contactOpacity: dark ? 0.28 : 0.12,
      contactRadius: 1,
      contactY: 1,
      elevation: 1,
      translateY: reduceMotion ? 0 : 1,
      highlight,
    };
  }
  return {
    shadow,
    ambientOpacity: dark ? 0.48 : 0.16,
    ambientRadius: 18,
    ambientY: 10,
    contactOpacity: dark ? 0.4 : 0.14,
    contactRadius: 3,
    contactY: 2,
    elevation: 8,
    translateY: 0,
    highlight,
  };
}
