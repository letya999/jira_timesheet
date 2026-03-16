import { useState } from 'react'
import { Trash2, Settings, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAiTraining } from '../hooks'
import { useAuthStore } from '@/stores/auth-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'

interface AiChatHeaderProps {
  onClearHistory: () => void
}

export function AiChatHeader({ onClearHistory }: AiChatHeaderProps) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const isAdmin = user?.is_admin === true
  const [forceRefresh, setForceRefresh] = useState(false)
  const trainingMutation = useAiTraining()

  const handleTrain = () => {
    trainingMutation.mutate({ force_refresh: forceRefresh })
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          {t('common.ai_chat')}
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">{t('web.ai_chat.beta')}</span>
        </h1>
        <p className="text-xs text-muted-foreground">{t('web.ai_chat.powered_by')}</p>
      </div>

      <div className="flex items-center gap-2">
        {isAdmin && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Settings className="size-3.5" />
                {t('web.ai_chat.training')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('web.ai_chat.training_panel')}</DialogTitle>
                <DialogDescription>
                  {t('web.ai_chat.training_panel_desc')}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 flex items-center space-x-2">
                <Checkbox 
                  id="force-refresh" 
                  checked={forceRefresh} 
                  onCheckedChange={(checked) => setForceRefresh(!!checked)} 
                />
                <Label htmlFor="force-refresh" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t('web.ai_chat.force_refresh')}
                </Label>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleTrain} 
                  disabled={trainingMutation.isPending}
                  className="gap-2"
                >
                  {trainingMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  {t('web.ai_chat.start_training')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearHistory}
          className="h-8 text-muted-foreground hover:text-destructive gap-1.5"
        >
          <Trash2 className="size-3.5" />
          {t('web.ai_chat.clear')}
        </Button>
      </div>
    </div>
  )
}
