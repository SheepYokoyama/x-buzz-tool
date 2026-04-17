'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

/**
 * OAuth 認証コールバックページ。
 * Supabase のセッション確立を待ち、完了したらダッシュボードへリダイレクトする。
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    const redirectToDashboard = () => {
      document.cookie = 'app-auth=1; path=/; max-age=604800; SameSite=Lax';
      router.replace('/dashboard');
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        redirectToDashboard();
      }
    });

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        redirectToDashboard();
        return;
      }

      // PKCE フロー: URL の code を交換してセッション確立
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { data } = await supabase.auth.exchangeCodeForSession(code);
        if (data?.session) {
          redirectToDashboard();
        }
      }
    };

    checkSession();

    return () => { subscription.unsubscribe(); };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <div className="flex items-center gap-3">
        <Loader2 size={20} className="animate-spin text-slate-500" />
        <p className="text-sm text-slate-400">ログイン処理中...</p>
      </div>
    </div>
  );
}
