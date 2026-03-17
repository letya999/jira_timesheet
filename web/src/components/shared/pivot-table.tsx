import { ReactNode, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface PivotHeaderCell {
  label: string;
  colSpan: number;
}

export interface PivotBodyRow {
  id?: string;
  rowValues: string[];
  values: (number | string)[];
  originalData?: any;
}

export interface PivotTableModel {
  rowDimensions: string[];
  headerRows: PivotHeaderCell[][];
  bodyRows: PivotBodyRow[];
}

interface PivotTableProps {
  model: PivotTableModel;
  onUpdate?: (rowId: string, colIndex: number, value: number) => Promise<void>;
  renderRowValue?: (value: string, dimension: string, row: PivotBodyRow) => ReactNode;
  editable?: boolean;
  maxHeight?: string;
  className?: string;
  stickyHeader?: boolean;
  showTotals?: boolean;
  rowHeight?: number;
}

function buildRowSpanMatrix(rows: string[][]): number[][] {
  if (rows.length === 0) return [];

  const dims = rows[0]?.length ?? 0;
  const spans = Array.from({ length: rows.length }, () => Array.from({ length: dims }, () => 1));

  for (let dim = 0; dim < dims; dim += 1) {
    for (let row = 0; row < rows.length; row += 1) {
      if (row > 0) {
        let samePrefixAsPrev = true;
        for (let prevDim = 0; prevDim < dim; prevDim += 1) {
          if (rows[row]?.[prevDim] !== rows[row - 1]?.[prevDim]) {
            samePrefixAsPrev = false;
            break;
          }
        }
        if (samePrefixAsPrev && rows[row]?.[dim] === rows[row - 1]?.[dim]) {
          spans[row]![dim] = 0;
          continue;
        }
      }

      let span = 1;
      while (row + span < rows.length) {
        let samePrefix = true;
        for (let prevDim = 0; prevDim < dim; prevDim += 1) {
          if (rows[row + span]?.[prevDim] !== rows[row]?.[prevDim]) {
            samePrefix = false;
            break;
          }
        }
        if (!samePrefix || rows[row + span]?.[dim] !== rows[row]?.[dim]) {
          break;
        }
        span += 1;
      }
      spans[row]![dim] = span;
    }
  }

  return spans;
}

export function PivotTable({
  model,
  onUpdate,
  renderRowValue,
  editable = false,
  maxHeight = "500px",
  className,
  stickyHeader = true,
  showTotals = true,
  rowHeight = 60,
}: PivotTableProps) {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);
  const [localRows, setLocalRows] = useState(model.bodyRows);

  useMemo(() => {
    setLocalRows(model.bodyRows);
  }, [model.bodyRows]);

  const rowSpans = useMemo(() => buildRowSpanMatrix(localRows.map((r) => r.rowValues)), [localRows]);
  
  const hasRowSpans = useMemo(() => {
    return rowSpans.some(row => row.some(span => span > 1));
  }, [rowSpans]);

  const rowVirtualizer = useVirtualizer({
    count: localRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
    enabled: !hasRowSpans,
  });

  const handleValueChange = async (rowIndex: number, colIndex: number, value: number) => {
    const row = localRows[rowIndex];
    if (!row || !row.id || !onUpdate) return;

    const previousRows = [...localRows];
    const newRows = [...localRows];
    const newValues = [...row.values];
    newValues[colIndex] = value;
    newRows[rowIndex] = { ...row, values: newValues };
    
    setLocalRows(newRows);

    try {
      await onUpdate(row.id, colIndex, value);
    } catch (error) {
      setLocalRows(previousRows);
      console.error("Failed to update pivot table:", error);
    }
  };

  const headerDepth = model.headerRows.length;
  const totalCols = model.rowDimensions.length + (model.headerRows[0]?.length ?? 0) + (showTotals ? 1 : 0);

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom = virtualItems.length > 0 
    ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0)
    : 0;

  return (
    <div className={cn("flex flex-col w-full border rounded-lg bg-background overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <div className="min-w-full inline-block align-middle">
          <div 
            ref={parentRef}
            className="overflow-y-auto relative"
            style={{ maxHeight }}
          >
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className={cn(stickyHeader && "sticky top-0 z-20")}>
                {model.headerRows.map((headerRow, headerIndex) => (
                  <tr key={`header-${headerIndex}`} className="bg-muted/50 font-medium">
                    {headerIndex === 0 &&
                      model.rowDimensions.map((dimension) => (
                        <th
                          key={dimension}
                          rowSpan={headerDepth}
                          className="sticky left-0 z-30 px-3 py-2 text-left bg-muted/50 border-b border-r whitespace-nowrap font-bold"
                          style={{ top: 0 }}
                        >
                          {t(`web.reports.dimensions.${dimension}`, dimension)}
                        </th>
                      ))}
                    {headerRow.map((cell, cellIndex) => (
                      <th
                        key={`cell-${headerIndex}-${cellIndex}`}
                        colSpan={cell.colSpan}
                        className="px-3 py-2 text-center bg-muted/50 border-b border-r whitespace-nowrap font-bold"
                      >
                        {cell.label}
                      </th>
                    ))}
                    {headerIndex === 0 && showTotals && (
                      <th
                        rowSpan={headerDepth}
                        className="px-3 py-2 text-center bg-muted/50 border-b whitespace-nowrap font-bold"
                      >
                        {t('common.total')}
                      </th>
                    )}
                  </tr>
                ))}
              </thead>
              <tbody>
                {paddingTop > 0 && (
                  <tr>
                    <td colSpan={totalCols} style={{ height: `${paddingTop}px` }} />
                  </tr>
                )}
                {(hasRowSpans ? localRows : virtualItems.map(vi => localRows[vi.index])).map((row, idx) => {
                  if (!row) return null;
                  const virtualItem = virtualItems[idx];
                  const rowIndex = hasRowSpans ? idx : (virtualItem?.index ?? 0);
                  const rowTotal = row.values.reduce((sum: number, val) => sum + (Number(val) || 0), 0);

                  return (
                    <tr
                      key={rowIndex}
                      className="hover:bg-muted/30 transition-colors"
                      style={{ height: `${rowHeight}px` }}
                    >
                      {row.rowValues.map((value, valueIndex) => {
                        const span = rowSpans[rowIndex]?.[valueIndex] ?? 1;
                        if (span === 0) return null;
                        const dimension = model.rowDimensions[valueIndex] || "";
                        
                        return (
                          <td
                            key={`row-val-${rowIndex}-${valueIndex}`}
                            rowSpan={span}
                            className="sticky left-0 z-10 px-3 py-2 bg-background border-b border-r whitespace-nowrap align-middle"
                          >
                            <div className="flex flex-col">
                              {renderRowValue ? (
                                renderRowValue(value, dimension, row)
                              ) : (
                                <span className="font-medium">{value}</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      {row.values.map((value, colIndex) => (
                        <td
                          key={`cell-val-${rowIndex}-${colIndex}`}
                          className="px-2 py-2 border-b border-r whitespace-nowrap text-right align-middle"
                        >
                          {editable ? (
                            <Input
                              type="number"
                              min={0}
                              max={24}
                              step={0.5}
                              className="h-8 text-center px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-primary border-none bg-transparent hover:bg-muted/50"
                              value={value || ""}
                              placeholder="0"
                              onChange={(e) => {
                                const newVal = parseFloat(e.target.value) || 0;
                                handleValueChange(rowIndex, colIndex, newVal);
                              }}
                            />
                          ) : (
                            <span className="tabular-nums">
                              {typeof value === 'number' 
                                ? value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                                : value}
                            </span>
                          )}
                        </td>
                      ))}
                      {showTotals && (
                        <td className="px-3 py-2 border-b text-right font-bold align-middle tabular-nums">
                          {rowTotal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td colSpan={totalCols} style={{ height: `${paddingBottom}px` }} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
