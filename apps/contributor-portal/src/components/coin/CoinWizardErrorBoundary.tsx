import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

type CoinWizardErrorBoundaryProps = {
  children: ReactNode
  variant?: 'page' | 'inline'
}

type CoinWizardErrorBoundaryState = {
  hasError: boolean
}

function CoinWizardErrorFallback({
  variant,
  onRetry,
}: {
  variant: 'page' | 'inline'
  onRetry: () => void
}) {
  const { t } = useTranslation()

  if (variant === 'inline') {
    return (
      <div
        role="alert"
        className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950"
      >
        <p className="font-medium">{t('wizard.editorLoadError')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="!min-h-9 !px-3 !py-2 text-xs" onClick={onRetry}>
            {t('wizard.editorLoadErrorRetry')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg items-center px-4 py-10">
      <Card className="w-full text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200/80">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="mt-4 font-serif text-xl font-semibold text-navy">{t('wizard.editorLoadErrorTitle')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-muted">{t('wizard.editorLoadError')}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" className="!min-h-11" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            {t('wizard.editorLoadErrorRetry')}
          </Button>
          <Link
            to="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-muted"
          >
            {t('wizard.editorLoadErrorBack')}
          </Link>
        </div>
      </Card>
    </div>
  )
}

export class CoinWizardErrorBoundary extends Component<
  CoinWizardErrorBoundaryProps,
  CoinWizardErrorBoundaryState
> {
  state: CoinWizardErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): CoinWizardErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[CoinWizardErrorBoundary]', error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <CoinWizardErrorFallback
          variant={this.props.variant ?? 'page'}
          onRetry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}
