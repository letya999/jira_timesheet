import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from '@/lib/toast';

interface TempPasswordDialogProps {
  credentials: { display_name: string; email: string; temporary_password: string } | null;
  onClose: () => void;
}

export function TempPasswordDialog({ credentials, onClose }: TempPasswordDialogProps) {
  const { t } = useTranslation('employees');
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('temp_password_copied', 'Copied to clipboard'));
  };

  return (
    <Dialog open={!!credentials} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('temp_password_title', 'System User Created')}</DialogTitle>
          <DialogDescription dangerouslySetInnerHTML={{ 
            __html: t('temp_password_desc', { name: credentials?.display_name }, `Account for <strong>${credentials?.display_name}</strong> has been created. Please share these temporary credentials with the user.`) 
          }} />
        </DialogHeader>

        {credentials && (
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">{t('email', 'Email')}</span>
              <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                <code className="text-sm">{credentials.email}</code>
                <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(credentials.email)} title={t('temp_password_copy', 'Copy')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">{t('temp_password_password', 'Temporary Password')}</span>
              <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                <code className="text-sm font-bold">{credentials.temporary_password}</code>
                <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(credentials.temporary_password)} title={t('temp_password_copy', 'Copy')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <p className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded">
              {t('temp_password_warning', 'The user will be required to change this password upon their first login.')}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>{t('cancel', 'Close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
