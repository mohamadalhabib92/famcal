import { requireNativeModule, type EventSubscription } from 'expo-modules-core';

type Native = {
  isiOSAppOnMac?: boolean;
  addListener: (event: 'onKey', listener: (event: { key: string }) => void) => EventSubscription;
};

function load(): Native | null {
  try {
    return requireNativeModule<Native>('FamcalMac');
  } catch {
    return null;
  }
}

const native = load();

export function isiOSAppOnMac(): boolean {
  return native?.isiOSAppOnMac === true;
}

/** Échap et Cmd+F, seulement quand le module natif est dans le binaire iOS. */
export function addMacKeyListener(listener: (key: string) => void): () => void {
  if (!native) return () => undefined;
  const sub = native.addListener('onKey', (event) => listener(event.key));
  return () => sub.remove();
}
