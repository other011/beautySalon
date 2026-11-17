import { Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Link, LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'gold' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink-800 text-white hover:bg-ink-700 shadow-sm',
  gold: 'bg-gold-500 text-white hover:bg-gold-600 shadow-sm',
  secondary: 'border border-sand-300 bg-white text-ink-800 hover:border-gold-400 hover:text-gold-600',
  ghost: 'text-ink-700 hover:bg-sand-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};
const SIZE: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
