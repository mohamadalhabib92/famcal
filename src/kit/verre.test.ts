import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contrast, night, warm } from '../theme.ts';
import { composite, lightVerre, nightVerre, relief } from './verre.ts';

describe('verre', () => {
  it('aligne les aplats opaques sur les surfaces déjà testées', () => {
    assert.equal(lightVerre.solid, warm.surface);
    assert.equal(lightVerre.fillHex, warm.surface);
    assert.equal(nightVerre.solid, night.surface);
    assert.equal(nightVerre.fillHex, night.surface);
  });

  it('garde le AA sur le pire fond derrière le verre', () => {
    const lightWorst = composite('#FFFFFF', lightVerre.fillHex, lightVerre.fillAlpha);
    assert.ok(contrast(warm.text, lightWorst) >= 4.5, `texte clair ${contrast(warm.text, lightWorst)}`);
    assert.ok(contrast(warm.textMuted, lightWorst) >= 4.5, `secondaire clair ${contrast(warm.textMuted, lightWorst)}`);
    const darkWorst = composite('#FFFFFF', nightVerre.fillHex, nightVerre.fillAlpha);
    assert.ok(contrast(night.text, darkWorst) >= 4.5, `texte sombre ${contrast(night.text, darkWorst)}`);
    assert.ok(contrast(night.textMuted, darkWorst) >= 4.5, `secondaire sombre ${contrast(night.textMuted, darkWorst)}`);
    const darkOnPage = composite(night.bg, nightVerre.fillHex, nightVerre.fillAlpha);
    assert.ok(contrast(night.textMuted, darkOnPage) >= 4.5);
  });

  it('donne aux boutons une hauteur au repos et un enfoncement à la pression', () => {
    const idle = relief(false, false, false);
    const pressed = relief(false, true, false);
    const pressedStill = relief(true, true, true);
    assert.ok(idle.ambientRadius > pressed.ambientRadius);
    assert.ok(idle.ambientY > pressed.ambientY);
    assert.ok(idle.contactRadius > pressed.contactRadius);
    assert.notEqual(idle.highlight, pressed.highlight);
    assert.equal(pressed.translateY, 1);
    assert.equal(pressedStill.translateY, 0);
    assert.ok(idle.highlight.length > 0);
  });
});
