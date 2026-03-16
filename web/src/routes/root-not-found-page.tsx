import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function RootNotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold text-muted-foreground">404</h1>
      <p className="text-lg font-medium">{t('web.routes.page_not_found')}</p>
      <p className="text-sm text-muted-foreground">
        {t('web.routes.page_not_found_desc')}
      </p>
      <Link
        to="/app/dashboard"
        className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
      >
        {t('web.routes.back_to_dashboard')}
      </Link>
    </div>
  )
}
