import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl border border-border/60 bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
