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
    'text-[#6d28d9] hover:text-[#5b21b6]',
  ghost:
    'text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.05]',
  danger:
    'text-red-600 hover:text-red-700',
};

const variantInline: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    boxShadow: '0 2px 12px rgba(124,58,237,0.28)',
  },
  secondary: {
    background: 'rgba(124,58,237,0.08)',
    border: '1px solid rgba(124,58,237,0.28)',
  },
  ghost: {},
  danger: {
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.28)',
  },
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[14px] rounded-xl',
  md: 'px-4 py-2   text-[15px] rounded-xl',
  lg: 'px-6 py-3   text-[16px] rounded-2xl',
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
