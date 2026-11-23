import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cloudReady, ENV } from '@/config';
import { markOptionalUnavailable } from '@/lib/optional';
import { ackOutbox, applyRemoteRows, store, type State } from '@/state';
import type { SyncRecord } from './merge';

let client: SupabaseClient | null = null;
let flight: Promise<void> | null = null;
let listening = false;

export function supabaseClient(): SupabaseClient | null {
  if (!cloudReady()) return null;
  if (!client) {
    client = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function rowOf(record: SyncRecord): Record<string, unknown> | null {
  const body = record.body;
  const familyId = String(body.familyId ?? body.family_id ?? (record.entity === 'family' ? record.id : ''));
  const base = { updated_at: iso(record.updatedAt), deleted_at: record.deletedAt ? iso(record.deletedAt) : null, doc: body };
  if (record.entity === 'family') return { id: record.id, name: body.name, ...base };
  if (record.entity === 'member') {
    return { id: record.id, family_id: familyId, name: body.name, color: body.color, role: body.role, managed: !!body.managed, kind: body.kind ?? null, birth_year: body.birthYear ?? null, ...base };
  }
  if (record.entity === 'link') {
    return { id: record.id, family_id: familyId, guardian_id: body.guardianId, ward_id: body.wardId, consent_share: !!body.consentShare, ...base };
  }
  if (record.entity === 'event') {
    return {
      id: record.id,
      family_id: familyId,
      visibility: body.visibility ?? 'family',
      created_by: body.createdBy,
      member_ids: body.memberIds ?? [],
      visible_member_ids: body.visibleMemberIds ?? [],
      ...base,
    };
  }
  if (record.entity === 'invite') {
    return { code: record.id, family_id: familyId, role: body.role, created_by: body.createdBy, expires_at: iso(Number(body.expiresAt ?? record.updatedAt)), accepted_by: body.acceptedBy ?? null, revoked: !!body.revoked, ...base };
  }
  return null;
}

function fromDoc(entity: SyncRecord['entity'], doc: Record<string, unknown>, updatedAt: string, deletedAt: string | null): SyncRecord {
  const id = String(doc.id ?? doc.code ?? '');
  return {
    entity,
    id,
    updatedAt: Date.parse(updatedAt) || Date.now(),
    deletedAt: deletedAt ? Date.parse(deletedAt) : null,
    body: doc,
  };
}

async function pullAll(sb: SupabaseClient, familyId: string): Promise<SyncRecord[]> {
  const rows: SyncRecord[] = [];
  const events = await sb.from('events_for_me').select('doc,updated_at,deleted_at').eq('family_id', familyId);
  if (events.error) throw events.error;
  for (const row of events.data ?? []) rows.push(fromDoc('event', row.doc as Record<string, unknown>, row.updated_at, row.deleted_at));
  for (const table of ['members', 'guardian_links', 'invites'] as const) {
    const entity = table === 'guardian_links' ? 'link' : table === 'invites' ? 'invite' : 'member';
    const result = await sb.from(table).select('doc,updated_at,deleted_at').eq('family_id', familyId);
    if (result.error) throw result.error;
    for (const row of result.data ?? []) rows.push(fromDoc(entity, row.doc as Record<string, unknown>, row.updated_at, row.deleted_at ?? null));
  }
  const family = await sb.from('families').select('doc,updated_at,deleted_at').eq('id', familyId).maybeSingle();
  if (family.error) throw family.error;
  if (family.data) rows.push(fromDoc('family', family.data.doc as Record<string, unknown>, family.data.updated_at, family.data.deleted_at));
  return rows;
}

export async function runBackgroundSync(): Promise<void> {
  if (flight) return flight;
  flight = cycle().finally(() => {
    flight = null;
  });
  return flight;
}

async function cycle(): Promise<void> {
  const sb = supabaseClient();
  const status = store.preservation().status;
  const current = store.get();
  if (!sb || current.isDemo || !current.family || (status !== 'ready' && status !== 'empty')) return;
  try {
    const { data } = await sb.auth.getSession();
    if (!data.session) return;
    await sb.rpc('create_household', {
      p_family_id: current.family.id,
      p_family_name: current.family.name,
      p_member_id: current.meId,
      p_member_name: current.members.find((member) => member.id === current.meId)?.name ?? '',
      p_color: current.members.find((member) => member.id === current.meId)?.color ?? '#D9602E',
      p_family_doc: current.family,
      p_member_doc: current.members.find((member) => member.id === current.meId) ?? {},
    });
    const done: SyncRecord[] = [];
    for (const op of current.outbox ?? []) {
      const table = op.entity === 'family' ? 'families' : op.entity === 'member' ? 'members' : op.entity === 'link' ? 'guardian_links' : op.entity === 'invite' ? 'invites' : 'events';
      const payload = rowOf(op);
      if (!payload) continue;
      const conflict = table === 'invites' ? 'code' : 'id';
      const result = await sb.from(table).upsert(payload, { onConflict: conflict });
      if (result.error) throw result.error;
      done.push(op);
    }
    ackOutbox(done);
    const remote = await pullAll(sb, current.family.id);
    applyRemoteRows(remote);
    listen(sb, current.family.id);
  } catch {
    markOptionalUnavailable();
  }
}

function listen(sb: SupabaseClient, familyId: string) {
  if (listening) return;
  listening = true;
  const channel = sb.channel(`familycal-${familyId}`);
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${familyId}` }, () => {
      void runBackgroundSync();
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        listening = false;
        void sb.removeChannel(channel);
      }
    });
}

export async function sendCloudOtp(email: string): Promise<'sent' | 'unavailable' | 'unconfigured'> {
  const sb = supabaseClient();
  if (!sb) return 'unconfigured';
  try {
    const { error } = await sb.auth.signInWithOtp({ email });
    if (error) {
      markOptionalUnavailable();
      return 'unavailable';
    }
    return 'sent';
  } catch {
    markOptionalUnavailable();
    return 'unavailable';
  }
}

export async function verifyCloudOtp(email: string, code: string): Promise<string | null> {
  const sb = supabaseClient();
  if (!sb) return 'Synchronisation non configurée.';
  const { error } = await sb.auth.verifyOtp({ email, token: code, type: 'email' });
  return error ? 'Code incorrect ou expiré.' : null;
}

export type { State };
