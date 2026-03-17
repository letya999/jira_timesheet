import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrgTreeNode } from './org-tree-node';
import { Accordion } from '@/components/ui/accordion';

describe('OrgTreeNode', () => {
  const mockAllUnits = [
    { id: 1, name: 'Root Unit', parent_id: null, reporting_period: 'weekly' },
    { id: 2, name: 'Child Unit', parent_id: 1, reporting_period: 'monthly' },
  ] as any;

  it('renders unit name and reporting period', () => {
    render(
      <Accordion type="multiple">
        <OrgTreeNode unit={mockAllUnits[0]} allUnits={mockAllUnits} />
      </Accordion>
    );
    expect(screen.getByText('Root Unit')).toBeDefined();
    expect(screen.getByText('Weekly')).toBeDefined();
  });

  it('renders child units recursively', () => {
    render(
      <Accordion type="multiple" defaultValue={['unit-1']}>
        <OrgTreeNode unit={mockAllUnits[0]} allUnits={mockAllUnits} />
      </Accordion>
    );
    expect(screen.getByText('Child Unit')).toBeDefined();
    expect(screen.getByText('Monthly')).toBeDefined();
  });

  it('renders leaf node without children', () => {
    render(
      <Accordion type="multiple" defaultValue={['unit-2']}>
        <OrgTreeNode unit={mockAllUnits[1]} allUnits={mockAllUnits} />
      </Accordion>
    );
    expect(screen.getByText('Child Unit')).toBeDefined();
    expect(screen.queryByText('Root Unit')).toBeNull();
  });
});
