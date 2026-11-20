import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contrast, night, warm } from './theme.ts';

function pairs(name: string, palette: typeof warm) {
  it(`${name} : texte, bouton et surface passent le AA`, () => {
    assert.ok(contrast(palette.text, palette.bg) >= 4.5, 'texte / fond');
    assert.ok(contrast(palette.text, palette.surface) >= 4.5, 'texte / carte');
    assert.ok(contrast(palette.textMuted, palette.bg) >= 4.5, 'secondaire / fond');
    assert.ok(contrast(palette.primaryText, palette.primaryInk) >= 4.5, 'bouton');
    assert.ok(contrast(palette.onWarning, palette.warning) >= 4.5, 'alerte');
  });
}

describe('contraste', () => {
  pairs('clair', warm);
  pairs('sombre', night);
});
