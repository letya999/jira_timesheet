import { AlertCircle, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

interface ErrorFallbackProps {
  error: Error
  resetError?: () => void
  className?: string
}

export function ErrorFallback({
  error,
  resetError,
  className,
}: ErrorFallbackProps) {
  const { t } = useTranslation()
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center border border-destructive/20 bg-destructive/5 rounded-lg", className)}>
      <AlertCircle className="size-10 text-destructive mb-4" />
      <h3 className="text-lg font-semibold text-destructive">{t("web.error.something_went_wrong")}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {error.message || t("web.error.unexpected")}
      </p>
      {resetError && (
        <Button 
          variant="outline" 
          onClick={resetError} 
          className="mt-6 gap-2"
        >
          <RefreshCcw className="size-4" />
          {t("web.error.try_again")}
        </Button>
      )}
    </div>
  )
}
