import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function BadGatewayPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold text-muted-foreground">502</h1>
      <p className="text-lg font-medium">{t('web.routes.bad_gateway')}</p>
      <p className="max-w-lg text-sm text-muted-foreground">
        {t('web.routes.bad_gateway_desc')}
      </p>
      <div className="flex items-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-primary underline underline-offset-4 hover:text-primary/80"
        >
          {t('web.routes.retry')}
        </button>
        <Link to="/app/dashboard" className="text-primary underline underline-offset-4">
          {t('web.routes.back_to_dashboard')}
        </Link>
      </div>
    </div>
  )
}
