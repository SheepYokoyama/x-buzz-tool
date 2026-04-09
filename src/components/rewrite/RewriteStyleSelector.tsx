'use client';

const STYLES = [
  { id: 'shorter',    label: '短くする',      emoji: '\u2702\ufe0f', desc: '140文字以内に圧縮' },
  { id: 'emotional',  label: '感情的に',       emoji: '\ud83d\udd25', desc: '共感・感情を強める' },
  { id: 'numbered',   label: 'リスト形式',     emoji: '\ud83d\udccb', desc: '箇条書きで読みやすく' },
  { id: 'hook',       label: '冒頭を強化',     emoji: '\ud83c\udfaf', desc: '最初の1文でつかむ' },
  { id: 'casual',     label: 'カジュアルに',   emoji: '\ud83d\ude0a', desc: '親しみやすいトーンに' },
  { id: 'authority',  label: '権威感を出す',   emoji: '\ud83d\udc51', desc: '実績・数字を強調' },
];

const PERSONA_STYLE = {
  id: 'persona',
  label: 'ペルソナ風に',
  emoji: '\ud83e\uddd1\u200d\ud83d\udcbb',
  desc: 'アクティブなペルソナのスタイルで',
};

interface Props {
  selected: string;
  onChange: (id: string) => void;
  hasActivePersona: boolean;
  personaName?: string;
  personaAvatar?: string;
}

export function RewriteStyleSelector({ selected, onChange, hasActivePersona, personaName, personaAvatar }: Props) {
  return (
    <div className="space-y-2">
      {/* 通常スタイル */}
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

      {/* ペルソナスタイル（区切り線あり） */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-2">
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">ペルソナ</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <button
          onClick={() => hasActivePersona && onChange(PERSONA_STYLE.id)}
          disabled={!hasActivePersona}
          className="w-full text-left p-3.5 rounded-xl transition-all"
          style={{
            background: selected === PERSONA_STYLE.id
              ? 'rgba(96,165,250,0.12)'
              : hasActivePersona
                ? 'rgba(255,255,255,0.025)'
                : 'rgba(255,255,255,0.01)',
            border: selected === PERSONA_STYLE.id
              ? '1px solid rgba(96,165,250,0.35)'
              : hasActivePersona
                ? '1px solid rgba(255,255,255,0.07)'
                : '1px solid rgba(255,255,255,0.04)',
            cursor: hasActivePersona ? 'pointer' : 'not-allowed',
            opacity: hasActivePersona ? 1 : 0.45,
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">{hasActivePersona && personaAvatar ? personaAvatar : PERSONA_STYLE.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p
                  className="text-[13px] font-medium"
                  style={{ color: selected === PERSONA_STYLE.id ? '#93c5fd' : '#cbd5e1' }}
                >
                  {PERSONA_STYLE.label}
                </p>
                {hasActivePersona && personaName && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{
                      color: '#60a5fa',
                      background: 'rgba(96,165,250,0.12)',
                      border: '1px solid rgba(96,165,250,0.25)',
                    }}
                  >
                    {personaName}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {hasActivePersona
                  ? `${personaName ?? 'ペルソナ'}のトーン・スタイルで書き直します`
                  : 'ペルソナが選択されていません'}
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
