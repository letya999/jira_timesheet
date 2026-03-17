import {
  ColumnDef,
  RowSelectionState,
  Updater,
} from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table"
import { ListPagination } from "./list-pagination"
import { cn } from "@/lib/utils"

interface ActionTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  itemLabel?: string;
  filterColumn?: string;
  filterPlaceholder?: string;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (updater: Updater<RowSelectionState>) => void;
  getRowId?: (originalRow: TData, index: number) => string;
  showColumnToggle?: boolean;
  className?: string;
}

export function ActionTable<TData, TValue>({
  columns,
  data,
  total = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  itemLabel = "items",
  filterColumn,
  filterPlaceholder,
  rowSelection,
  onRowSelectionChange,
  getRowId,
  showColumnToggle = true,
  className,
}: ActionTableProps<TData, TValue>) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <DataTable
        columns={columns}
        data={data}
        filterColumn={filterColumn}
        filterPlaceholder={filterPlaceholder}
        rowSelection={rowSelection}
        onRowSelectionChange={onRowSelectionChange}
        getRowId={getRowId}
        showColumnToggle={showColumnToggle}
        showPagination={false}
      />
      
      {total > 0 && onPageChange && (
        <ListPagination
          page={page}
          pageSize={pageSize}
          total={total}
          itemLabel={itemLabel}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}
