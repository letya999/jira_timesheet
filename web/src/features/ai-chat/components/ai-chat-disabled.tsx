import { MessageSquareOff } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function AiChatDisabled() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center bg-muted/10">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-6">
        <MessageSquareOff className="size-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">AI Chat is Disabled</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        The AI assistant is currently not enabled in the backend configuration. 
        Please contact your administrator to enable AI features.
      </p>
      
      <Alert variant="default" className="max-w-md text-left">
        <AlertTitle className="text-xs uppercase tracking-wider font-bold">Admin Note</AlertTitle>
        <AlertDescription className="text-xs font-mono">
          Set AI_ENABLED=true and provide a valid OPENAI_API_KEY in the backend .env file to activate this feature.
        </AlertDescription>
      </Alert>
    </div>
  )
}
