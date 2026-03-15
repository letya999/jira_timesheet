import type { Meta, StoryObj } from '@storybook/react'
import { ReportSummaryCard } from '@/components/shared/report-summary-card'
import { http, HttpResponse, delay } from 'msw'

const meta: Meta<typeof ReportSummaryCard> = {
  title: 'Organisms/ReportSummaryCard',
  component: ReportSummaryCard,
  tags: ['autodocs'],
  args: {
    title: 'March 2026 Summary',
    period: 'March 1, 2026 - March 31, 2026',
    totalHours: 168,
    capexHours: 126,
    opexHours: 42,
  },
} satisfies Meta<typeof ReportSummaryCard>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  args: {
    totalHours: 168,
    capexHours: 126,
    opexHours: 42,
  },
}

export const MostlyOpEx: Story = {
  args: {
    totalHours: 160,
    capexHours: 32,
    opexHours: 128,
  },
}

export const Empty: Story = {
  args: {
    totalHours: 0,
    capexHours: 0,
    opexHours: 0,
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/reports/summary', async () => {
          await delay('infinite')
          return HttpResponse.json({})
        }),
      ],
    },
  },
}

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/reports/summary', () => {
          return new HttpResponse(null, { status: 500 })
        }),
      ],
    },
  },
}
