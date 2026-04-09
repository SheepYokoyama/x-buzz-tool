'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AiProvider } from '@/lib/types';

// localStorage に保存する設定
interface PersistedSettings {
  aiProvider: AiProvider;
}

// メモリのみ（DBから都度取得）
export interface ActivePersonaInfo {
  id: string;
  name: string;
  avatar: string;
  tone: string;
  style: string;
  keywords: string[];
  description: string;
}

// メモリのみ（起動時に1回取得）
export interface XUserInfo {
  id: string;
  name: string;
  username: string;
  profileImageUrl: string | null;
}

interface SettingsContextValue {
  settings: PersistedSettings;
  updateSettings: (partial: Partial<PersistedSettings>) => void;
  activePersona: ActivePersonaInfo | null;
  setActivePersona: (persona: ActivePersonaInfo | null) => void;
  xUser: XUserInfo | null;
  setXUser: (user: XUserInfo | null) => void;
}

const STORAGE_KEY = 'buzzpost_settings';

const defaultSettings: PersistedSettings = {
  aiProvider: 'gemini',
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaultSettings,
  updateSettings: () => {},
  activePersona: null,
  setActivePersona: () => {},
  xUser: null,
  setXUser: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings]       = useState<PersistedSettings>(defaultSettings);
  const [activePersona, setActivePersona] = useState<ActivePersonaInfo | null>(null);
  const [xUser, setXUser]             = useState<XUserInfo | null>(null);

  // localStorageから初期値を読み込む
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings({ ...defaultSettings, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const updateSettings = (partial: Partial<PersistedSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, activePersona, setActivePersona, xUser, setXUser }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
