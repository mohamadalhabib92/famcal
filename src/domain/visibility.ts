/**
 * Visibilité d'un événement.
 * family : tout le foyer.
 * selected : créateur, participants, personnes listées, tuteurs des enfants concernés.
 * private : créateur, participants, et tuteurs des enfants concernés — pas le reste du foyer.
 * Un enfant (rôle ou profil mineur) ne voit que les événements family, plus les siens.
 * Les tuteurs voient les événements des enfants, y compris privés.
 * Le masque « Occupé » reprend la règle déjà en place : sans consentement unanime, les autres ne voient pas le détail d'un mineur.
 */

export type Audience = 'family' | 'selected' | 'private';
export type ReadLevel = 'full' | 'busy' | 'hidden';

export type AccessMember = {
  id: string;
  role: string;
  managed: boolean;
  kind?: string;
  birthYear?: number;
};

export type AccessLink = {
  guardianId: string;
  wardId: string;
  consentShare: boolean;
};

export type AccessEvent = {
  id: string;
  memberIds: string[];
  createdBy: string;
  visibility?: Audience;
  visibleMemberIds?: string[];
};

export function isMinorMember(member: AccessMember, year = new Date().getFullYear()): boolean {
  return member.managed && member.kind === 'enfant' && (!member.birthYear || year - member.birthYear < 18);
}

export function isChildViewer(member: AccessMember, year = new Date().getFullYear()): boolean {
  return member.role === 'enfant' || isMinorMember(member, year);
}

export function isGuardianRole(role: string): boolean {
  return role === 'tuteur' || role === 'parent';
}

function linksOf(links: AccessLink[], wardId: string): AccessLink[] {
  return links.filter((link) => link.wardId === wardId);
}

export function isGuardianOf(links: AccessLink[], guardianId: string, wardId: string): boolean {
  return links.some((link) => link.guardianId === guardianId && link.wardId === wardId);
}

export function allGuardiansConsent(links: AccessLink[], wardId: string): boolean {
  const rows = linksOf(links, wardId);
  return rows.length > 0 && rows.every((link) => link.consentShare);
}

function memberMap(members: AccessMember[]): Map<string, AccessMember> {
  return new Map(members.map((member) => [member.id, member]));
}

/** Le tuteur du foyer, ou un parent lié, voit les événements d'un enfant. */
export function seesChildEvent(viewer: AccessMember, child: AccessMember, links: AccessLink[]): boolean {
  if (!isMinorMember(child) && child.role !== 'enfant') return false;
  if (viewer.role === 'tuteur') return true;
  return isGuardianOf(links, viewer.id, child.id);
}

function involvedMinors(event: AccessEvent, members: Map<string, AccessMember>, year: number): AccessMember[] {
  const ids = new Set<string>([event.createdBy, ...event.memberIds]);
  const found: AccessMember[] = [];
  for (const id of ids) {
    const member = members.get(id);
    if (member && isMinorMember(member, year)) found.push(member);
  }
  return found;
}

export function guardsAnyMinor(viewer: AccessMember, minors: AccessMember[], links: AccessLink[]): boolean {
  return minors.some((minor) => seesChildEvent(viewer, minor, links));
}

export function eventAudience(event: AccessEvent): Audience {
  return event.visibility ?? 'family';
}

export function eventReadLevel(
  viewer: AccessMember | null,
  event: AccessEvent,
  members: AccessMember[],
  links: AccessLink[],
  year = new Date().getFullYear(),
): ReadLevel {
  if (!viewer) return 'hidden';
  const byId = memberMap(members);
  const audience = eventAudience(event);
  const minors = involvedMinors(event, byId, year);
  const own = event.createdBy === viewer.id || event.memberIds.includes(viewer.id);
  const listed = own || (event.visibleMemberIds ?? []).includes(viewer.id);
  const guardian = guardsAnyMinor(viewer, minors, links);
  const child = isChildViewer(viewer, year);

  let visible = false;
  if (child) {
    visible = audience === 'family' || own || guardian;
  } else if (own || guardian) {
    visible = true;
  } else if (audience === 'family') {
    visible = true;
  } else if (audience === 'selected') {
    visible = listed;
  }

  if (!visible) return 'hidden';
  if (viewer.role === 'tuteur' || own || guardian) return 'full';
  for (const minor of minors) {
    if (isGuardianOf(links, viewer.id, minor.id)) continue;
    if (!allGuardiansConsent(links, minor.id)) return 'busy';
  }
  return 'full';
}

/** Écriture : le détail est visible, et la personne gère tous les participants (ou les a créés, ou est tuteur). */
export function canWriteEvent(
  viewer: AccessMember | null,
  event: AccessEvent,
  members: AccessMember[],
  links: AccessLink[],
  year = new Date().getFullYear(),
): boolean {
  if (!viewer) return false;
  if (eventReadLevel(viewer, event, members, links, year) !== 'full') return false;
  if (viewer.role === 'tuteur') return true;
  if (event.createdBy === viewer.id) return true;
  if (event.memberIds.length === 0) return false;
  if (viewer.role === 'enfant' || isChildViewer(viewer, year)) {
    return event.memberIds.every((id) => id === viewer.id);
  }
  return event.memberIds.every((id) => id === viewer.id || isGuardianOf(links, viewer.id, id));
}
