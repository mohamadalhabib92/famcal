import { Alert, Platform } from 'react-native';
import { askDestructive, type ConfirmChoice, type ConfirmHost, type DeletionDecision } from '@/kit/confirm';

/** Web : window.confirm. iOS et Android : Alert avec Annuler et Supprimer. Jamais vrai par défaut. */
export function deviceConfirmHost(): ConfirmHost {
  const os = Platform.OS;
  return {
    platform: os === 'web' ? 'web' : os === 'ios' ? 'ios' : 'android',
    webConfirm: (message) => {
      const fn = (globalThis as { confirm?: (query: string) => boolean }).confirm;
      if (typeof fn !== 'function') return false;
      return fn(message) === true;
    },
    nativeAlert: (message) =>
      new Promise((resolve) => {
        let settled = false;
        const done = (choice: ConfirmChoice) => {
          if (settled) return;
          settled = true;
          resolve(choice);
        };
        Alert.alert(
          'Confirmer la suppression',
          message,
          [
            { text: 'Annuler', style: 'cancel', onPress: () => done('cancel') },
            { text: 'Supprimer', style: 'destructive', onPress: () => done('accept') },
          ],
          { cancelable: true, onDismiss: () => done('cancel') },
        );
      }),
  };
}

export function confirmDeletion(message: string): Promise<DeletionDecision> {
  return askDestructive(deviceConfirmHost(), message);
}
