import { Platform } from 'react-native';
import { createPersistedStore, uid } from '@/kit/store';
import { isoDay } from '@/kit/format';
import { MEMBER_COLORS } from '@/theme';

/* ------------------------------------------------------------------ */
/* Modèle (aligné sur le futur schéma : family_id, member_id, guardian_links) */
/* ------------------------------------------------------------------ */

export type Role = 'tuteur' | 'parent' | 'membre';
export type ManagedKind = 'enfant' | 'dependant';

export type Member = {
  id: string; // member_id
  familyId: string; // family_id
  name: string; // prénom uniquement (minimisation)
  color: string;
  role: Role;
  /** Profil géré : pas de compte, pas d'e-mail, édité par ses tuteurs. */
  managed: boolean;
  kind?: ManagedKind;
  birthYear?: number;
  /** Uniquement pour les adultes avec compte. */
  email?: string;
  createdAt: number;
};

export type GuardianLink = {
  id: string;
  familyId: string;
  guardianId: string;
  wardId: string;
  /** Consentement du tuteur au partage des détails du profil géré avec toute la famille. */
  consentShare: boolean;
  createdAt: number;
};

export type CalEvent = {
  id: string;
  familyId: string;
  title: string;
  date: string; // YYYY-MM-DD (1re occurrence)
  start: string | null; // HH:MM, null = journée entière
  durationMin: number;
  memberIds: string[];
  location?: string;
  notes?: string;
  repeat: 'none' | 'weekly';
  until?: string;
  createdBy: string;
  updatedAt: number;
};

export type Invite = {
  code: string;
  familyId: string;
  role: Exclude<Role, 'tuteur'> | 'tuteur';
  label?: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  acceptedBy?: string;
  revoked?: boolean;
};

export type View = 'jour' | 'semaine' | 'mois';

export type State = {
  session: { email: string; method: 'otp' | 'lien'; at: number } | null;
  pendingOtp: { email: string; code: string; expiresAt: number } | null;
  family: { id: string; name: string; createdAt: number } | null;
  meId: string | null;
  members: Member[];
  links: GuardianLink[];
  events: CalEvent[];
  invites: Invite[];
  isDemo: boolean;
  onboarded: boolean;
  prefs: { view: View; hidden: string[]; cursor: string };
  updatedAt: number;
};

const initial = (): State => ({
  session: null,
  pendingOtp: null,
  family: null,
  meId: null,
  members: [],
  links: [],
  events: [],
  invites: [],
  isDemo: false,
  onboarded: false,
  prefs: { view: 'semaine', hidden: [], cursor: isoDay(new Date()) },
  updatedAt: Date.now(),
});

export const store = createPersistedStore<State>('famcal', initial, 1);

/* ------------------------------------------------------------------ */
/* « Temps réel doux » : synchronisation entre onglets du même appareil   */
/* (BroadcastChannel, web). La sync multi-appareils = Supabase Realtime. */
/* ------------------------------------------------------------------ */

type BC = { postMessage: (m: unknown) => void; onmessage: ((e: { data: unknown }) => void) | null };
let channel: BC | null = null;
const tabId = uid('tab');
if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && 'BroadcastChannel' in globalThis) {
  try {
    const Ctor = (globalThis as unknown as { BroadcastChannel: new (n: string) => BC }).BroadcastChannel;
    channel = new Ctor('famcal-sync');
    channel.onmessage = (e) => {
      const msg = e.data as { from: string; state: State } | null;
      if (!msg || msg.from === tabId || !msg.state) return;
      const cur = store.get();
      if (msg.state.updatedAt > cur.updatedAt) store.set({ ...msg.state, prefs: cur.prefs, session: cur.session, meId: cur.meId });
    };
  } catch {
    channel = null;
  }
}
export const realtimeLocal = () => channel !== null;

/** Toute mutation de données passe ici (horodatage + diffusion aux autres onglets). */
export function mutate(fn: (s: State) => State) {
  store.set((s) => ({ ...fn(s), updatedAt: Date.now() }));
  try {
    channel?.postMessage({ from: tabId, state: store.get() });
  } catch {
    /* service optionnel : on ignore */
  }
}
export const setPrefs = (p: Partial<State['prefs']>) => store.set((s) => ({ ...s, prefs: { ...s.prefs, ...p } }));

