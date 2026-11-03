import { isConfigured } from '@/kit/config';

/**
 * Journal de crash. Désactivé tant que EXPO_PUBLIC_SENTRY_DSN est absent
 * ou vaut un placeholder YOUR_*. Aucun envoi au démarrage.
 * Un échec d’envoi (réseau, 402, DSN illisible) est ignoré : jamais bloquant.
 */
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
export const sentryEnabled = isConfigured(dsn);

type ParsedDsn = { key: string; storeUrl: string };

function parseDsn(value: string): ParsedDsn | null {
  const match = /^https?:\/\/([^@]+)@([^/]+)\/(\d+)\/?$/.exec(value.trim());
  if (!match) return null;
  const [, key, host, project] = match;
  return { key, storeUrl: `https://${host}/api/${project}/envelope/?sentry_key=${encodeURIComponent(key)}` };
}

const parsed = sentryEnabled ? parseDsn(dsn) : null;

export function captureException(error: unknown, context?: string) {
  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Erreur inconnue');
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error('[FamCal]', context ?? 'erreur', err);
  }
  if (!parsed) return;
  const event = {
    event_id: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    level: 'error',
    logger: 'famcal',
    message: err.message.slice(0, 500),
    exception: {
      values: [{ type: err.name || 'Error', value: err.message.slice(0, 500), stacktrace: err.stack ? { frames: [{ filename: 'app', function: context ?? 'capture' }] } : undefined }],
    },
    tags: context ? { context: context.slice(0, 80) } : undefined,
  };
  const body = `{"sent_at":"${event.timestamp}","dsn":${JSON.stringify(dsn)}}\n{"type":"event"}\n${JSON.stringify(event)}`;
  const ctrl = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(4000) : undefined;
  void fetch(parsed.storeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-sentry-envelope' },
    body,
    signal: ctrl,
  }).catch(() => {
    /* service optionnel : 402, hors ligne, ou DSN refusé — l’app continue */
  });
}

let installed = false;

/** Branche les erreurs non rattrapées. Idempotent, sans appel réseau si Sentry est absent. */
export function installCrashReporting() {
  if (installed) return;
  installed = true;
  const g = globalThis as {
    ErrorUtils?: {
      getGlobalHandler: () => (error: unknown, fatal?: boolean) => void;
      setGlobalHandler: (handler: (error: unknown, fatal?: boolean) => void) => void;
    };
  };
  const eu = g.ErrorUtils;
  if (eu?.getGlobalHandler && eu.setGlobalHandler) {
    const prev = eu.getGlobalHandler();
    eu.setGlobalHandler((error, fatal) => {
      captureException(error, fatal ? 'fatal' : 'js');
      try {
        prev?.(error, fatal);
      } catch {
        /* le handler précédent ne doit pas rallumer une boucle */
      }
    });
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (ev) => captureException(ev.error ?? ev.message, 'window'));
    window.addEventListener('unhandledrejection', (ev) => captureException(ev.reason, 'promise'));
  }
}
