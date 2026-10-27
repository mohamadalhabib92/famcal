import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/kit/theme';
import { Badge, Button, Card, Row, T, useToast } from '@/kit/ui';
import { fmtDate } from '@/kit/format';
import { inviteLink, shareInvite } from '@/lib/invite';
import { memberById, mutate, roleLabel, store, type Invite } from '@/state';

export function InviteCard({ inv, canRevoke }: { inv: Invite; canRevoke?: boolean }) {
  const t = useTheme();
  const toast = useToast();
  const s = store.use();
  const accepted = inv.acceptedBy ? memberById(s, inv.acceptedBy) : null;
  const expired = inv.expiresAt < Date.now();
  const status = inv.revoked ? { l: 'Révoquée', c: t.textMuted } : accepted ? { l: `Acceptée par ${accepted.name}`, c: t.success } : expired ? { l: 'Expirée', c: t.warning } : { l: 'En attente', c: t.info };
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T v="mono" style={{ fontSize: 22, letterSpacing: 2 }} selectable>
            {inv.code}
          </T>
          <T v="small" muted>
            {inv.label ? `${inv.label} · ` : ''}Rôle {roleLabel(inv.role)} · expire le {fmtDate(inv.expiresAt, false)}
          </T>
        </View>
        <Badge label={status.l} color={status.c} />
      </Row>
      <T v="small" muted numberOfLines={1}>
        {inviteLink(inv.code)}
      </T>
      {!inv.acceptedBy && !inv.revoked && !expired ? (
        <Row wrap gap={8}>
          <Button
            small
            title="Partager"
            icon="share-social"
            onPress={async () => {
              const r = await shareInvite(inv, s.family?.name ?? 'notre famille');
              if (r === 'copied') toast('Invitation copiée dans le presse-papiers', 'success');
              else if (r === 'none') toast('Partage indisponible : communiquez le code ci-dessus', 'info');
            }}
          />
          {canRevoke ? <Button small kind="ghost" title="Révoquer" icon="close-circle" onPress={() => mutate((x) => ({ ...x, invites: x.invites.map((i) => (i.code === inv.code ? { ...i, revoked: true } : i)) }))} /> : null}
        </Row>
      ) : null}
    </Card>
  );
}
