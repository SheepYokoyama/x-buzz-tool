import React from 'react';

/**
 * ガイド用「画面イメージ」キット。
 * console.x.com の実スクショは取得できないため、クリック箇所を赤い○で示した
 * 模式図（モック）を CSS だけで描画する。実画面は英語表示のため、ボタン名は
 * 画面に出てくる英語表記をそのまま表示している。
 */

/* ── ブラウザ枠 ─────────────────────────────── */
export function ConsoleFrame({
  url = 'console.x.com',
  children,
}: {
  url?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-900/[0.12] shadow-sm bg-white">
      {/* タイトルバー */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border-b border-slate-900/[0.08]">
        <span className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </span>
        <span className="ml-1 flex-1 text-[11px] text-slate-500 bg-white rounded px-2 py-0.5 border border-slate-900/[0.08] font-mono truncate">
          🔒 {url}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ── クリック箇所を赤○で囲むホットスポット ───────── */
export function Hotspot({
  n,
  round = false,
  children,
}: {
  n: number;
  round?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex align-middle">
      {children}
      <span
        aria-hidden
        className={`pointer-events-none absolute -inset-1 ${round ? 'rounded-full' : 'rounded-lg'} border-2 border-rose-500`}
        style={{ boxShadow: '0 0 0 3px rgba(244,63,94,0.14)' }}
      />
      <span className="absolute -top-2.5 -left-2.5 z-10 w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shadow">
        {n}
      </span>
    </span>
  );
}

/* ── モック部品 ─────────────────────────────── */

// 左サイドバーの項目
export function SideItem({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={`px-3 py-1.5 rounded-md text-[12px] font-medium ${
        active ? 'bg-slate-900/[0.06] text-slate-800' : 'text-slate-500'
      }`}
    >
      {children}
    </div>
  );
}

// ボタン
export function Btn({
  children,
  primary = false,
}: {
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[12px] font-semibold ${
        primary
          ? 'bg-slate-900 text-white'
          : 'bg-white text-slate-700 border border-slate-900/[0.15]'
      }`}
    >
      {children}
    </span>
  );
}

// タブ
export function Tab({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex px-3 py-1.5 text-[12px] font-medium border-b-2 ${
        active ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400'
      }`}
    >
      {children}
    </span>
  );
}

// 入力欄（ラベル付き）
export function Field({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] text-slate-500 mb-1 font-medium">{label}</p>
      <div className="rounded-md border border-slate-900/[0.12] bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-700 font-mono break-all">
        {children}
      </div>
    </div>
  );
}

/* ── 赤○番号に対応する凡例 ───────────────────── */
export function MockLegend({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-3 space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-2 text-[13px] text-slate-600 leading-relaxed">
          <span className="mt-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            {i + 1}
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  );
}
