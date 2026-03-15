import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExportReport } from '../hooks';

interface ReportExportButtonProps {
  startDate: string;
  endDate: string;
}

export function ReportExportButton({ startDate, endDate }: ReportExportButtonProps) {
  const { mutate, isPending } = useExportReport();

  const handleExport = () => {
    mutate(
      { start_date: startDate, end_date: endDate },
      {
        onSuccess: (data) => {
          if (!data) return;
          const blob = new Blob([data as unknown as BlobPart], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `timesheet_export_${startDate}_${endDate}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        },
      }
    );
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={isPending}>
      <Download className="size-4 mr-2" />
      {isPending ? 'Exporting…' : 'Export Excel'}
    </Button>
  );
}
