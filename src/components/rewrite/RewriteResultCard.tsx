'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props { text: string; label: string; }

export function RewriteResultCard({ text, label }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="neon-card p-5">
      <div className="flex items-center justify-between mb-3.5">
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
          style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}
        >
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-600">{text.length}文字</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-lg transition-all"
            style={{
              background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
              border: copied ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.08)',
              color: copied ? '#34d399' : '#94a3b8',
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? '済み' : 'コピー'}
          </button>
        </div>
      </div>
      <p className="text-[13px] text-slate-300 whitespace-pre-wrap leading-[1.75]">{text}</p>
    </div>
  );
}
