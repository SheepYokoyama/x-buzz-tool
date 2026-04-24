import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { AIKeysClient } from './AIKeysClient';

export default function AIKeysPage() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Header
        title="AI API キー"
        subtitle="投稿生成・リライトで使う AI プロバイダの API キーを登録します"
      />

      <div
        className="mb-6 rounded-xl px-4 py-3 text-[12px] text-slate-500"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-slate-400 font-medium">セキュリティについて:</span>{' '}
        API キーは AES-256-CBC で暗号化してデータベースに保存されます。画面上ではマスク表示のみ行い、平文は一切表示されません。
      </div>

      <Link
        href="/guide/ai-keys"
        className="group mb-6 flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.04]"
        style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.18)' }}
      >
        <BookOpen size={16} className="text-sky-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-slate-200">
            はじめての方はキー取得マニュアルをご覧ください
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Gemini / Anthropic それぞれの API キー発行手順と料金プランを解説しています
          </p>
        </div>
        <ArrowRight size={14} className="text-sky-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Link>

      <AIKeysClient />
    </div>
  );
}
