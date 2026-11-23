import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { planNotificationWork } from './guard.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('rappels au lancement', () => {
  const base = { platform: 'ios', tv: false, appActive: true, available: true, permission: null as const, asked: false };

  it('ne touche pas le natif tant que l’app n’est pas active, ou hors iPhone', () => {
    assert.deepEqual(planNotificationWork({ ...base, appActive: false }), []);
    assert.deepEqual(planNotificationWork({ ...base, platform: 'web' }), []);
    assert.deepEqual(planNotificationWork({ ...base, tv: true }), []);
    assert.deepEqual(planNotificationWork({ ...base, available: false }), []);
  });

  it('lit la permission avant toute demande, et ne programme que si elle est accordée', () => {
    assert.deepEqual(planNotificationWork(base), ['read-permission']);
    assert.deepEqual(planNotificationWork({ ...base, permission: 'undetermined' }), ['read-permission', 'request-permission']);
    assert.deepEqual(planNotificationWork({ ...base, permission: 'undetermined', asked: true }), ['read-permission']);
    assert.deepEqual(planNotificationWork({ ...base, permission: 'denied' }), ['read-permission']);
    assert.deepEqual(planNotificationWork({ ...base, permission: 'granted' }), ['read-permission', 'schedule']);
  });

  it('n’importe pas le baril expo-notifications ni le jeton push', () => {
    const run = readFileSync(join(root, 'src/notifications/run.ts'), 'utf8');
    assert.equal(run.includes("from 'expo-notifications'"), false);
    assert.equal(run.includes('expo-notifications/build/DevicePushTokenAutoRegistration'), false);
    assert.equal(run.includes('getDevicePushTokenAsync'), false);
    assert.match(run, /NotificationPermissions/);
    assert.match(run, /cancelAllScheduledNotificationsAsync/);
    const calendar = readFileSync(join(root, 'src/calendar/device.ts'), 'utf8');
    const body = calendar.slice(calendar.indexOf('export async function importDeviceCalendars'), calendar.indexOf('export async function mirrorToDevice'));
    assert.match(body, /try \{/);
    assert.match(body, /catch/);
    assert.match(body, /requestCalendarPermissionsAsync/);
  });
});
