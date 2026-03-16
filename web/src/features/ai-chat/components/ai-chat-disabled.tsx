import { MessageSquareOff } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useTranslation } from 'react-i18next'

export function AiChatDisabled() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center bg-muted/10">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-6">
        <MessageSquareOff className="size-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{t('web.ai_chat.disabled_title')}</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        {t('web.ai_chat.disabled_desc')}
      </p>
      
      <Alert variant="default" className="max-w-md text-left">
        <AlertTitle className="text-xs uppercase tracking-wider font-bold">{t('web.ai_chat.admin_note')}</AlertTitle>
        <AlertDescription className="text-xs font-mono">
          {t('web.ai_chat.admin_note_desc')}
        </AlertDescription>
      </Alert>
    </div>
  )
}
