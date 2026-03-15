import { AlertCircle, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center border border-destructive/20 bg-destructive/5 rounded-lg", className)}>
      <AlertCircle className="size-10 text-destructive mb-4" />
      <h3 className="text-lg font-semibold text-destructive">Something went wrong</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {error.message || "An unexpected error occurred. Please try again later."}
      </p>
      {resetError && (
        <Button 
          variant="outline" 
          onClick={resetError} 
          className="mt-6 gap-2"
        >
          <RefreshCcw className="size-4" />
          Try again
        </Button>
      )}
    </div>
  )
}
