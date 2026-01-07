import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PhotoFilters } from '../types/photo';

interface FilterStore {
  // State
  filters: PhotoFilters;
  isActive: boolean;

  // Actions
  setTagFilter: (tags: string[]) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  setRatingFilter: (minRating: number | undefined) => void;
  setDateRangeFilter: (start?: Date, end?: Date) => void;
  setKeywordFilter: (keyword: string) => void;
  clearFilters: () => void;
  clearDateRange: () => void;

  // Computed
  hasActiveFilters: () => boolean;
}

const initialFilters: PhotoFilters = {
  tags: [],
  minRating: undefined,
  dateRange: undefined,
  keyword: '',
};

export const useFilterStore = create<FilterStore>()(
  persist(
    (set, get) => ({
      // Initial state
      filters: initialFilters,
      isActive: false,

      // Actions
      setTagFilter: (tags) =>
        set((state) => ({
          filters: { ...state.filters, tags },
          isActive: true,
        })),

      addTag: (tag) =>
        set((state) => {
          const tags = state.filters.tags.includes(tag)
            ? state.filters.tags
            : [...state.filters.tags, tag];
          return {
            filters: { ...state.filters, tags },
            isActive: true,
          };
        }),

      removeTag: (tag) =>
        set((state) => ({
          filters: {
            ...state.filters,
            tags: state.filters.tags.filter((t) => t !== tag),
          },
          isActive: true,
        })),

      setRatingFilter: (minRating) =>
        set((state) => ({
          filters: { ...state.filters, minRating },
          isActive: true,
        })),

      setDateRangeFilter: (start, end) =>
        set((state) => ({
          filters: {
            ...state.filters,
            dateRange: start && end ? { start, end } : undefined,
          },
          isActive: true,
        })),

      setKeywordFilter: (keyword) =>
        set((state) => ({
          filters: { ...state.filters, keyword },
          isActive: true,
        })),

      clearDateRange: () =>
        set((state) => ({
          filters: { ...state.filters, dateRange: undefined },
          isActive: get().hasActiveFilters(),
        })),

      clearFilters: () =>
        set({
          filters: initialFilters,
          isActive: false,
        }),

      // Computed
      hasActiveFilters: () => {
        const { filters } = get();
        return (
          filters.tags.length > 0 ||
          filters.minRating !== undefined ||
          filters.dateRange !== undefined ||
          (filters.keyword?.trim() ?? '') !== ''
        );
      },
    }),
    {
      name: 'filter-store',
    }
  )
);
