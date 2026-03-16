import { useMemo, useState } from 'react';
import type { DateGranularity } from '../hooks/use-report-filters';
import { buildPivotTableModel } from '../utils/pivot-table';

type Row = Record<string, unknown>;

interface ReportDataTableProps {
  data: Row[];
  rowDimensions: string[];
  columnDimensions: string[];
  groupHorizontallyBy: string | null;
  groupVerticallyBy: string | null;
  dateGranularity: DateGranularity;
}

function prettyLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
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

export function ReportDataTable({
  data,
  rowDimensions,
  columnDimensions,
  groupHorizontallyBy,
  groupVerticallyBy,
  dateGranularity,
}: ReportDataTableProps) {
  const [isFocused, setIsFocused] = useState(false);
  const model = useMemo(
    () =>
      buildPivotTableModel({
        data,
        rowDimensions,
        columnDimensions,
        groupHorizontallyBy,
        groupVerticallyBy,
        dateGranularity,
      }),
    [columnDimensions, data, dateGranularity, groupHorizontallyBy, groupVerticallyBy, rowDimensions]
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No results.
      </div>
    );
  }

  const headerDepth = model.headerRows.length;
  const rowSpans = useMemo(
    () => buildRowSpanMatrix(model.bodyRows.map((row) => row.rowValues)),
    [model.bodyRows]
  );

  return (
    <div
      className="space-y-2"
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      <div
        className={`rounded-md border overflow-auto transition-[height] duration-200 ${
          isFocused ? 'h-[calc(100vh-15rem)]' : 'h-[28rem]'
        }`}
      >
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            {model.headerRows.map((headerRow, headerIndex) => (
              <tr key={`header-${headerIndex}`} className="border-b">
                {headerIndex === 0 &&
                  model.rowDimensions.map((dimension) => (
                    <th
                      key={dimension}
                      rowSpan={headerDepth}
                      className="sticky z-20 px-3 py-2 text-left bg-background border-b border-r whitespace-nowrap"
                      style={{ top: 0 }}
                    >
                      {prettyLabel(dimension)}
                    </th>
                  ))}
                {headerRow.map((cell, cellIndex) => (
                  <th
                    key={`cell-${headerIndex}-${cellIndex}`}
                    colSpan={cell.colSpan}
                    className="sticky z-20 px-3 py-2 text-left bg-background border-b border-r whitespace-nowrap"
                    style={{ top: `${headerIndex * 40}px` }}
                  >
                    {cell.label}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {model.bodyRows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className="border-b hover:bg-muted/50">
                {row.rowValues.map((value, valueIndex) => {
                  const span = rowSpans[rowIndex]?.[valueIndex] ?? 1;
                  if (span === 0) return null;
                  return (
                    <td
                      key={`row-value-${rowIndex}-${valueIndex}`}
                      rowSpan={span}
                      className="px-3 py-2 border-b border-r whitespace-nowrap align-top"
                    >
                      {value}
                    </td>
                  );
                })}
                {row.values.map((value, valueIndex) => (
                  <td
                    key={`cell-value-${rowIndex}-${valueIndex}`}
                    className="px-3 py-2 border-b border-r whitespace-nowrap text-right tabular-nums"
                  >
                    {value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
