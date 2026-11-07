import React from 'react';
import { exportText } from '@/kit/files';
import { exportPreservationEnvelope, preservationSnapshot, store } from '@/state';
import { preservationCopy } from '@/kit/store';
import { Banner, Button, useToast } from '@/kit/ui';

/**
 * Bandeau visible quand la copie locale est en quarantaine ou illisible.
 * L'export recopie les octets lus. Il ne restaure pas le calendrier.
 */
export function PreservationBanner() {
  store.use();
  const toast = useToast();
  const snap = preservationSnapshot();
  const copy = preservationCopy(snap.status, snap.reason);
  if (!copy) return null;
  const canExport = snap.capturedOriginal != null;
  return (
    <Banner
      kind="warning"
      title={copy.title}
      text={copy.text}
      action={
        canExport ? (
          <Button
            title={copy.exportLabel}
            icon="download"
            kind="secondary"
            small
            a11y="Exporter les octets d’origine sans restaurer le calendrier"
            onPress={() => {
              const body = exportPreservationEnvelope();
              let original: unknown;
              try {
                original = (JSON.parse(body) as { capturedOriginal?: unknown }).capturedOriginal;
              } catch {
                toast('Export interrompu. Rien n’a été restauré.', 'error');
                return;
              }
              if (original !== snap.capturedOriginal) {
                toast('Export interrompu : les octets ne correspondent pas. Rien n’a été restauré.', 'error');
                return;
              }
              exportText('famcal-octets.json', body, 'application/json').then(() => {
                toast('Octets d’origine exportés. Le calendrier n’a pas été restauré dans l’app.', 'info');
              });
            }}
          />
        ) : null
      }
    />
  );
}