/* ------------------------------------------------------------------ */
/* Rôles & permissions                                                  */
/* ------------------------------------------------------------------ */

export const ROLES: { id: Role; label: string; desc: string }[] = [
  { id: 'tuteur', label: 'Tuteur', desc: 'Administre la famille : membres, rôles, tutelles, invitations, tous les événements.' },
  { id: 'parent', label: 'Parent', desc: 'Gère ses événements et ceux des profils dont il est tuteur ; peut inviter.' },
  { id: 'membre', label: 'Membre', desc: 'Voit le calendrier et gère uniquement ses propres événements.' },
];
export const roleLabel = (r: Role) => ROLES.find((x) => x.id === r)?.label ?? r;

export const me = (s: State) => s.members.find((m) => m.id === s.meId) ?? null;
export const memberById = (s: State, id: string) => s.members.find((m) => m.id === id);

export function isGuardianOf(s: State, guardianId: string, wardId: string) {
  return s.links.some((l) => l.guardianId === guardianId && l.wardId === wardId);
}
export const guardiansOf = (s: State, wardId: string) => s.links.filter((l) => l.wardId === wardId).map((l) => memberById(s, l.guardianId)).filter(Boolean) as Member[];
export const wardsOf = (s: State, guardianId: string) => s.links.filter((l) => l.guardianId === guardianId).map((l) => memberById(s, l.wardId)).filter(Boolean) as Member[];

export function isMinor(m: Member) {
  return m.managed && m.kind === 'enfant' && (!m.birthYear || new Date().getFullYear() - m.birthYear < 18);
}

/** Peut agir pour ce membre (créer/modifier ses événements, éditer son profil) ? */
export function canActFor(s: State, actor: Member | null, memberId: string) {
  if (!actor) return false;
  if (actor.role === 'tuteur') return true;
  if (actor.id === memberId) return true;
  return actor.role === 'parent' && isGuardianOf(s, actor.id, memberId);
}
export const canManageFamily = (actor: Member | null) => actor?.role === 'tuteur';
export const canInvite = (actor: Member | null) => actor?.role === 'tuteur' || actor?.role === 'parent';
export function canEditEvent(s: State, actor: Member | null, ev: CalEvent) {
  if (!actor) return false;
  if (actor.role === 'tuteur' || ev.createdBy === actor.id) return true;
  return ev.memberIds.length > 0 && ev.memberIds.every((id) => canActFor(s, actor, id));
}
/** Membres pour lesquels l'acteur peut créer un événement. */
export const actableMembers = (s: State, actor: Member | null) => s.members.filter((m) => canActFor(s, actor, m.id));

/**
 * Confidentialité des mineurs : sans consentement du tuteur, les détails d'un événement
 * concernant un profil géré mineur ne sont visibles que de ses tuteurs et des participants.
 * Les autres voient « Occupé ».
 */
export function eventVisibility(s: State, viewer: Member | null, ev: CalEvent): 'full' | 'busy' {
  if (!viewer) return 'busy';
  if (viewer.role === 'tuteur' || ev.memberIds.includes(viewer.id) || ev.createdBy === viewer.id) return 'full';
  for (const id of ev.memberIds) {
    const m = memberById(s, id);
    if (!m || !isMinor(m)) continue;
    if (isGuardianOf(s, viewer.id, id)) continue;
    const links = s.links.filter((l) => l.wardId === id);
    const consent = links.length > 0 && links.every((l) => l.consentShare);
    if (!consent) return 'busy';
  }
  return 'full';
}

/* ------------------------------------------------------------------ */
/* Calendrier : occurrences & conflits                                  */
/* ------------------------------------------------------------------ */

