import { TextareaHTMLAttributes, InputHTMLAttributes } from 'react';

const baseClass = `
  w-full bg-white/[0.03] border border-white/[0.08]
  text-[13px] text-slate-200 placeholder-slate-600
  rounded-xl transition-colors duration-200
  focus:outline-none focus:border-[rgba(167,139,250,0.4)] focus:bg-white/[0.05]
`;

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
