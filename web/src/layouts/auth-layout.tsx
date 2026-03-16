import { Outlet } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'

export function AuthLayout() {
  const { t } = useTranslation()

  return (
    <div className="min-h-svh flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg select-none">
            JT
          </div>
          <h1 className="text-xl font-semibold">{t('web.auth.brand_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('web.auth.brand_subtitle')}</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Outlet />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
