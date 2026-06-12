import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover shadow-sm focus-visible:ring-primary/40',
  secondary:
    'bg-surface text-text-primary border border-border hover:border-text-primary/20 hover:bg-page focus-visible:ring-text-primary/20',
  ghost:
    'bg-transparent text-text-secondary hover:text-text-primary hover:bg-text-primary/5',
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3.5 text-sm font-semibold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
