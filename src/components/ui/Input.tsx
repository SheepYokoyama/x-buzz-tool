'use client';

import { forwardRef, useState, TextareaHTMLAttributes, InputHTMLAttributes } from 'react';
import { Clipboard, Check } from 'lucide-react';
import { MicButton } from './MicButton';
import { useVoiceInput } from '@/hooks/useVoiceInput';

const baseClass = `
  w-full bg-white/[0.03] border border-white/[0.08]
  text-[13px] text-slate-200 placeholder-slate-600
  rounded-xl transition-colors duration-200
  focus:outline-none focus:border-[rgba(167,139,250,0.4)] focus:bg-white/[0.05]
`;

// ── 通常 Input ───────────────────────────────────────────

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${baseClass} px-4 py-3 resize-none leading-relaxed ${className}`}
      {...props}
    />
  );
}

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`${baseClass} px-4 py-2.5 ${className}`}
      {...props}
    />
  );
}

export function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`section-label mb-2.5${className ? ` ${className}` : ''}`}>{children}</p>
  );
}

// ── 音声入力付き VoiceInput ──────────────────────────────

interface VoiceInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onValueChange: (value: string) => void;
}

export function VoiceInput({ onValueChange, className = '', value, ...props }: VoiceInputProps) {
  const { isListening, isSupported, toggle } = useVoiceInput({
    onResult: (text) => onValueChange(text),
  });

  return (
    <div className="relative flex items-center gap-1.5">
      <input
        className={`${baseClass} px-4 py-2.5 pr-10 ${className}`}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        {...props}
      />
      <span className="absolute right-2">
        <MicButton isListening={isListening} isSupported={isSupported} onToggle={toggle} />
      </span>
    </div>
  );
}

// ── 音声入力付き VoiceTextarea ───────────────────────────

interface VoiceTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange: (value: string) => void;
  /** true にすると既存テキスト末尾に追記（デフォルト: false = 上書き） */
  appendMode?: boolean;
  /** true にするとペーストボタンを表示（デフォルト: false） */
  showPasteButton?: boolean;
}

export const VoiceTextarea = forwardRef<HTMLTextAreaElement, VoiceTextareaProps>(
  function VoiceTextarea(
    {
      onValueChange,
      appendMode = false,
      showPasteButton = false,
      className = '',
      value,
      ...props
    },
    ref,
  ) {
    const [pasted, setPasted] = useState(false);

    const { isListening, isSupported, toggle } = useVoiceInput({
      onResult: (text) => {
        if (appendMode && value) {
          onValueChange(`${value}　${text}`);
        } else {
          onValueChange(text);
        }
      },
    });

    const handlePaste = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          onValueChange(text);
          setPasted(true);
          setTimeout(() => setPasted(false), 1500);
        }
      } catch {
        // クリップボードへのアクセスが拒否された場合は何もしない
      }
    };

    return (
      <div className="relative">
        <textarea
          ref={ref}
          className={`${baseClass} px-4 py-3 resize-none leading-relaxed ${showPasteButton ? 'pr-20' : 'pr-10'} ${className}`}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          {...props}
        />
        <span className="absolute top-2.5 right-2 flex items-center gap-1">
          {showPasteButton && (
            <button
              type="button"
              onClick={handlePaste}
              title="クリップボードからペースト"
              className="w-6 h-6 flex items-center justify-center rounded-md transition-all"
              style={{
                color: pasted ? '#34d399' : '#475569',
                background: pasted ? 'rgba(52,211,153,0.1)' : 'transparent',
              }}
            >
              {pasted ? <Check size={13} /> : <Clipboard size={13} />}
            </button>
          )}
          <MicButton isListening={isListening} isSupported={isSupported} onToggle={toggle} />
        </span>
      </div>
    );
  },
);
