'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase';
import { Loader2, Lock } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  // 合言葉ゲートを通過済みか（gate-ok Cookie の有無で判定）
  const [gatePassed, setGatePassed] = useState(false);
  const [password, setPassword] = useState('');
  const [gateError, setGateError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setGatePassed(document.cookie.split('; ').some((c) => c.startsWith('gate-ok=')));
  }, []);

  // ログイン済みならダッシュボードへ（バックグラウンド確認）
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) router.replace('/dashboard');
      })
      .catch(() => {});
  }, [router]);

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setGateError(false);
    try {
      const res = await fetch('/api/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setGatePassed(true);
      } else {
        setGateError(true);
      }
    } catch {
      setGateError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    // PKCE flow: SDK が自動リダイレクト。コード検証キーは localStorage に保存される。
    const supabase = getSupabaseBrowser();
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-3xl p-8 text-center"
        style={{
          background: '#f8fafc',
          border: '1px solid rgba(15,23,42,0.09)',
          boxShadow: '0 8px 40px rgba(15,23,42,0.1)',
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <AppLogo size={56} />
        </div>

        <h1
          className="text-3xl font-bold mb-8"
          style={{
            background: 'linear-gradient(90deg, #fbbf24, #f472b6, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Xpresso
        </h1>

        {error && (
          <div
            className="mb-6 px-4 py-3 rounded-xl text-base text-red-600"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            ログインに失敗しました。もう一度お試しください。
          </div>
        )}

        {!gatePassed ? (
          <>
            <form onSubmit={handleGateSubmit} className="space-y-3">
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setGateError(false);
                  }}
                  autoFocus
                  placeholder="合言葉を入力"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-[16px] outline-none transition-all"
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${gateError ? 'rgba(239,68,68,0.5)' : 'rgba(15,23,42,0.18)'}`,
                    color: '#0f172a',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !password}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium text-base transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #ec4899, #a78bfa)',
                  color: '#ffffff',
                }}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                続ける
              </button>
            </form>
            {gateError && (
              <p className="text-[14px] text-red-600 mt-3">合言葉が違います。</p>
            )}
            <p className="text-[13px] text-slate-500 mt-6">
              利用には管理者から共有された合言葉が必要です
            </p>
          </>
        ) : (
          <>
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-medium text-[16px] transition-all"
              style={{
                background: '#ffffff',
                border: '1px solid rgba(15,23,42,0.15)',
                color: '#1e293b',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(15,23,42,0.03)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(15,23,42,0.22)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#ffffff';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(15,23,42,0.15)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google でログイン
            </button>
            <p className="text-[13px] text-slate-500 mt-6">
              ログインすることで、あなたの投稿データが安全に保存されます
            </p>
          </>
        )}

        {/* サポート・お問い合わせ（不具合報告先・免責事項の公開ページ）*/}
        <p className="text-[13px] mt-6">
          <Link href="/support" className="underline" style={{ color: '#94a3b8' }}>
            サポート・お問い合わせ
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-slate-500" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
