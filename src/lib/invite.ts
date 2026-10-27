import { Platform, Share } from 'react-native';
import * as Linking from 'expo-linking';
import { roleLabel, type Invite } from '@/state';

export const inviteLink = (code: string) => Linking.createURL('/join', { queryParams: { code } });

export const inviteMessage = (inv: Invite, family: string) =>
  `Rejoignez « ${family} » sur FamCal (rôle : ${roleLabel(inv.role)}).\nCode : ${inv.code}\nLien : ${inviteLink(inv.code)}\nValable 7 jours.`;

/** Ouvre la feuille de partage du système (l'utilisateur choisit le destinataire) ou copie sur le web. */
export async function shareInvite(inv: Invite, family: string): Promise<'shared' | 'copied' | 'none'> {
  const msg = inviteMessage(inv, family);
  const nav = (globalThis as { navigator?: { share?: (d: { text: string }) => Promise<void>; clipboard?: { writeText: (s: string) => Promise<void> } } }).navigator;
  if (Platform.OS === 'web') {
    try {
      if (nav?.share) {
        await nav.share({ text: msg });
        return 'shared';
      }
      if (nav?.clipboard) {
        await nav.clipboard.writeText(msg);
        return 'copied';
      }
    } catch {
      return 'none';
    }
    return 'none';
  }
  await Share.share({ message: msg });
  return 'shared';
}
