import { isConfigured, type ConfigEntry } from '@/kit/config';

export const ENV = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'YOUR_SUPABASE_URL',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'YOUR_SUPABASE_ANON_KEY',
};

export const CONFIG: ConfigEntry[] = [
  { name: 'EXPO_PUBLIC_SUPABASE_URL', value: ENV.supabaseUrl, note: 'Synchronisation cloud + e-mail OTP réel (RLS par famille)' },
  { name: 'EXPO_PUBLIC_SUPABASE_ANON_KEY', value: ENV.supabaseAnonKey, secret: true, note: 'Clé publique « anon », protégée par RLS' },
  { name: 'TWILIO_ACCOUNT_SID (serveur)', value: 'YOUR_TWILIO_ACCOUNT_SID', phase: 'Phase 2', note: 'SMS — côté serveur uniquement' },
  { name: 'TWILIO_AUTH_TOKEN (serveur)', value: 'YOUR_TWILIO_AUTH_TOKEN', secret: true, phase: 'Phase 2', note: 'Secret serveur, jamais dans l’app' },
  { name: 'TWILIO_FROM_NUMBER (serveur)', value: 'YOUR_TWILIO_FROM_NUMBER', phase: 'Phase 2', note: 'Numéro expéditeur SMS' },
];

export const cloudReady = () => isConfigured(ENV.supabaseUrl) && isConfigured(ENV.supabaseAnonKey);
/** SMS : jamais disponible dans l'app tant que le serveur Twilio (Phase 2) n'existe pas. */
export const smsReady = () => false;
