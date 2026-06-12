export type ContributorRole = 'admin' | 'contributor'

type RoleBadgeProps = {
  role: ContributorRole | string
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const isAdmin = role === 'admin'

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
        isAdmin
          ? 'bg-text-primary text-white ring-1 ring-text-primary/20'
          : 'bg-primary/10 text-primary-hover ring-1 ring-primary/20',
      ].join(' ')}
    >
      {formatRole(role)}
    </span>
  )
}
