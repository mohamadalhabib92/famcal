/**
 * Confirmation de suppression. Une absence de réponse, un annuler, ou un
 * confirm() web manquant ne valent jamais une acceptation. Aucun reset global.
 */
export type ConfirmPlatform = 'web' | 'ios' | 'android';
export type ConfirmChoice = 'accept' | 'cancel';
export type DeletionDecision = 'delete' | 'keep';

export type ConfirmHost = {
  platform: ConfirmPlatform;
  /** Résultat de window.confirm. Absent = pas d'acceptation silencieuse. */
  webConfirm?: (message: string) => boolean;
  /** Boutons natifs Annuler / Supprimer. Absent = pas d'acceptation silencieuse. */
  nativeAlert?: (message: string) => Promise<ConfirmChoice>;
};

export async function askDestructive(host: ConfirmHost, message: string): Promise<DeletionDecision> {
  if (host.platform === 'web') {
    if (typeof host.webConfirm !== 'function') return 'keep';
    return host.webConfirm(message) === true ? 'delete' : 'keep';
  }
  if (typeof host.nativeAlert !== 'function') return 'keep';
  const choice = await host.nativeAlert(message);
  return choice === 'accept' ? 'delete' : 'keep';
}

/** N'applique la mutation que sur une acceptation explicite. Annuler renvoie le même objet. */
export function commitIfAccepted<T>(choice: DeletionDecision, current: T, commit: (current: T) => T): T {
  if (choice !== 'delete') return current;
  return commit(current);
}
