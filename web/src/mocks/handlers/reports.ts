import { http, HttpResponse } from 'msw'

const mockReportSummary = {
  title: 'Current Month Summary',
  period: 'March 1, 2026 - March 31, 2026',
  totalHours: 168,
  capexHours: 126,
  opexHours: 42,
}

export const reportsHandlers = [
  http.get('/api/v1/reports/summary', () => {
    return HttpResponse.json(mockReportSummary)
  })
]
