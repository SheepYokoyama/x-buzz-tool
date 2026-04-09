'use client';

import { Mic, MicOff } from 'lucide-react';

interface Props {
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
}

export function MicButton({ isListening, isSupported, onToggle }: Props) {
  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      title={isListening ? '音声入力を停止' : '音声入力を開始'}
      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
      style={{
        background: isListening
          ? 'rgba(239,68,68,0.15)'
          : 'rgba(255,255,255,0.04)',
        border: isListening
          ? '1px solid rgba(239,68,68,0.4)'
          : '1px solid rgba(255,255,255,0.08)',
        color: isListening ? '#f87171' : '#475569',
        boxShadow: isListening ? '0 0 8px rgba(239,68,68,0.3)' : 'none',
      }}
    >
      {/* 録音中はパルスアニメーション */}
      {isListening ? (
        <span className="relative flex items-center justify-center">
          <span
            className="absolute w-5 h-5 rounded-full animate-ping opacity-40"
            style={{ background: 'rgba(239,68,68,0.5)' }}
          />
          <MicOff size={12} />
        </span>
      ) : (
        <Mic size={12} />
      )}
    </button>
  );
}
