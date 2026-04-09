'use client';

const STYLES = [
  { id: 'shorter',    label: '短くする',      emoji: '✂️', desc: '140文字以内に圧縮' },
  { id: 'emotional',  label: '感情的に',       emoji: '🔥', desc: '共感・感情を強める' },
  { id: 'numbered',   label: 'リスト形式',     emoji: '📋', desc: '箇条書きで読みやすく' },
  { id: 'hook',       label: '冒頭を強化',     emoji: '🎯', desc: '最初の1文でつかむ' },
  { id: 'casual',     label: 'カジュアルに',   emoji: '😊', desc: '親しみやすいトーンに' },
  { id: 'authority',  label: '権威感を出す',   emoji: '👑', desc: '実績・数字を強調' },
];

interface Props {
  selected: string;
  onChange: (id: string) => void;
}

export function RewriteStyleSelector({ selected, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {STYLES.map(({ id, label, emoji, desc }) => {
        const active = selected === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="text-left p-3.5 rounded-xl transition-all cursor-pointer"
            style={{
              background: active ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.025)',
              border: active ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <span className="text-lg">{emoji}</span>
            <p className="text-[13px] font-medium mt-1.5" style={{ color: active ? '#c4b5fd' : '#cbd5e1' }}>
              {label}
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">{desc}</p>
          </button>
        );
      })}
    </div>
  );
}
