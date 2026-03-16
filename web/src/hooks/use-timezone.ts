import { useAuthStore } from '@/stores/auth-store'

/**
 * Hook to get the user's preferred timezone or fallback to browser timezone.
 */
export function useTimezone() {
  const user = useAuthStore((state) => state.user)
  
  // Fallback order: User profile setting -> Browser timezone -> UTC
  const timezone = user?.timezone || 
                   Intl.DateTimeFormat().resolvedOptions().timeZone || 
                   'UTC'

  return {
    timezone,
    isUTC: timezone === 'UTC'
  }
}
