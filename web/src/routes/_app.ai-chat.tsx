import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { AiChatPage } from '@/features/ai-chat/pages/ai-chat-page'

export const aiChatRoute = createRoute({
  path: 'ai-chat',
  getParentRoute: () => appLayoutRoute,
  component: AiChatPage,
})
