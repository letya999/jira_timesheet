import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function EmployeeDetailPlaceholder() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">{t('web.routes.employee_details')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t('web.routes.employee_details_not_implemented')}
      </p>
      <Link to="/app/employees" className="text-sm text-primary hover:underline">
        {t('web.routes.back_to_employees')}
      </Link>
    </div>
  )
}
