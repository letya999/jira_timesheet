import { format, getISOWeek, parseISO, startOfMonth, startOfQuarter, startOfWeek, subWeeks } from 'date-fns';
import type { DateGranularity } from '../hooks/use-report-filters';

type Row = Record<string, unknown>;

export interface PivotHeaderCell {
  label: string;
  colSpan: number;
}

export interface PivotBodyRow {
  rowValues: string[];
  values: number[];
}

export interface PivotTableModel {
  rowDimensions: string[];
  columnDimensions: string[];
  headerRows: PivotHeaderCell[][];
  bodyRows: PivotBodyRow[];
}

const SEP = '\u0001';
const DIMENSION_KEY_MAP: Record<string, string> = {
  division: 'parent',
};

function toDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return 'N/A';
  const str = String(value).trim();
  return str.length > 0 ? str : 'N/A';
}

function normalizeDate(value: unknown): Date | null {
  if (!value) return null;
  const raw = String(value);
  const date = parseISO(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateByGranularity(value: unknown, granularity: DateGranularity): string {
  const date = normalizeDate(value);
  if (!date) return 'N/A';

  if (granularity === 'day') {
    return format(date, 'yyyy-MM-dd');
  }

  if (granularity === 'week') {
    return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  }

  if (granularity === '2weeks') {
    const monday = startOfWeek(date, { weekStartsOn: 1 });
    const isoWeek = getISOWeek(date);
    const bucketStart = isoWeek % 2 === 0 ? subWeeks(monday, 1) : monday;
    return format(bucketStart, 'yyyy-MM-dd');
  }

  if (granularity === 'month') {
    return format(startOfMonth(date), 'yyyy-MM-dd');
  }

  return format(startOfQuarter(date), 'yyyy-MM-dd');
}

function dimensionValue(row: Row, dimension: string, dateGranularity: DateGranularity): string {
  if (dimension === 'date') {
    return formatDateByGranularity(row.date, dateGranularity);
  }
  const key = DIMENSION_KEY_MAP[dimension] ?? dimension;
  return toDisplayValue(row[key]);
}

function tupleCompare(a: string[], b: string[]): number {
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    const left = a[i] ?? '';
    const right = b[i] ?? '';
    const cmp = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp;
  }
  return 0;
}

function compactUnique(values: string[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    if (value && !result.includes(value)) {
      result.push(value);
    }
  }
  return result;
}

function prefixKey(parts: string[], level: number): string {
  return parts.slice(0, level + 1).join(SEP);
}

function buildHeaderRows(columnTuples: string[][], depth: number): PivotHeaderCell[][] {
  const rows: PivotHeaderCell[][] = [];

  for (let level = 0; level < depth; level += 1) {
    const headerCells: PivotHeaderCell[] = [];
    let index = 0;

    while (index < columnTuples.length) {
      const tuple = columnTuples[index]!;
      const label = tuple[level] ?? 'N/A';
      const targetPrefix = prefixKey(tuple, level);

      let span = 1;
      while (index + span < columnTuples.length && prefixKey(columnTuples[index + span]!, level) === targetPrefix) {
        span += 1;
      }

      headerCells.push({ label, colSpan: span });
      index += span;
    }

    rows.push(headerCells);
  }

  return rows;
}

export function buildPivotTableModel(params: {
  data: Row[];
  rowDimensions: string[];
  columnDimensions: string[];
  groupHorizontallyBy: string | null;
  groupVerticallyBy: string | null;
  dateGranularity: DateGranularity;
}): PivotTableModel {
  const baseRowDimensions = compactUnique(params.rowDimensions);
  const selectedCols = compactUnique(params.columnDimensions);
  const horizontalDimension = params.groupHorizontallyBy ?? null;
  const verticalDimension = params.groupVerticallyBy ?? null;
  const rowDimensions = horizontalDimension
    ? baseRowDimensions.filter((dim) => dim !== horizontalDimension && dim !== verticalDimension)
    : baseRowDimensions.filter((dim) => dim !== verticalDimension);
  const effectiveRowDimensions = compactUnique([
    ...(verticalDimension ? [verticalDimension] : []),
    ...rowDimensions,
  ]);
  const columnDimensions = compactUnique([
    ...(horizontalDimension ? [horizontalDimension] : []),
    ...selectedCols.filter((dim) => dim !== horizontalDimension && dim !== verticalDimension),
  ]);

  const valueByRowAndCol = new Map<string, Map<string, number>>();
  const rowTupleByKey = new Map<string, string[]>();
  const colTupleByKey = new Map<string, string[]>();

  for (const item of params.data) {
    const rowTuple = effectiveRowDimensions.map((dim) => dimensionValue(item, dim, params.dateGranularity));
    const colTuple = columnDimensions.map((dim) => dimensionValue(item, dim, params.dateGranularity));
    const rowKey = rowTuple.join(SEP);
    const colKey = colTuple.join(SEP);

    if (!rowTupleByKey.has(rowKey)) rowTupleByKey.set(rowKey, rowTuple);
    if (!colTupleByKey.has(colKey)) colTupleByKey.set(colKey, colTuple);

    const value = typeof item.value === 'number' ? item.value : Number(item.value ?? 0);
    const safeValue = Number.isFinite(value) ? value : 0;

    if (!valueByRowAndCol.has(rowKey)) {
      valueByRowAndCol.set(rowKey, new Map<string, number>());
    }
    const rowBucket = valueByRowAndCol.get(rowKey)!;
    rowBucket.set(colKey, (rowBucket.get(colKey) ?? 0) + safeValue);
  }

  const sortedRowEntries = Array.from(rowTupleByKey.entries()).sort((a, b) => tupleCompare(a[1], b[1]));
  const sortedColumnEntries: Array<[string, string[]]> = columnDimensions.length > 0
    ? Array.from(colTupleByKey.entries()).sort((a, b) => tupleCompare(a[1], b[1]))
    : [['__total__', ['Total']]];

  const headerRows = columnDimensions.length > 0
    ? buildHeaderRows(sortedColumnEntries.map((entry) => entry[1]), columnDimensions.length)
    : [[{ label: 'Total', colSpan: 1 }]];

  const bodyRows: PivotBodyRow[] = sortedRowEntries.map(([rowKey, rowTuple]) => {
    const rowBucket = valueByRowAndCol.get(rowKey) ?? new Map<string, number>();

    if (columnDimensions.length === 0) {
      const total = Array.from(rowBucket.values()).reduce((sum, val) => sum + val, 0);
      return { rowValues: rowTuple, values: [total] };
    }

    const values = sortedColumnEntries.map(([colKey]) => rowBucket.get(colKey) ?? 0);
    return { rowValues: rowTuple, values };
  });

  return {
    rowDimensions: effectiveRowDimensions,
    columnDimensions,
    headerRows,
    bodyRows,
  };
}
