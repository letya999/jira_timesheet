import { createRoute, redirect } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'

export const aiChatRoute = createRoute({
  path: 'ai-chat',
  getParentRoute: () => appLayoutRoute,
  beforeLoad: () => {
    if (import.meta.env.VITE_AI_ENABLED !== 'true') {
      throw redirect({ to: '/app/dashboard' })
    }
  },
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">AI Chat</h1>
      <p className="text-muted-foreground">AI assistant placeholder — Phase 6</p>
    </div>
  ),
})
