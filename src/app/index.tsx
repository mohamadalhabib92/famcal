import React from 'react';
import { Redirect } from 'expo-router';
import { store } from '@/state';

export default function Index() {
  const s = store.use();
  if (!s.session) return <Redirect href="/login" />;
  if (!s.family || !s.meId || !s.onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/agenda" />;
}
