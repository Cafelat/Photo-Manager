import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Photo } from '../types/photo';

export type ViewMode = 'grid' | 'detail';

interface PhotoStore {
  // State
  photos: Photo[];
  selectedPhotoId: string | null;
  viewMode: ViewMode;
  isLoading: boolean;
  error: string | null;

  // Actions
  setPhotos: (photos: Photo[]) => void;
  addPhoto: (photo: Photo) => void;
  addPhotos: (photos: Photo[]) => void;
  updatePhoto: (id: string, updates: Partial<Photo>) => void;
  removePhoto: (id: string) => void;
  setSelectedPhoto: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearPhotos: () => void;

  // Computed
  getPhotoById: (id: string) => Photo | undefined;
  getSelectedPhoto: () => Photo | undefined;
}

export const usePhotoStore = create<PhotoStore>()(
  persist(
    (set, get) => ({
      // Initial state
      photos: [],
      selectedPhotoId: null,
      viewMode: 'grid',
      isLoading: false,
      error: null,

      // Actions
      setPhotos: (photos) => set({ photos, error: null }),

      addPhoto: (photo) =>
        set((state) => ({
          photos: [...state.photos, photo],
          error: null,
        })),

      addPhotos: (newPhotos) =>
        set((state) => ({
          photos: [...state.photos, ...newPhotos],
          error: null,
        })),

      updatePhoto: (id, updates) =>
        set((state) => ({
          photos: state.photos.map((photo) =>
            photo.id === id ? { ...photo, ...updates } : photo
          ),
          error: null,
        })),

      removePhoto: (id) =>
        set((state) => ({
          photos: state.photos.filter((photo) => photo.id !== id),
          selectedPhotoId:
            state.selectedPhotoId === id ? null : state.selectedPhotoId,
          error: null,
        })),

      setSelectedPhoto: (id) => set({ selectedPhotoId: id }),

      setViewMode: (mode) => set({ viewMode: mode }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      clearPhotos: () =>
        set({
          photos: [],
          selectedPhotoId: null,
          error: null,
        }),

      // Computed
      getPhotoById: (id) => get().photos.find((photo) => photo.id === id),

      getSelectedPhoto: () => {
        const { selectedPhotoId, photos } = get();
        return selectedPhotoId
          ? photos.find((photo) => photo.id === selectedPhotoId)
          : undefined;
      },
    }),
    {
      name: 'photo-store',
      partialize: (state) => ({
        viewMode: state.viewMode,
      }),
    }
  )
);
