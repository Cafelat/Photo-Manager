import { tauriCommands, DbCollection } from './tauriCommands';
import { Collection } from '../types/photo';
import { useCollectionStore } from '../stores/collectionStore';

// Convert database collection to frontend Collection type
function dbCollectionToCollection(
  dbCollection: DbCollection,
  photoIds: string[]
): Collection {
  return {
    id: dbCollection.id.toString(),
    name: dbCollection.name,
    photoIds,
    createdAt: new Date(dbCollection.created_at),
  };
}

export const collectionFlows = {
  /**
   * Create a new collection
   */
  async createCollection(name: string): Promise<Collection> {
    try {
      const collectionId = await tauriCommands.createCollection(name);

      const collection: Collection = {
        id: collectionId.toString(),
        name,
        photoIds: [],
        createdAt: new Date(),
      };

      const store = useCollectionStore.getState();
      store.addCollection(collection);

      return collection;
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw error;
    }
  },

  /**
   * Load all collections from database
   */
  async loadCollections(): Promise<void> {
    try {
      const dbCollections = await tauriCommands.getAllCollections();

      // For each collection, we need to get the photo IDs
      // Note: In a real implementation, we might want to optimize this
      const collections: Collection[] = [];

      for (const dbCollection of dbCollections) {
        const dbPhotos = await tauriCommands.getPhotosInCollection(
          dbCollection.id
        );
        const photoIds = dbPhotos.map((p) => p.id.toString());

        collections.push(
          dbCollectionToCollection(dbCollection, photoIds)
        );
      }

      const store = useCollectionStore.getState();
      store.setCollections(collections);
    } catch (error) {
      console.error('Failed to load collections:', error);
      throw error;
    }
  },

  /**
   * Add photo to collection with optimistic update
   */
  async addPhotoToCollection(
    collectionId: string,
    photoId: string
  ): Promise<void> {
    const store = useCollectionStore.getState();
    const collection = store.getCollectionById(collectionId);

    if (!collection) {
      throw new Error('Collection not found');
    }

    // Optimistic update
    store.addPhotoToCollection(collectionId, photoId);

    try {
      const dbCollectionId = parseInt(collectionId, 10);
      const dbPhotoId = parseInt(photoId, 10);

      await tauriCommands.addPhotoToCollection(dbPhotoId, dbCollectionId);
    } catch (error) {
      // Revert on error
      store.removePhotoFromCollection(collectionId, photoId);
      throw error;
    }
  },

  /**
   * Remove photo from collection with optimistic update
   */
  async removePhotoFromCollection(
    collectionId: string,
    photoId: string
  ): Promise<void> {
    const store = useCollectionStore.getState();
    const collection = store.getCollectionById(collectionId);

    if (!collection) {
      throw new Error('Collection not found');
    }

    // Optimistic update
    store.removePhotoFromCollection(collectionId, photoId);

    try {
      const dbCollectionId = parseInt(collectionId, 10);
      const dbPhotoId = parseInt(photoId, 10);

      await tauriCommands.removePhotoFromCollection(dbPhotoId, dbCollectionId);
    } catch (error) {
      // Revert on error
      store.addPhotoToCollection(collectionId, photoId);
      throw error;
    }
  },

  /**
   * Delete a collection
   */
  async deleteCollection(collectionId: string): Promise<void> {
    const store = useCollectionStore.getState();
    const collection = store.getCollectionById(collectionId);

    if (!collection) {
      throw new Error('Collection not found');
    }

    // Optimistic update
    store.removeCollection(collectionId);

    try {
      // Note: We need to add a delete_collection command to the backend
      // For now, this is a placeholder
      console.warn('Delete collection not yet implemented in backend');
      // await tauriCommands.deleteCollection(parseInt(collectionId, 10));
    } catch (error) {
      // Revert on error
      store.addCollection(collection);
      throw error;
    }
  },
};