export const parseDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (iso: string, n: number) => {
  const d = parseDay(iso);
  d.setDate(d.getDate() + n);
  return isoDay(d);
};
export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fromMin = (n: number) => `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
/** Lundi de la semaine contenant iso. */
export const weekStart = (iso: string) => {
  const d = parseDay(iso);
  const dow = (d.getDay() + 6) % 7;
  return addDays(iso, -dow);
};

export function occursOn(ev: CalEvent, day: string) {
  if (ev.date === day) return true;
  if (ev.repeat !== 'weekly' || day < ev.date || (ev.until && day > ev.until)) return false;
  return parseDay(day).getDay() === parseDay(ev.date).getDay();
}

export type Occurrence = { ev: CalEvent; day: string; conflict: boolean };

export function dayOccurrences(s: State, day: string, hidden: string[] = []): Occurrence[] {
  const list = s.events.filter((e) => occursOn(e, day) && (e.memberIds.length === 0 || e.memberIds.some((id) => !hidden.includes(id))));
  list.sort((a, b) => (a.start ?? '').localeCompare(b.start ?? '') || a.title.localeCompare(b.title));
  return list.map((ev) => ({ ev, day, conflict: conflictsWith(list, ev).length > 0 }));
}

/** Événements chevauchant ev le même jour avec au moins un membre en commun. */
export function conflictsWith(sameDay: CalEvent[], ev: CalEvent): CalEvent[] {
  if (!ev.start) return [];
  const a0 = toMin(ev.start);
  const a1 = a0 + ev.durationMin;
  return sameDay.filter((o) => {
    if (o.id === ev.id || !o.start) return false;
    const b0 = toMin(o.start);
    const b1 = b0 + o.durationMin;
    return a0 < b1 && b0 < a1 && o.memberIds.some((id) => ev.memberIds.includes(id));
  });
}

export function conflictsOn(s: State, day: string, ev: Pick<CalEvent, 'id' | 'start' | 'durationMin' | 'memberIds'>) {
  const list = s.events.filter((e) => occursOn(e, day));
  return conflictsWith(list, { ...(ev as CalEvent), date: day, repeat: 'none' } as CalEvent);
}

/* ------------------------------------------------------------------ */
/* Actions                                                              */
/* ------------------------------------------------------------------ */

export const nextColor = (s: State) => MEMBER_COLORS[s.members.length % MEMBER_COLORS.length];

export function createFamily(familyName: string, myName: string, color: string) {
  const fid = uid('fam');
  const mid = uid('mem');
  mutate((s) => ({
    ...s,
    family: { id: fid, name: familyName.trim(), createdAt: Date.now() },
    meId: mid,
    isDemo: false,
    members: [{ id: mid, familyId: fid, name: myName.trim(), color, role: 'tuteur', managed: false, email: s.session?.email, createdAt: Date.now() }],
    links: [],
    events: [],
    invites: [],
  }));
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newCode() {
  let c = '';
  for (let i = 0; i < 8; i++) c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

export function createInvite(role: Role, label?: string): Invite | null {
  const s = store.get();
  const actor = me(s);
  if (!s.family || !actor || !canInvite(actor)) return null;
  // Un parent ne peut pas inviter un tuteur.
  const r: Role = actor.role !== 'tuteur' && role === 'tuteur' ? 'parent' : role;
  const inv: Invite = { code: newCode(), familyId: s.family.id, role: r, label: label?.trim() || undefined, createdBy: actor.id, createdAt: Date.now(), expiresAt: Date.now() + 7 * 86400000 };
  mutate((x) => ({ ...x, invites: [inv, ...x.invites] }));
  return inv;
}

export const normalizeCode = (c: string) => {
  const x = c.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return x.length === 8 ? `${x.slice(0, 4)}-${x.slice(4)}` : c.trim().toUpperCase();
};

export function findInvite(code: string): { invite?: Invite; error?: string } {
  const s = store.get();
  const inv = s.invites.find((i) => i.code === normalizeCode(code));
  if (!inv) return { error: 'Code inconnu sur cet appareil. Sans synchronisation cloud, seules les invitations créées ici peuvent être acceptées.' };
  if (inv.revoked) return { error: 'Cette invitation a été révoquée.' };
  if (inv.acceptedBy) return { error: 'Cette invitation a déjà été acceptée.' };
  if (inv.expiresAt < Date.now()) return { error: 'Cette invitation a expiré (validité 7 jours).' };
  return { invite: inv };
}

/** Acceptation explicite : crée le membre et (démo mono-appareil) bascule sur son point de vue. */
export function acceptInvite(code: string, name: string, color: string, switchView: boolean) {
  const { invite, error } = findInvite(code);
  if (!invite) return { error };
  const mid = uid('mem');
  mutate((s) => ({
    ...s,
    members: [...s.members, { id: mid, familyId: invite.familyId, name: name.trim(), color, role: invite.role, managed: false, email: switchView ? s.session?.email : undefined, createdAt: Date.now() }],
    invites: s.invites.map((i) => (i.code === invite.code ? { ...i, acceptedBy: mid } : i)),
    meId: switchView ? mid : s.meId,
  }));
  return { memberId: mid };
}

export function addManaged(name: string, kind: ManagedKind, birthYear: number | undefined, color: string, guardianIds: string[]) {
  const s = store.get();
  if (!s.family) return null;
  const mid = uid('mem');
  const fid = s.family.id;
  mutate((x) => ({
    ...x,
    members: [...x.members, { id: mid, familyId: fid, name: name.trim(), color, role: 'membre', managed: true, kind, birthYear, createdAt: Date.now() }],
    links: [...x.links, ...guardianIds.map((g) => ({ id: uid('gl'), familyId: fid, guardianId: g, wardId: mid, consentShare: false, createdAt: Date.now() }))],
  }));
  return mid;
}

export function upsertEvent(ev: Omit<CalEvent, 'id' | 'familyId' | 'createdBy' | 'updatedAt'> & { id?: string }) {
  const s = store.get();
  if (!s.family || !s.meId) return null;
  const id = ev.id ?? uid('evt');
  const fid = s.family.id;
  const by = s.meId;
  mutate((x) => {
    const exists = x.events.find((e) => e.id === id);
    const full: CalEvent = { ...ev, id, familyId: fid, createdBy: exists?.createdBy ?? by, updatedAt: Date.now() };
    return { ...x, events: exists ? x.events.map((e) => (e.id === id ? full : e)) : [...x.events, full] };
  });
  return id;
}
export const deleteEvent = (id: string) => mutate((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));

export function removeMember(id: string) {
  mutate((s) => ({
    ...s,
    members: s.members.filter((m) => m.id !== id),
    links: s.links.filter((l) => l.guardianId !== id && l.wardId !== id),
    events: s.events.map((e) => ({ ...e, memberIds: e.memberIds.filter((m) => m !== id) })).filter((e) => e.memberIds.length > 0 || e.createdBy !== id),
  }));
}

export async function signOut() {
  await store.reset();
}

/* ------------------------------------------------------------------ */
/* Connexion e-mail SIMULÉE (OTP / lien magique)                        */
/* ------------------------------------------------------------------ */

export function requestOtp(email: string) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  store.set((s) => ({ ...s, pendingOtp: { email: email.trim().toLowerCase(), code, expiresAt: Date.now() + 10 * 60000 } }));
  return code;
}
export function verifyOtp(code: string, method: 'otp' | 'lien' = 'otp'): string | null {
  const p = store.get().pendingOtp;
  if (!p) return 'Demandez d’abord un code.';
  if (p.expiresAt < Date.now()) return 'Code expiré, demandez-en un nouveau.';
  if (method === 'otp' && code.replace(/\s/g, '') !== p.code) return 'Code incorrect.';
  store.set((s) => ({ ...s, session: { email: p.email, method, at: Date.now() }, pendingOtp: null }));
  return null;
}
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

/* ------------------------------------------------------------------ */
/* Données de démonstration (« Démo / Échantillon »)                    */
/* ------------------------------------------------------------------ */

export function loadDemo() {
  const fid = 'fam_demo';
  const t = isoDay(new Date());
  const d = (n: number) => addDays(t, n);
  const now = Date.now();
  const M = (id: string, name: string, color: string, role: Role, extra: Partial<Member> = {}): Member => ({ id, familyId: fid, name, color, role, managed: false, createdAt: now, ...extra });
  const members: Member[] = [
    M('m_cam', 'Camille', MEMBER_COLORS[0], 'tuteur'),
    M('m_kar', 'Karim', MEMBER_COLORS[1], 'parent'),
    M('m_yan', 'Yanis', MEMBER_COLORS[2], 'membre'),
    M('m_lea', 'Léa', MEMBER_COLORS[3], 'membre', { managed: true, kind: 'enfant', birthYear: new Date().getFullYear() - 8 }),
    M('m_odt', 'Mamie Odette', MEMBER_COLORS[5], 'membre', { managed: true, kind: 'dependant' }),
  ];
  const L = (g: string, w: string, consent = false): GuardianLink => ({ id: uid('gl'), familyId: fid, guardianId: g, wardId: w, consentShare: consent, createdAt: now });
  const E = (title: string, date: string, start: string | null, dur: number, ids: string[], by: string, extra: Partial<CalEvent> = {}): CalEvent => ({
    id: uid('evt'), familyId: fid, title, date, start, durationMin: dur, memberIds: ids, createdBy: by, updatedAt: now, repeat: 'none', ...extra,
  });
  store.set((s) => ({
    ...s,
    isDemo: true,
    onboarded: true,
    family: { id: fid, name: 'Famille Exemple', createdAt: now },
    meId: 'm_cam',
    members,
    links: [L('m_cam', 'm_lea'), L('m_kar', 'm_lea'), L('m_cam', 'm_odt', true)],
    events: [
      E('École — sortie au musée', d(0), '09:00', 360, ['m_lea'], 'm_cam', { location: 'Musée (exemple)', notes: 'Prévoir pique-nique' }),
      E('Réunion travail', d(0), '10:00', 90, ['m_kar'], 'm_kar'),
      E('Rendez-vous pédiatre', d(1), '16:30', 45, ['m_lea', 'm_kar'], 'm_kar', { location: 'Cabinet (exemple)' }),
      E('Cours de piano', d(1), '17:00', 60, ['m_lea'], 'm_cam', { repeat: 'weekly' }),
      E('Visite chez Mamie', d(2), '14:00', 120, ['m_cam', 'm_odt'], 'm_cam'),
      E('Pharmacie — renouvellement', d(2), '15:00', 30, ['m_odt', 'm_cam'], 'm_cam'),
      E('Match de foot', d(3), '18:00', 90, ['m_yan'], 'm_yan', { repeat: 'weekly' }),
      E('Anniversaire de Karim', d(5), null, 0, ['m_cam', 'm_kar', 'm_yan', 'm_lea'], 'm_cam'),
      E('Dîner en famille', d(6), '19:30', 120, ['m_cam', 'm_kar', 'm_yan', 'm_lea', 'm_odt'], 'm_cam'),
      E('Vaccin (rappel)', d(9), '09:15', 30, ['m_lea', 'm_cam'], 'm_cam'),
    ],
    invites: [{ code: 'DEMO-2026', familyId: fid, role: 'parent', label: 'Exemple — Tata Sofia', createdBy: 'm_cam', createdAt: now, expiresAt: now + 7 * 86400000 }],
    prefs: { ...s.prefs, hidden: [], cursor: t },
    updatedAt: now,
  }));
}

/* ------------------------------------------------------------------ */
/* Export iCalendar (.ics) — fonctionne hors ligne                      */
/* ------------------------------------------------------------------ */

export function toICS(s: State): string {
  const esc = (x: string) => x.replace(/[\\,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const dt = (day: string, hhmm: string) => day.replace(/-/g, '') + 'T' + hhmm.replace(':', '') + '00';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FamCal//FR', 'CALSCALE:GREGORIAN'];
  const viewer = me(s);
  for (const e of s.events) {
    const full = eventVisibility(s, viewer, e) === 'full';
    lines.push('BEGIN:VEVENT', `UID:${e.id}@famcal.local`, `DTSTAMP:${new Date(e.updatedAt).toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`);
    if (e.start) {
      lines.push(`DTSTART:${dt(e.date, e.start)}`, `DTEND:${dt(e.date, fromMin(Math.min(toMin(e.start) + e.durationMin, 23 * 60 + 59)))}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${e.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDays(e.date, 1).replace(/-/g, '')}`);
    }
    if (e.repeat === 'weekly') lines.push(`RRULE:FREQ=WEEKLY${e.until ? ';UNTIL=' + e.until.replace(/-/g, '') : ''}`);
    lines.push(`SUMMARY:${esc(full ? e.title : 'Occupé')}`);
    if (full && e.location) lines.push(`LOCATION:${esc(e.location)}`);
    if (full) lines.push(`DESCRIPTION:${esc(['Participants : ' + e.memberIds.map((id) => memberById(s, id)?.name ?? '?').join(', '), e.notes ?? ''].filter(Boolean).join('\n'))}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export const uidLink = (s: State, guardianId: string, wardId: string): GuardianLink => ({
  id: uid('gl'),
  familyId: s.family?.id ?? '',
  guardianId,
  wardId,
  consentShare: false,
  createdAt: Date.now(),
});
