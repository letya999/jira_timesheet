import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { UserEditDialog } from './user-edit-dialog';

vi.mock('@/features/users/hooks', () => ({
  useUpdateUser: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  usePromoteUser: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

describe('UserEditDialog', () => {
  it('renders without crashing when org_unit_ids are missing', () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <UserEditDialog
          isOpen
          user={{
            id: 1,
            type: 'system',
            full_name: 'Alice Admin',
            email: 'alice@example.com',
            role: 'Admin',
          } as any}
          orgUnits={[]}
          onClose={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('dialog')).toBeDefined();
  });
});
