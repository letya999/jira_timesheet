import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useUIStore } from './ui-store';

beforeEach(() => {
  act(() => {
    useUIStore.setState({
      sidebarOpen: true,
      locale: 'en',
      activeFilters: {},
      selectedPeriod: null,
    });
  });
});

describe('useUIStore', () => {
  it('starts with default state', () => {
    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(true);
    expect(state.locale).toBe('en');
    expect(state.activeFilters).toEqual({});
    expect(state.selectedPeriod).toBeNull();
  });

  it('setSidebarOpen sets the value', () => {
    act(() => useUIStore.getState().setSidebarOpen(false));
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('toggleSidebar flips the value', () => {
    act(() => useUIStore.getState().toggleSidebar());
    expect(useUIStore.getState().sidebarOpen).toBe(false);
    act(() => useUIStore.getState().toggleSidebar());
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('setLocale updates locale', () => {
    act(() => useUIStore.getState().setLocale('ru'));
    expect(useUIStore.getState().locale).toBe('ru');
  });

  it('setActiveFilters replaces filters', () => {
    act(() => useUIStore.getState().setActiveFilters({ status: 'SUBMITTED', page: 2 }));
    expect(useUIStore.getState().activeFilters).toEqual({ status: 'SUBMITTED', page: 2 });
  });

  it('setSelectedPeriod sets and clears the period', () => {
    const period = { from: '2026-03-01', to: '2026-03-31' };
    act(() => useUIStore.getState().setSelectedPeriod(period));
    expect(useUIStore.getState().selectedPeriod).toEqual(period);

    act(() => useUIStore.getState().setSelectedPeriod(null));
    expect(useUIStore.getState().selectedPeriod).toBeNull();
  });
});
