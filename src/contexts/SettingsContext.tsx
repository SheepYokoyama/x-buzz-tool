'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase';
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
  /** 'blue' = X Premium系, 'business'/'government' = 組織認証, null = 無料 */
  verifiedType: string | null;
  /** 'Basic' | 'Premium' | 'PremiumPlus' | null */
  subscriptionType: string | null;
}

// Google 認証ユーザー情報
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

interface SettingsContextValue {
  settings: PersistedSettings;
  updateSettings: (partial: Partial<PersistedSettings>) => void;
  activePersona: ActivePersonaInfo | null;
  setActivePersona: (persona: ActivePersonaInfo | null) => void;
  xUser: XUserInfo | null;
  setXUser: (user: XUserInfo | null) => void;
  authUser: AuthUser | null;
  signOut: () => Promise<void>;
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
  authUser: null,
  signOut: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [settings, setSettings]       = useState<PersistedSettings>(defaultSettings);
  const [activePersona, setActivePersona] = useState<ActivePersonaInfo | null>(null);
  const [xUser, setXUser]             = useState<XUserInfo | null>(null);
  const [authUser, setAuthUser]       = useState<AuthUser | null>(null);

  // localStorageから初期値を読み込む
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings({ ...defaultSettings, ...JSON.parse(stored) });
    } catch {}
  }, []);

  // Supabase Auth からユーザー情報を取得（セッション無効時は再ログインへ）
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        setAuthUser(null);
        document.cookie = 'app-auth=; path=/; max-age=0';
        router.push('/login');
        return;
      }
      setAuthUser({
        id: user.id,
        email: user.email ?? '',
        name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? '',
        avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
      });
    });
  }, [router]);

  const updateSettings = (partial: Partial<PersistedSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    document.cookie = 'app-auth=; path=/; max-age=0';
    setAuthUser(null);
    router.push('/login');
  }, [router]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, activePersona, setActivePersona, xUser, setXUser, authUser, signOut }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
