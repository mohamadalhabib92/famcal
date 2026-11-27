import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type MacNative = { isiOSAppOnMac?: boolean };

let cached: boolean | null = null;

/**
 * Vrai seulement quand le binaire iOS tourne sur un Mac Apple Silicon
 * (ProcessInfo.isiOSAppOnMac). Sur iPhone, iPad, Apple TV et le web : faux.
 */
export function isIosAppOnMac(): boolean {
  if (cached != null) return cached;
  if (Platform.OS !== 'ios' || Platform.isTV) {
    cached = false;
    return false;
  }
  try {
    const native = requireOptionalNativeModule<MacNative>('FamcalMac');
    cached = native?.isiOSAppOnMac === true;
  } catch {
    cached = false;
  }
  return cached;
}
