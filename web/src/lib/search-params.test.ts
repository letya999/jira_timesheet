import { describe, it, expect } from 'vitest';
import {
  paginationSchema,
  dateRangeSchema,
  sortSchema,
  timesheetFilterSchema,
  approvalFilterSchema,
} from './search-params';

describe('paginationSchema', () => {
  it('defaults page to 1 and limit to 50 for invalid values', () => {
    expect(paginationSchema.parse({ page: -5, limit: 0 })).toEqual({ page: 1, limit: 50 });
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 50 });
  });

  it('accepts valid values', () => {
    expect(paginationSchema.parse({ page: 3, limit: 100 })).toEqual({ page: 3, limit: 100 });
  });

  it('clamps limit to max 200', () => {
    expect(paginationSchema.parse({ page: 1, limit: 500 })).toEqual({ page: 1, limit: 50 });
  });
});

describe('dateRangeSchema', () => {
  it('accepts valid ISO date strings', () => {
    const result = dateRangeSchema.parse({ from: '2026-01-01', to: '2026-03-31' });
    expect(result).toEqual({ from: '2026-01-01', to: '2026-03-31' });
  });

  it('allows empty object', () => {
    expect(dateRangeSchema.parse({})).toEqual({});
  });

  it('rejects invalid date format', () => {
    expect(() => dateRangeSchema.parse({ from: 'not-a-date' })).toThrow();
  });
});

describe('sortSchema', () => {
  it('defaults sortDir to desc for invalid values', () => {
    expect(sortSchema.parse({ sortDir: 'invalid' })).toMatchObject({ sortDir: 'desc' });
  });

  it('accepts asc and desc', () => {
    expect(sortSchema.parse({ sortBy: 'date', sortDir: 'asc' })).toEqual({
      sortBy: 'date',
      sortDir: 'asc',
    });
  });
});

describe('timesheetFilterSchema', () => {
  it('parses combined params with defaults', () => {
    const result = timesheetFilterSchema.parse({
      from: '2026-03-01',
      to: '2026-03-31',
      type: 'JIRA',
    });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.sortDir).toBe('desc');
    expect(result.type).toBe('JIRA');
  });

  it('rejects invalid worklog type', () => {
    expect(() => timesheetFilterSchema.parse({ type: 'UNKNOWN' })).toThrow();
  });
});

describe('approvalFilterSchema', () => {
  it('accepts valid status values', () => {
    const result = approvalFilterSchema.parse({ status: 'SUBMITTED' });
    expect(result.status).toBe('SUBMITTED');
  });

  it('rejects invalid status', () => {
    expect(() => approvalFilterSchema.parse({ status: 'INVALID' })).toThrow();
  });
});
