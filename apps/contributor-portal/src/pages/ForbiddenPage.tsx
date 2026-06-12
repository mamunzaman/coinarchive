import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'

export function ForbiddenPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 py-10">
      <div className="text-center">
        <p className="section-label">403</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-navy sm:text-3xl">
          Access denied
        </h1>
        <p className="mt-2 text-sm text-navy-muted">
          You do not have permission to view this page.
        </p>
      </div>

      <Card>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <p className="text-sm text-navy-muted">
            Admin tools are only available to accounts with the admin role.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Back to dashboard
          </Link>
        </div>
      </Card>
    </div>
  )
}
