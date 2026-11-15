import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { busyIntervals } from './busy.ts';
import { assignmentAlerts, digestBody, planDigest, reminderInstants, resolveReminderMinutes } from './reminders.ts';
import { eventReadLevel } from './visibility.ts';
import { mapDeviceEvent, toDeviceWrite } from '../calendar/map.ts';

describe('rappels', () => {
  it('propose 1 jour et 1 heure par défaut', () => {
    assert.deepEqual(resolveReminderMinutes(undefined), [1440, 60]);
    assert.deepEqual(resolveReminderMinutes([]), []);
  });

  it('place les rappels avant l’heure, et à 9 h pour une journée entière', () => {
    const from = new Date(2026, 10, 14, 8, 0, 0, 0).getTime();
    const timed = reminderInstants(
      { id: 'e', title: 'Dentiste', date: '2026-11-15', start: '15:00', durationMin: 30, repeat: 'none', memberIds: [], createdBy: 'a', updatedAt: 1 },
      from,
      2,
    );
    const dayBefore = new Date(2026, 10, 14, 15, 0, 0, 0).getTime();
    const hourBefore = new Date(2026, 10, 15, 14, 0, 0, 0).getTime();
    assert.ok(timed.includes(dayBefore));
    assert.ok(timed.includes(hourBefore));

    const allDay = reminderInstants(
      { id: 'a', title: 'Anniversaire', date: '2026-11-16', start: null, durationMin: 0, repeat: 'none', memberIds: [], createdBy: 'a', updatedAt: 1, reminderMinutes: [60] },
      from,
      3,
    );
    assert.deepEqual(allDay, [new Date(2026, 10, 16, 8, 0, 0, 0).getTime()]);
  });

  it('rédige le digest du matin et l’alerte d’assignation', () => {
    assert.match(digestBody([{ time: '09:00', title: 'École' }]), /École/);
    assert.match(digestBody([]), /Rien de prévu/);
    const digest = planDigest({ day: '2026-11-16', hour: 7, enabled: true, lines: [], now: new Date(2026, 10, 15, 12).getTime() });
    assert.equal(digest?.kind, 'digest');
    assert.equal(new Date(digest!.fireAt).getHours(), 7);
    const alerts = assignmentAlerts({
      previous: [],
      next: [{ id: 'e', title: 'Foot', date: '2026-11-16', start: '18:00', durationMin: 60, repeat: 'none', memberIds: ['me'], createdBy: 'other', updatedAt: 4 }],
      meId: 'me',
      actorName: () => 'Karim',
      now: 10,
    });
    assert.equal(alerts.length, 1);
    assert.match(alerts[0]!.body, /Karim/);
    assert.match(alerts[0]!.body, /Foot/);
  });
});

describe('qui est occupé', () => {
  it('masque le titre d’un événement privé et montre le créneau familial', () => {
    const members = [
      { id: 'me', role: 'membre', managed: false },
      { id: 'other', role: 'membre', managed: false },
    ];
    const slots = busyIntervals({
      day: '2026-11-15',
      viewer: members[0]!,
      members,
      links: [],
      events: [
        { id: '1', title: 'Secret', date: '2026-11-15', start: '10:00', durationMin: 30, repeat: 'none', memberIds: ['other'], createdBy: 'other', visibility: 'private' },
        { id: '2', title: 'Dîner', date: '2026-11-15', start: '19:00', durationMin: 90, repeat: 'none', memberIds: ['me', 'other'], createdBy: 'me', visibility: 'family' },
      ],
    });
    assert.equal(slots.some((slot) => slot.title === 'Secret'), false);
    assert.equal(slots.some((slot) => slot.title === 'Dîner'), true);
  });
});

describe('visibilité enfant', () => {
  it('un enfant voit le partage familial et ses propres événements, pas le privé des autres', () => {
    const child = { id: 'c', role: 'enfant', managed: false };
    const parent = { id: 'p', role: 'parent', managed: false };
    const members = [child, parent];
    const family = eventReadLevel(child, { id: 'f', memberIds: ['p'], createdBy: 'p', visibility: 'family' }, members, []);
    const own = eventReadLevel(child, { id: 'o', memberIds: ['c'], createdBy: 'p', visibility: 'private' }, members, []);
    const hidden = eventReadLevel(child, { id: 'h', memberIds: ['p'], createdBy: 'p', visibility: 'private' }, members, []);
    assert.equal(family, 'full');
    assert.equal(own, 'full');
    assert.equal(hidden, 'hidden');
  });
});

describe('calendrier du téléphone', () => {
  it('réimporte le même identifiant et n’écrit pas une journée entière comme un horaire', () => {
    const mapped = mapDeviceEvent(
      { id: 'abc', calendarId: 'home', title: '  Conseil  ', startDate: '2026-11-15T09:30:00', endDate: '2026-11-15T10:00:00', location: 'Mairie' },
      { familyId: 'fam', memberId: 'me', updatedAt: 3 },
    );
    assert.equal(mapped.id, 'cal_home_abc');
    assert.equal(mapped.visibility, 'private');
    assert.equal(mapped.title, 'Conseil');
    const again = mapDeviceEvent(
      { id: 'abc', calendarId: 'home', title: 'Conseil', startDate: '2026-11-15T09:30:00', endDate: '2026-11-15T10:00:00' },
      { familyId: 'fam', memberId: 'me', updatedAt: 4 },
    );
    assert.equal(again.id, mapped.id);
    const write = toDeviceWrite({ title: 'Fête', date: '2026-11-20', start: null, durationMin: 0 });
    assert.equal(write.allDay, true);
    assert.equal(write.endDate.getDate() - write.startDate.getDate(), 1);
  });
});
