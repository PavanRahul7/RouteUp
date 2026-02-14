
import { Route, LatLng } from '../types';

const DB_NAME = 'CoffeeRouteOffline';
const DB_VERSION = 1;
const STORES = {
  ROUTES: 'routes',
  TILES: 'tiles'
};

class OfflineService {
  private db: IDBDatabase | null = null;

  async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORES.ROUTES)) {
          db.createObjectStore(STORES.ROUTES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.TILES)) {
          db.createObjectStore(STORES.TILES);
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve(this.db!);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveRoute(route: Route): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ROUTES, 'readwrite');
      const store = transaction.objectStore(STORES.ROUTES);
      store.put(route);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getOfflineRoutes(): Promise<Route[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ROUTES, 'readonly');
      const store = transaction.objectStore(STORES.ROUTES);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async isRouteOffline(routeId: string): Promise<boolean> {
    const db = await this.initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORES.ROUTES, 'readonly');
      const store = transaction.objectStore(STORES.ROUTES);
      const request = store.get(routeId);
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => resolve(false);
    });
  }

  async saveTile(key: string, blob: Blob): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TILES, 'readwrite');
      const store = transaction.objectStore(STORES.TILES);
      store.put(blob, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getTile(key: string): Promise<Blob | null> {
    const db = await this.initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORES.TILES, 'readonly');
      const store = transaction.objectStore(STORES.TILES);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  // Calculate tiles needed for a route path at zoom levels 14-17
  async downloadRouteResources(route: Route, onProgress: (p: number) => void): Promise<void> {
    const zoomLevels = [14, 15, 16, 17];
    const tilesToFetch: string[] = [];

    // Helper to get tile coordinates from lat/lng
    const getTileCoords = (lat: number, lng: number, zoom: number) => {
      const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
      const y = Math.floor(
        ((1 -
          Math.log(
            Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
          ) /
            Math.PI) /
          2) *
          Math.pow(2, zoom)
      );
      return { x, y };
    };

    // Collect all tile keys for the route path
    zoomLevels.forEach(z => {
      const seen = new Set<string>();
      route.path.forEach(p => {
        const { x, y } = getTileCoords(p.lat, p.lng, z);
        const key = `${z}/${x}/${y}`;
        if (!seen.has(key)) {
          tilesToFetch.push(key);
          seen.add(key);
        }
      });
    });

    let completed = 0;
    const total = tilesToFetch.length;

    // Save the route metadata first
    await this.saveRoute(route);

    // Fetch tiles in small batches to avoid overwhelming
    const batchSize = 5;
    for (let i = 0; i < tilesToFetch.length; i += batchSize) {
      const batch = tilesToFetch.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async key => {
          try {
            const exists = await this.getTile(key);
            if (!exists) {
              const res = await fetch(`https://a.basemaps.cartocdn.com/dark_all/${key}.png`);
              const blob = await res.blob();
              await this.saveTile(key, blob);
            }
          } catch (e) {
            console.warn(`Failed to fetch tile ${key}`, e);
          }
          completed++;
          onProgress(Math.round((completed / total) * 100));
        })
      );
    }
  }

  async removeRoute(routeId: string): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction(STORES.ROUTES, 'readwrite');
    transaction.objectStore(STORES.ROUTES).delete(routeId);
  }
}

export const offlineService = new OfflineService();
