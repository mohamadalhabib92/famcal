import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kitPairs, type Pair } from '@/kit/a11yPairs';
import { contrast, ensureContrast, mix } from '@/kit/contrast';
import { createVibrationPref } from '@/kit/vibrations';
import { MEMBER_COLORS, night, readableOn, warm } from '@/theme';

/** Contraste AA des composants du kit, palette claire (warm) ET nuit. */
test('contraste AA de tous les composants, en clair et en sombre', () => {
  const failures: string[] = [];
  for (const [name, p] of [['clair', warm], ['nuit', night]] as const) {
    const ink = (c: string, a: number) => ensureContrast(readableOn(c, p.dark), mix(c, p.surface, a), p.text);
    const chip = (c: string) => ensureContrast(ink(c, 0.16), mix(c, p.bg, 0.16), p.text);
    const pairs: Pair[] = kitPairs(p, name, {
      buttons: [
        ['principal', p.primaryText, p.primaryInk],
        ['danger', p.primaryText, p.danger],
        ['succès', p.primaryText, p.success],
      ],
      ghostInk: p.primaryInk,
      chipInk: chip,
      badgeInk: (c) => ink(c, 0.15),
      badgeColors: [
        ['succès', p.success],
        ['alerte', p.warning],
        ['accent', p.accent],
        ['danger', p.danger],
        ['info', p.info],
        ['discret', p.textMuted],
        ...MEMBER_COLORS.map((c, i) => [`membre ${i + 1}`, c] as [string, string]),
      ],
      toast: { bg: p.toastBg, fg: p.toastText },
      fieldError: p.danger,
      emptyInk: p.primaryInk,
    });
    for (const [label, fg, bg, min] of pairs) {
      const r = contrast(fg, bg);
      if (r < min) failures.push(`${label} : ${r.toFixed(2)} < ${min}`);
    }
  }
  assert.equal(failures.length, 0, 'Contraste insuffisant :\n' + failures.join('\n'));
});

test('Vibrations : activées par défaut, clé dédiée, aucune autre clé touchée', async () => {
  const mem = new Map<string, string>([['famcal:v1', '{"members":[]}']]);
  const storage = {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
  };
  const pref = createVibrationPref(storage, 'famcal:vibrations@v1');
  await pref.hydrate();
  assert.equal(pref.get(), true);
  pref.set(false);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(mem.get('famcal:vibrations@v1'), 'off');
  assert.equal(mem.get('famcal:v1'), '{"members":[]}');
  assert.equal(mem.size, 2);
});
