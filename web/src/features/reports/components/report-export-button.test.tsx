import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportExportButton } from './report-export-button';
import { useExportReport } from '../hooks';

vi.mock('../hooks', () => ({
  useExportReport: vi.fn(),
}));

describe('ReportExportButton', () => {
  const startDate = '2026-03-01';
  const endDate = '2026-03-31';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('renders Export Excel button', () => {
    vi.mocked(useExportReport).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    render(<ReportExportButton startDate={startDate} endDate={endDate} />);
    expect(screen.getByRole('button', { name: /export excel/i })).toBeDefined();
  });

  it('calls mutate with start_date and end_date on click', () => {
    const mutate = vi.fn();
    vi.mocked(useExportReport).mockReturnValue({ mutate, isPending: false } as any);
    render(<ReportExportButton startDate={startDate} endDate={endDate} />);
    
    fireEvent.click(screen.getByRole('button', { name: /export excel/i }));
    expect(mutate).toHaveBeenCalledWith(
      { start_date: startDate, end_date: endDate },
      expect.any(Object)
    );
  });

  it('shows "Exporting…" text and button is disabled while isPending is true', () => {
    vi.mocked(useExportReport).mockReturnValue({ mutate: vi.fn(), isPending: true } as any);
    render(<ReportExportButton startDate={startDate} endDate={endDate} />);
    
    expect(screen.getByText('Exporting…')).toBeDefined();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('triggers file download when mutation succeeds', () => {
    const mutate = vi.fn((_params, options) => {
      options.onSuccess(new Blob(['test']));
    });
    vi.mocked(useExportReport).mockReturnValue({ mutate, isPending: false } as any);
    
    // Mock document.createElement only for 'a' tag
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') return mockAnchor as any;
      return originalCreateElement(tagName);
    });

    render(<ReportExportButton startDate={startDate} endDate={endDate} />);
    fireEvent.click(screen.getByRole('button', { name: /export excel/i }));

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchor.download).toContain(`timesheet_export_${startDate}_${endDate}.xlsx`);
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
