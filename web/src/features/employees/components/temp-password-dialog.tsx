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
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog open={!!credentials} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>System User Created</DialogTitle>
          <DialogDescription>
            Account for <strong>{credentials?.display_name}</strong> has been created.
            Please share these temporary credentials with the user.
          </DialogDescription>
        </DialogHeader>

        {credentials && (
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Email</span>
              <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                <code className="text-sm">{credentials.email}</code>
                <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(credentials.email)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Temporary Password</span>
              <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                <code className="text-sm font-bold">{credentials.temporary_password}</code>
                <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(credentials.temporary_password)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <p className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded">
              The user will be required to change this password upon their first login.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
