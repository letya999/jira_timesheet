import { createRoute, lazyRouteComponent } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'

export const aiChatRoute = createRoute({
  path: 'ai-chat',
  getParentRoute: () => appLayoutRoute,
  component: lazyRouteComponent(() => import('@/features/ai-chat/pages/ai-chat-page')),
})
