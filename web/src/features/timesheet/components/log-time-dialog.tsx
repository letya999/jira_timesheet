import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LogTimeForm } from './log-time-form'
import { useTranslation } from 'react-i18next'

interface LogTimeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogTimeDialog({ open, onOpenChange }: LogTimeDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('web.timesheet.log_time')}</DialogTitle>
        </DialogHeader>
        <LogTimeForm showStandaloneLink onSubmitted={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
