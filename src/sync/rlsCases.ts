import { canWriteEvent, eventReadLevel, type AccessEvent, type AccessLink, type AccessMember } from '../domain/visibility';

export type RlsCase = {
  id: string;
  read: 'allow' | 'deny';
  write: 'allow' | 'deny';
  viewer: AccessMember | null;
  event: AccessEvent;
  members: AccessMember[];
  links: AccessLink[];
};

const guardian: AccessMember = { id: 'g', role: 'tuteur', managed: false };
const parent: AccessMember = { id: 'p', role: 'parent', managed: false };
const member: AccessMember = { id: 'm', role: 'membre', managed: false };
const child: AccessMember = { id: 'c', role: 'enfant', managed: false };
const ward: AccessMember = { id: 'w', role: 'membre', managed: true, kind: 'enfant', birthYear: 2018 };
const other: AccessMember = { id: 'o', role: 'parent', managed: false };
const people = [guardian, parent, member, child, ward, other];
const link: AccessLink = { guardianId: 'p', wardId: 'w', consentShare: false };

function ev(partial: Partial<AccessEvent> & Pick<AccessEvent, 'createdBy' | 'memberIds' | 'visibility'>): AccessEvent {
  return { id: 'e', visibleMemberIds: [], ...partial };
}

/** Matrice partagée avec les commentaires du fichier SQL. Le code client et les politiques doivent tomber d'accord. */
export const RLS_CASES: RlsCase[] = [
  { id: 'no-viewer', read: 'deny', write: 'deny', viewer: null, event: ev({ createdBy: 'g', memberIds: ['g'], visibility: 'family' }), members: people, links: [link] },
  { id: 'family-adult', read: 'allow', write: 'deny', viewer: member, event: ev({ createdBy: 'g', memberIds: ['g'], visibility: 'family' }), members: people, links: [link] },
  { id: 'family-minor-masked', read: 'allow', write: 'deny', viewer: member, event: ev({ createdBy: 'p', memberIds: ['w'], visibility: 'family' }), members: people, links: [link] },
  { id: 'family-guardian-detail', read: 'allow', write: 'allow', viewer: parent, event: ev({ createdBy: 'p', memberIds: ['w'], visibility: 'family' }), members: people, links: [link] },
  { id: 'family-tuteur', read: 'allow', write: 'allow', viewer: guardian, event: ev({ createdBy: 'm', memberIds: ['m'], visibility: 'family' }), members: people, links: [link] },
  { id: 'private-creator', read: 'allow', write: 'allow', viewer: member, event: ev({ createdBy: 'm', memberIds: ['m'], visibility: 'private' }), members: people, links: [link] },
  { id: 'private-assignee', read: 'allow', write: 'deny', viewer: other, event: ev({ createdBy: 'm', memberIds: ['m', 'o'], visibility: 'private' }), members: people, links: [link] },
  { id: 'private-stranger', read: 'deny', write: 'deny', viewer: other, event: ev({ createdBy: 'm', memberIds: ['m'], visibility: 'private' }), members: people, links: [link] },
  { id: 'private-tuteur-adult', read: 'deny', write: 'deny', viewer: guardian, event: ev({ createdBy: 'm', memberIds: ['m'], visibility: 'private' }), members: people, links: [link] },
  { id: 'private-child-tuteur', read: 'allow', write: 'allow', viewer: guardian, event: ev({ createdBy: 'w', memberIds: ['w'], visibility: 'private' }), members: people, links: [link] },
  { id: 'private-child-parent', read: 'allow', write: 'allow', viewer: parent, event: ev({ createdBy: 'w', memberIds: ['w'], visibility: 'private' }), members: people, links: [link] },
  { id: 'private-child-other-parent', read: 'deny', write: 'deny', viewer: other, event: ev({ createdBy: 'w', memberIds: ['w'], visibility: 'private' }), members: people, links: [link] },
  { id: 'private-child-self', read: 'allow', write: 'allow', viewer: child, event: ev({ createdBy: 'c', memberIds: ['c'], visibility: 'private' }), members: people, links: [link] },
  { id: 'private-child-other', read: 'deny', write: 'deny', viewer: child, event: ev({ createdBy: 'm', memberIds: ['m'], visibility: 'private' }), members: people, links: [link] },
  { id: 'selected-listed', read: 'allow', write: 'deny', viewer: other, event: ev({ createdBy: 'm', memberIds: ['m'], visibility: 'selected', visibleMemberIds: ['o'] }), members: people, links: [link] },
  { id: 'selected-unlisted', read: 'deny', write: 'deny', viewer: other, event: ev({ createdBy: 'm', memberIds: ['m'], visibility: 'selected', visibleMemberIds: ['g'] }), members: people, links: [link] },
  { id: 'selected-child-blocked', read: 'deny', write: 'deny', viewer: child, event: ev({ createdBy: 'm', memberIds: ['m'], visibility: 'selected', visibleMemberIds: ['c'] }), members: people, links: [link] },
  { id: 'family-child-sees', read: 'allow', write: 'deny', viewer: child, event: ev({ createdBy: 'g', memberIds: ['g'], visibility: 'family' }), members: people, links: [link] },
  { id: 'family-child-mask', read: 'allow', write: 'deny', viewer: child, event: ev({ createdBy: 'p', memberIds: ['w'], visibility: 'family' }), members: people, links: [link] },
  { id: 'child-cannot-write-family', read: 'allow', write: 'deny', viewer: child, event: ev({ createdBy: 'g', memberIds: ['c', 'g'], visibility: 'family' }), members: people, links: [link] },
];

export function expectRead(row: RlsCase): 'allow' | 'deny' {
  const level = eventReadLevel(row.viewer, row.event, row.members, row.links, 2026);
  return level === 'hidden' ? 'deny' : 'allow';
}

export function expectWrite(row: RlsCase): 'allow' | 'deny' {
  return canWriteEvent(row.viewer, row.event, row.members, row.links, 2026) ? 'allow' : 'deny';
}

export function caseLine(row: RlsCase): string {
  return `-- rls-case ${row.id} read=${row.read} write=${row.write}`;
}
