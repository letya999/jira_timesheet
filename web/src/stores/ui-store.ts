import { create } from 'zustand';

interface DateRange {
  from: string;
  to: string;
}

interface UIState {
  sidebarOpen: boolean;
  locale: string;
  activeFilters: Record<string, unknown>;
  selectedPeriod: DateRange | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setLocale: (locale: string) => void;
  setActiveFilters: (filters: Record<string, unknown>) => void;
  setSelectedPeriod: (period: DateRange | null) => void;
}

// Session-only store — intentionally not persisted
export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  locale: 'en',
  activeFilters: {},
  selectedPeriod: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setLocale: (locale) => set({ locale }),
  setActiveFilters: (activeFilters) => set({ activeFilters }),
  setSelectedPeriod: (selectedPeriod) => set({ selectedPeriod }),
}));
