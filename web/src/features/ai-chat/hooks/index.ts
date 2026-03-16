import { useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import * as sdk from '@/api/generated/sdk.gen'
import { ChatMessage, ChatChunk } from '../schemas'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

export const aiKeys = {
  all: ['ai'] as const,
  health: () => [...aiKeys.all, 'health'] as const,
}

type HealthResponse = {
  enabled: boolean;
  ready: boolean;
};

type TrainingResponse = {
  message: string
}

type AiSdk = {
  healthApiV1AiHealthGet?: () => Promise<{ data: HealthResponse }>
  trainApiV1AiTrainPost?: (options: {
    body: { force_refresh: boolean }
  }) => Promise<{ data: TrainingResponse }>
}

const aiSdk = sdk as unknown as AiSdk

async function fetchAiHealthFallback(token: string | null): Promise<{ data: HealthResponse }> {
  const res = await fetch('/api/v1/ai/health', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  if (!res.ok) {
    throw new Error('Failed to load AI health status')
  }

  return { data: (await res.json()) as HealthResponse }
}

async function fetchAiTrainingFallback(
  options: { body: { force_refresh: boolean } },
  token: string | null,
): Promise<{ data: TrainingResponse }> {
  const res = await fetch('/api/v1/ai/train', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(options.body),
  })

  if (!res.ok) {
    throw new Error('Training request failed')
  }

  return { data: (await res.json()) as TrainingResponse }
}

export function useAiHealth() {
  return useQuery({
    queryKey: aiKeys.health(),
    queryFn: async () => {
      const healthFn =
        aiSdk.healthApiV1AiHealthGet ??
        (() => fetchAiHealthFallback(useAuthStore.getState().token))

      return healthFn().then((r: { data: HealthResponse }) => r.data)
    },
  })
}

export function useAiTraining() {
  return useMutation({
    mutationFn: async (variables: { force_refresh: boolean }) => {
      const trainFn =
        aiSdk.trainApiV1AiTrainPost ??
        ((opts: { body: { force_refresh: boolean } }) =>
          fetchAiTrainingFallback(opts, useAuthStore.getState().token))

      return trainFn({ body: variables }).then((r: { data: TrainingResponse }) => r.data)
    },
    onSuccess: (data: TrainingResponse) => {
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

              setMessages((prev) =>
                prev.map((msg) => {
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
                }),
              )

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
