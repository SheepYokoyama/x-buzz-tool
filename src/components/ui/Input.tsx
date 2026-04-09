import { TextareaHTMLAttributes, InputHTMLAttributes } from 'react';
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

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="section-label mb-2.5">{children}</p>
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
}

export function VoiceTextarea({
  onValueChange,
  appendMode = false,
  className = '',
  value,
  ...props
}: VoiceTextareaProps) {
  const { isListening, isSupported, toggle } = useVoiceInput({
    onResult: (text) => {
      if (appendMode && value) {
        onValueChange(`${value}　${text}`);
      } else {
        onValueChange(text);
      }
    },
  });

  return (
    <div className="relative">
      <textarea
        className={`${baseClass} px-4 py-3 resize-none leading-relaxed pr-10 ${className}`}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        {...props}
      />
      <span className="absolute top-2.5 right-2">
        <MicButton isListening={isListening} isSupported={isSupported} onToggle={toggle} />
      </span>
    </div>
  );
}
