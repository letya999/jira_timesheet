import type { Meta, StoryObj } from '@storybook/react'
import { OrgTreeNode, OrgUnit } from '@/components/shared/org-tree-node'
import { http, HttpResponse, delay } from 'msw'
import { fn } from '@storybook/test'

const mockOrg: OrgUnit = {
  id: 1,
  name: 'Global Enterprise',
  type: 'ORGANIZATION',
  memberCount: 500,
  children: [
    {
      id: 2,
      name: 'Engineering',
      type: 'DEPARTMENT',
      memberCount: 200,
      children: [
        { id: 4, name: 'Frontend Team', type: 'TEAM', memberCount: 15 },
        { id: 5, name: 'Backend Team', type: 'TEAM', memberCount: 20 },
        { id: 6, name: 'Platform Team', type: 'TEAM', memberCount: 10 },
      ]
    },
    {
      id: 3,
      name: 'Design',
      type: 'DEPARTMENT',
      memberCount: 50,
      children: [
        { id: 7, name: 'UI/UX Team', type: 'TEAM', memberCount: 12 },
        { id: 8, name: 'Brand Team', type: 'TEAM', memberCount: 8 },
      ]
    }
  ]
}

const meta: Meta<typeof OrgTreeNode> = {
  title: 'Organisms/OrgTreeNode',
  component: OrgTreeNode,
  tags: ['autodocs'],
  args: {
    node: mockOrg,
    onNodeClick: fn(),
  },
} satisfies Meta<typeof OrgTreeNode>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  args: {
    defaultExpanded: true,
  },
}

export const Collapsed: Story = {
  args: {
    defaultExpanded: false,
  },
}

export const SingleTeam: Story = {
  args: {
    node: { id: 10, name: 'Small Team', type: 'TEAM', memberCount: 5 },
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/org/tree', async () => {
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
        http.get('/api/v1/org/tree', () => {
          return new HttpResponse(null, { status: 500 })
        }),
      ],
    },
  },
}
