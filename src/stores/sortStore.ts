import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SortBy, SortOrder } from '../types/photo';

interface SortStore {
  // State
  sortBy: SortBy;
  sortOrder: SortOrder;

  // Actions
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;
  toggleSortOrder: () => void;
  setSort: (sortBy: SortBy, sortOrder: SortOrder) => void;
}

export const useSortStore = create<SortStore>()(
  persist(
    (set) => ({
      // Initial state
      sortBy: 'addedDate',
      sortOrder: 'desc',

      // Actions
      setSortBy: (sortBy) => set({ sortBy }),

      setSortOrder: (sortOrder) => set({ sortOrder }),

      toggleSortOrder: () =>
        set((state) => ({
          sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc',
        })),

      setSort: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
    }),
    {
      name: 'sort-store',
    }
  )
);
