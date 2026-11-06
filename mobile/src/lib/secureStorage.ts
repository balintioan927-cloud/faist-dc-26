import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;

type StorageIndex = {
  generation: string;
  count: number;
};

function indexKey(key: string) {
  return `${key}.index`;
}

function chunkKey(key: string, generation: string, index: number) {
  return `${key}.${generation}.${index}`;
}

// SecureStore encrypts values on-device and some iOS versions reject large
// values. Split the encoded Supabase session into small encrypted entries.
export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const rawIndex = await SecureStore.getItemAsync(indexKey(key));
    if (!rawIndex) return null;

    let index: StorageIndex;
    try {
      index = JSON.parse(rawIndex) as StorageIndex;
    } catch {
      return null;
    }
    if (!index.generation || !Number.isInteger(index.count) || index.count < 1 || index.count > 20) {
      return null;
    }

    const chunks: string[] = [];
    for (let i = 0; i < index.count; i += 1) {
      const chunk = await SecureStore.getItemAsync(chunkKey(key, index.generation, i));
      if (chunk === null) return null;
      chunks.push(chunk);
    }

    try {
      return decodeURIComponent(chunks.join(''));
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const encoded = encodeURIComponent(value);
    const chunks = encoded.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) ?? [''];
    const oldRawIndex = await SecureStore.getItemAsync(indexKey(key));
    const generation = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    // Write all new chunks first. The index is switched only after they exist.
    for (let i = 0; i < chunks.length; i += 1) {
      await SecureStore.setItemAsync(chunkKey(key, generation, i), chunks[i]);
    }
    const nextIndex: StorageIndex = { generation, count: chunks.length };
    await SecureStore.setItemAsync(indexKey(key), JSON.stringify(nextIndex));

    // Remove the previous generation after the new index is safely stored.
    if (oldRawIndex) {
      try {
        const oldIndex = JSON.parse(oldRawIndex) as StorageIndex;
        if (oldIndex.generation && Number.isInteger(oldIndex.count)) {
          for (let i = 0; i < oldIndex.count; i += 1) {
            await SecureStore.deleteItemAsync(chunkKey(key, oldIndex.generation, i));
          }
        }
      } catch {
        // A malformed old index is ignored; the active index is already valid.
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    const rawIndex = await SecureStore.getItemAsync(indexKey(key));
    if (rawIndex) {
      try {
        const index = JSON.parse(rawIndex) as StorageIndex;
        if (index.generation && Number.isInteger(index.count) && index.count > 0 && index.count <= 20) {
          for (let i = 0; i < index.count; i += 1) {
            await SecureStore.deleteItemAsync(chunkKey(key, index.generation, i));
          }
        }
      } catch {
        // Always remove the index even if it cannot be parsed.
      }
    }
    await SecureStore.deleteItemAsync(indexKey(key));
  },
};
