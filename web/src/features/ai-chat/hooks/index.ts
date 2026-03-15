import { useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
// Use any for missing SDK types for now
import * as sdk from '@/api/generated/sdk.gen'
import { ChatMessage, ChatChunk } from '../schemas'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

export const aiKeys = {
  all: ['ai'] as const,
  health: () => [...aiKeys.all, 'health'] as const,
}

export function useAiHealth() {
  return useQuery({
    queryKey: aiKeys.health(),
    queryFn: async () => {
      // Fallback if SDK is not generated yet
      const healthFn = (sdk as any).healthApiV1AiHealthGet || 
        (async () => {
          const res = await fetch('/api/v1/ai/health', {
            headers: { 'Authorization': `Bearer ${useAuthStore.getState().token}` }
          })
          return { data: await res.json() }
        })
      
      return healthFn().then((r: any) => r.data as { enabled: boolean; ready: boolean })
    },
  })
}

export function useAiTraining() {
  return useMutation({
    mutationFn: async (variables: { force_refresh: boolean }) => {
      const trainFn = (sdk as any).trainApiV1AiTrainPost ||
        (async (opts: any) => {
          const res = await fetch('/api/v1/ai/train', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${useAuthStore.getState().token}` 
            },
            body: JSON.stringify(opts.body)
          })
          return { data: await res.json() }
        })
      
      return trainFn({ body: variables }).then((r: any) => r.data)
    },
    onSuccess: (data: any) => {
      toast.success(data.message || 'Training complete')
    },
    onError: () => {
      toast.error('Training failed')
    },
  })
}

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const token = useAuthStore.getState().token

  const clearHistory = useCallback(() => {
    setMessages([])
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsStreaming(true)

    const assistantMessageId = crypto.randomUUID()
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, assistantMessage])

    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is null')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const jsonStr = line.trim().substring(6)
            try {
              const chunk = JSON.parse(jsonStr) as ChatChunk
              
              setMessages((prev) => prev.map((msg) => {
                if (msg.id === assistantMessageId) {
                  const updated = { ...msg }
                  if (chunk.sql) updated.sql = chunk.sql
                  if (chunk.data) updated.data = chunk.data
                  if (chunk.answer) updated.content += chunk.answer
                  if (chunk.error) {
                    updated.content = `Error: ${chunk.error}`
                    setIsStreaming(false)
                  }
                  return updated
                }
                return msg
              }))

              if (chunk.stage === 'complete' || chunk.stage === 'error') {
                setIsStreaming(false)
              }
            } catch (e) {
              console.error('Failed to parse chunk', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error', error)
      setMessages((prev) => prev.map((msg) => {
        if (msg.id === assistantMessageId) {
          return { ...msg, content: 'Sorry, I encountered an error. Please try again later.' }
        }
        return msg
      }))
      setIsStreaming(false)
      toast.error('Failed to communicate with AI')
    }
  }, [token])

  return {
    messages,
    sendMessage,
    isStreaming,
    clearHistory,
  }
}
