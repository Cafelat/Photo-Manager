import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Collection } from '../types/photo';

interface CollectionStore {
  // State
  collections: Collection[];
  selectedCollectionId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCollections: (collections: Collection[]) => void;
  addCollection: (collection: Collection) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  removeCollection: (id: string) => void;
  addPhotoToCollection: (collectionId: string, photoId: string) => void;
  removePhotoFromCollection: (collectionId: string, photoId: string) => void;
  setSelectedCollection: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCollections: () => void;

  // Computed
  getCollectionById: (id: string) => Collection | undefined;
  getSelectedCollection: () => Collection | undefined;
  getCollectionsForPhoto: (photoId: string) => Collection[];
}

export const useCollectionStore = create<CollectionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      collections: [],
      selectedCollectionId: null,
      isLoading: false,
      error: null,

      // Actions
      setCollections: (collections) => set({ collections, error: null }),

      addCollection: (collection) =>
        set((state) => ({
          collections: [...state.collections, collection],
          error: null,
        })),

      updateCollection: (id, updates) =>
        set((state) => ({
          collections: state.collections.map((collection) =>
            collection.id === id ? { ...collection, ...updates } : collection
          ),
          error: null,
        })),

      removeCollection: (id) =>
        set((state) => ({
          collections: state.collections.filter(
            (collection) => collection.id !== id
          ),
          selectedCollectionId:
            state.selectedCollectionId === id
              ? null
              : state.selectedCollectionId,
          error: null,
        })),

      addPhotoToCollection: (collectionId, photoId) =>
        set((state) => ({
          collections: state.collections.map((collection) =>
            collection.id === collectionId
              ? {
                  ...collection,
                  photoIds: collection.photoIds.includes(photoId)
                    ? collection.photoIds
                    : [...collection.photoIds, photoId],
                }
              : collection
          ),
          error: null,
        })),

      removePhotoFromCollection: (collectionId, photoId) =>
        set((state) => ({
          collections: state.collections.map((collection) =>
            collection.id === collectionId
              ? {
                  ...collection,
                  photoIds: collection.photoIds.filter((id) => id !== photoId),
                }
              : collection
          ),
          error: null,
        })),

      setSelectedCollection: (id) => set({ selectedCollectionId: id }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      clearCollections: () =>
        set({
          collections: [],
          selectedCollectionId: null,
          error: null,
        }),

      // Computed
      getCollectionById: (id) =>
        get().collections.find((collection) => collection.id === id),

      getSelectedCollection: () => {
        const { selectedCollectionId, collections } = get();
        return selectedCollectionId
          ? collections.find(
              (collection) => collection.id === selectedCollectionId
            )
          : undefined;
      },

      getCollectionsForPhoto: (photoId) =>
        get().collections.filter((collection) =>
          collection.photoIds.includes(photoId)
        ),
    }),
    {
      name: 'collection-store',
      partialize: (state) => ({
        collections: state.collections,
      }),
    }
  )
);
