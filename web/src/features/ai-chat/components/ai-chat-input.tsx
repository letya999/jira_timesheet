import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { SendHorizontal, Loader2 } from 'lucide-react'

interface AiChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function AiChatInput({ onSend, disabled }: AiChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  return (
    <div className="flex items-end gap-2 relative bg-muted/30 p-2 rounded-xl border">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything about worklogs, projects, or team performance..."
        className="min-h-[44px] max-h-[200px] resize-none border-none bg-transparent focus-visible:ring-0 shadow-none px-2 py-3"
        rows={1}
      />
      <Button 
        size="icon" 
        onClick={handleSend} 
        disabled={!input.trim() || disabled}
        className="shrink-0 mb-1"
      >
        {disabled ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
      </Button>
    </div>
  )
}
