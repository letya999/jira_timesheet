import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTableOrganism } from '@/components/shared/data-table-organism';

type Row = Record<string, unknown>;

const NUMERIC_FIELDS = new Set(['value', 'hours']);

interface ReportDataTableProps {
  data: Row[];
  columns: string[];
}

export function ReportDataTable({ data, columns }: ReportDataTableProps) {
  const colDefs = useMemo((): ColumnDef<Row>[] => {
    // If backend sends explicit column list, use it; otherwise derive from first row
    const cols = columns.length > 0 ? columns : Object.keys(data[0] ?? {});
    return cols.map((col) => ({
      accessorKey: col,
      header: col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' '),
      cell: ({ getValue }) => {
        const val = getValue();
        if (NUMERIC_FIELDS.has(col) && typeof val === 'number') {
          return (
            <span className="tabular-nums text-right block">
              {val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
          );
        }
        return String(val ?? '—');
      },
    }));
  }, [columns, data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No data to display.
      </div>
    );
  }

  return <DataTableOrganism columns={colDefs} data={data} total={data.length} />;
}
