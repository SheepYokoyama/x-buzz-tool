'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

/**
 * デバッグ用 callback ページ
 * 認証フローの全ステップをログとして画面に表示する
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([]);
  const initialHash = useRef<string>('');

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  // 最速で hash を記録（useState の初期値で）
  useEffect(() => {
    initialHash.current = window.location.hash;
    const fullUrl = window.location.href;
    addLog(`URL全体: ${fullUrl}`);
    addLog(`hash: "${window.location.hash}"`);
    addLog(`search: "${window.location.search}"`);
    addLog(`hash長さ: ${window.location.hash.length}`);

    // hash にトークンが含まれているか確認
    if (window.location.hash.includes('access_token')) {
      addLog('✅ hash に access_token が含まれています');
    } else {
      addLog('❌ hash に access_token が含まれていません');
    }

    if (window.location.search.includes('code=')) {
      addLog('✅ search に code が含まれています（PKCE flow）');
    } else {
      addLog('❌ search に code が含まれていません');
    }

    // Supabase クライアント作成
    addLog('Supabase クライアント取得中...');
    const supabase = getSupabaseBrowser();
    addLog('Supabase クライアント取得完了');

    // onAuthStateChange を登録
    addLog('onAuthStateChange 登録中...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      addLog(`🔔 onAuthStateChange: event=${event}, session=${session ? 'あり' : 'なし'}`);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        addLog('✅ ログイン成功！Cookie設定＆ダッシュボードへリダイレクト...');
        document.cookie = 'app-auth=1; path=/; max-age=604800; SameSite=Lax';
        setTimeout(() => router.replace('/dashboard'), 1000);
      }
    });

    // getSession を試行
    const checkSession = async () => {
      addLog('getSession 呼び出し中...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        addLog(`getSession 結果: session=${session ? 'あり (user=' + session.user.email + ')' : 'なし'}, error=${error?.message ?? 'なし'}`);
        if (session) {
          addLog('✅ セッション発見！Cookie設定＆ダッシュボードへリダイレクト...');
          document.cookie = 'app-auth=1; path=/; max-age=604800; SameSite=Lax';
          setTimeout(() => router.replace('/dashboard'), 1000);
          return;
        }
      } catch (err) {
        addLog(`getSession エラー: ${err instanceof Error ? err.message : String(err)}`);
      }

      // code パラメータがある場合は exchangeCodeForSession を試行
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        addLog(`exchangeCodeForSession 呼び出し中 (code=${code.substring(0, 8)}...)...`);
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          addLog(`exchangeCode 結果: session=${data?.session ? 'あり' : 'なし'}, error=${error?.message ?? 'なし'}`);
          if (data?.session) {
            addLog('✅ セッション交換成功！ダッシュボードへリダイレクト...');
            setTimeout(() => router.replace('/dashboard'), 1000);
            return;
          }
        } catch (err) {
          addLog(`exchangeCode エラー: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      addLog('⏳ 10秒後に再チェックします...');
      setTimeout(async () => {
        const { data: { session: s } } = await supabase.auth.getSession();
        addLog(`再チェック: session=${s ? 'あり' : 'なし'}`);
        if (s) {
          router.replace('/dashboard');
        } else {
          addLog('❌ 最終チェック失敗 — セッション確立できませんでした');
        }
      }, 10000);
    };

    checkSession();

    return () => { subscription.unsubscribe(); };
  }, [router]);

  return (
    <div className="min-h-screen p-6" style={{ background: '#0a0a0a' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Loader2 size={20} className="animate-spin text-slate-500" />
          <p className="text-sm text-slate-400">認証コールバック デバッグ</p>
        </div>
        <pre
          className="text-xs leading-relaxed overflow-auto max-h-[80vh] p-4 rounded-xl"
          style={{ background: '#111', color: '#4ade80', border: '1px solid #222' }}
        >
          {logs.length === 0 ? '読み込み中...' : logs.join('\n')}
        </pre>
      </div>
    </div>
  );
}
