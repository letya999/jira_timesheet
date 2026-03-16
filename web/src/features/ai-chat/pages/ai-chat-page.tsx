import { useRef, useEffect } from 'react'
import { useAiHealth, useAiChat } from '../hooks'
import { AiChatHeader } from '../components/ai-chat-header'
import { AiChatMessage } from '../components/ai-chat-message'
import { AiChatInput } from '../components/ai-chat-input'
import { AiChatDisabled } from '../components/ai-chat-disabled'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AiChatPage() {
  const { t } = useTranslation()
  const { data: health, isLoading: isHealthLoading } = useAiHealth()
  const { messages, sendMessage, isStreaming, clearHistory } = useAiChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages, isStreaming])

  if (isHealthLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] items-center justify-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    )
  }

  if (!health?.enabled) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <AiChatDisabled />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto border rounded-xl shadow-sm bg-background overflow-hidden">
      <AiChatHeader onClearHistory={clearHistory} />
      
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center opacity-50">
            <Bot className="size-12 mb-4" />
            <h3 className="text-lg font-medium">{t('web.ai_chat.how_can_help')}</h3>
            <p className="text-sm max-w-sm">
              {t('web.ai_chat.hint')}
            </p>
          </div>
        )}
        
        <div className="flex flex-col">
          {messages.map((msg) => (
            <AiChatMessage key={msg.id} message={msg} />
          ))}
          
          {isStreaming && (
            <div className="flex w-full gap-4 py-4">
              <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-md border shadow bg-primary text-primary-foreground">
                <Bot className="size-5" />
              </div>
              <div className="flex flex-col gap-2 w-[80%]">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-semibold">{t('web.ai_chat.assistant')}</span>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <AiChatInput onSend={sendMessage} disabled={isStreaming} />
        <p className="text-[10px] text-center text-muted-foreground mt-2">
          {t('web.ai_chat.disclaimer')}
        </p>
      </div>
    </div>
  )
}
