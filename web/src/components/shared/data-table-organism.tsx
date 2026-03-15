import { useState, useRef, useCallback } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PaginationBar } from "@/components/shared/pagination-bar"
import { cn } from "@/lib/utils"

function useUrlState<T extends Record<string, string>>(defaults: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const result = { ...defaults }
      for (const key of Object.keys(defaults)) {
        const val = params.get(key)
        if (val !== null) (result as Record<string, string>)[key] = val
      }
      return result
    } catch {
      return defaults
    }
  })

  const setUrlState = useCallback((updates: Partial<T>) => {
    setState(prev => {
      const next = { ...prev, ...updates }
      try {
        const params = new URLSearchParams(window.location.search)
        for (const [k, v] of Object.entries(updates)) {
          if (v) params.set(k, v as string)
          else params.delete(k)
        }
        window.history.replaceState(null, '', `?${params.toString()}`)
      } catch { /* no-op in SSR/test */ }
      return next
    })
  }, [])

  return [state, setUrlState] as const
}

interface DataTableOrganismProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  total?: number
  pageSizeOptions?: number[]
  className?: string
  rowHeight?: number
}

export function DataTableOrganism<TData, TValue>({
  columns,
  data,
  total,
  pageSizeOptions,
  className,
  rowHeight = 48,
}: DataTableOrganismProps<TData, TValue>) {
  const [searchParams, setSearchParams] = useUrlState({ page: "1", pageSize: "10" })
  const page = Number(searchParams.page)
  const pageSize = Number(searchParams.pageSize)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      pagination: {
        pageIndex: page - 1,
        pageSize: pageSize,
      },
    },
    manualPagination: true,
  })

  const tableContainerRef = useRef<HTMLDivElement>(null)
  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  })

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: String(newPage) })
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setSearchParams({ pageSize: String(newPageSize), page: "1" })
  }

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div 
        ref={tableContainerRef}
        className="rounded-md border h-[600px] overflow-auto relative"
      >
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {virtualItems.length > 0 ? (
              <>
                <tr style={{ height: `${virtualItems[0]?.start ?? 0}px` }} />
                {virtualItems.map((virtualRow) => {
                  const row = rows[virtualRow.index]
                  if (!row) return null
                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      style={{ height: `${rowHeight}px` }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
                <tr 
                  style={{ 
                    height: `${rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0)}px` 
                  }} 
                />
              </>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={total ?? data.length}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={pageSizeOptions}
      />
    </div>
  )
}
