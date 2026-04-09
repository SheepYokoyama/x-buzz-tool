'use client';

import { SettingsProvider } from '@/contexts/SettingsContext';
import { ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}
