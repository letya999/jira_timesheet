import { createRoute, lazyRouteComponent, redirect } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { useAuthStore } from '@/stores/auth-store'

export const aiChatRoute = createRoute({
  path: 'ai-chat',
  getParentRoute: () => appLayoutRoute,
  beforeLoad: () => {
    const isAiEnabled = import.meta.env.VITE_AI_ENABLED === 'true'
    const { permissions } = useAuthStore.getState()

    if (!isAiEnabled || !permissions.includes('ai-chat:read')) {
      throw redirect({ to: '/app/dashboard' })
    }
  },
  component: lazyRouteComponent(() => import('@/features/ai-chat/pages/ai-chat-page')),
})
