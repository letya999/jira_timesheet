import { ErrorFallback } from '@/components/shared/error-fallback'
import { BadGatewayPage } from './bad-gateway-page'

type ErrorWithStatus = {
  status?: number
  statusCode?: number
  response?: {
    status?: number
  }
}

function isBadGatewayError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const e = error as ErrorWithStatus & { message?: string }
  const status = e.status ?? e.statusCode ?? e.response?.status

  if (status === 502) return true

  const message = typeof e.message === 'string' ? e.message.toLowerCase() : ''
  return message.includes('502') || message.includes('bad gateway')
}

export function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  if (isBadGatewayError(error)) {
    return <BadGatewayPage />
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <ErrorFallback error={error} resetError={reset} className="max-w-md w-full" />
    </div>
  )
}
