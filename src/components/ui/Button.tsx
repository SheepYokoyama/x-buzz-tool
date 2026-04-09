import { ReactNode, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'text-white hover:opacity-90',
  secondary:
    'text-[#a78bfa] hover:text-white',
  ghost:
    'text-slate-500 hover:text-slate-200 hover:bg-white/5',
  danger:
    'text-red-400 hover:text-red-300',
};

const variantInline: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    boxShadow: '0 0 20px rgba(167,139,250,0.25)',
  },
  secondary: {
    background: 'rgba(167,139,250,0.08)',
    border: '1px solid rgba(167,139,250,0.22)',
  },
  ghost: {},
  danger: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
  },
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[12px] rounded-xl',
  md: 'px-4 py-2   text-[13px] rounded-xl',
  lg: 'px-6 py-3   text-[14px] rounded-2xl',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center gap-2 font-medium
        transition-all duration-200 cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      style={{ ...variantInline[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
