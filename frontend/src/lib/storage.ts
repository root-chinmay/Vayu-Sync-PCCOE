import { openDB, IDBPDatabase } from 'idb';
import { WeatherResponse, IntelligenceSummary, UserContext, HistoricalAnomalyReport, HotspotReport } from './types';

const DB_NAME = 'vayusync_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('weather')) {
          db.createObjectStore('weather');
        }
        if (!db.objectStoreNames.contains('user_context')) {
          db.createObjectStore('user_context');
        }
        if (!db.objectStoreNames.contains('intelligence')) {
          db.createObjectStore('intelligence');
        }
        if (!db.objectStoreNames.contains('anomaly')) {
          db.createObjectStore('anomaly');
        }
        if (!db.objectStoreNames.contains('hotspots')) {
          db.createObjectStore('hotspots');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveCachedWeather(weather: WeatherResponse): Promise<void> {
  try {
    const db = await getDB();
    if (db && weather?.location) {
      const key = `weather_${weather.location.lat.toFixed(2)}_${weather.location.lon.toFixed(2)}`;
      await db.put('weather', weather, key);
      await db.put('weather', weather, 'latest_weather');
    }
  } catch (err) {
    console.warn('IndexedDB write failed:', err);
  }
}

export async function getCachedWeather(lat?: number, lon?: number): Promise<WeatherResponse | null> {
  try {
    const db = await getDB();
    if (!db) return null;
    if (lat !== undefined && lon !== undefined) {
      const key = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
      const hit = await db.get('weather', key);
      if (hit) return hit;
      
      const latest: WeatherResponse | null = (await db.get('weather', 'latest_weather')) || null;
      if (latest && latest.location) {
        const matches = Math.abs(latest.location.lat - lat) < 0.25 && Math.abs(latest.location.lon - lon) < 0.25;
        if (matches) return latest;
      }
      return null;
    }
    return (await db.get('weather', 'latest_weather')) || null;
  } catch (err) {
    console.warn('IndexedDB read failed:', err);
    return null;
  }
}

export async function saveCachedIntelligence(intel: IntelligenceSummary): Promise<void> {
  try {
    const db = await getDB();
    if (db) {
      await db.put('intelligence', intel, 'latest_intelligence');
    }
  } catch (err) {
    console.warn('IndexedDB write failed:', err);
  }
}

export async function getCachedIntelligence(): Promise<IntelligenceSummary | null> {
  try {
    const db = await getDB();
    if (!db) return null;
    return (await db.get('intelligence', 'latest_intelligence')) || null;
  } catch (err) {
    console.warn('IndexedDB read failed:', err);
    return null;
  }
}

export async function saveCachedAnomaly(anomaly: HistoricalAnomalyReport): Promise<void> {
  try {
    const key = `anomaly_${anomaly.location.lat.toFixed(2)}_${anomaly.location.lon.toFixed(2)}`;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`vayusync_anomaly_${key}`, JSON.stringify(anomaly));
        localStorage.setItem('vayusync_anomaly_latest', JSON.stringify(anomaly));
      } catch (e) {
        // quota exceeded or private mode
      }
    }
    const db = await getDB();
    if (db) {
      await db.put('anomaly', anomaly, key);
      await db.put('anomaly', anomaly, 'latest_anomaly');
    }
  } catch (err) {
    console.warn('IndexedDB saveCachedAnomaly failed:', err);
  }
}

export async function getCachedAnomaly(lat?: number, lon?: number): Promise<HistoricalAnomalyReport | null> {
  try {
    const key = lat !== undefined && lon !== undefined 
      ? `anomaly_${lat.toFixed(2)}_${lon.toFixed(2)}` 
      : 'anomaly_latest';
      
    if (typeof window !== 'undefined') {
      const lsHit = localStorage.getItem(`vayusync_anomaly_${key}`) || localStorage.getItem('vayusync_anomaly_latest');
      if (lsHit) {
        try {
          return JSON.parse(lsHit);
        } catch {
          // ignore
        }
      }
    }

    const db = await getDB();
    if (!db) return null;
    if (lat !== undefined && lon !== undefined) {
      const hit = await db.get('anomaly', key);
      if (hit) return hit;
    }
    return (await db.get('anomaly', 'latest_anomaly')) || null;
  } catch (err) {
    console.warn('IndexedDB getCachedAnomaly failed:', err);
    return null;
  }
}

export async function saveCachedHotspots(report: HotspotReport): Promise<void> {
  try {
    const key = `hotspots_${report.location.lat.toFixed(2)}_${report.location.lon.toFixed(2)}`;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`vayusync_hotspots_${key}`, JSON.stringify(report));
        localStorage.setItem('vayusync_hotspots_latest', JSON.stringify(report));
      } catch {
        // ignore quota errors
      }
    }
    const db = await getDB();
    if (db && db.objectStoreNames.contains('hotspots')) {
      await db.put('hotspots', report, key);
      await db.put('hotspots', report, 'latest_hotspots');
    }
  } catch (err) {
    console.warn('IndexedDB saveCachedHotspots failed:', err);
  }
}

export async function getCachedHotspots(lat?: number, lon?: number): Promise<HotspotReport | null> {
  try {
    const key = lat !== undefined && lon !== undefined
      ? `hotspots_${lat.toFixed(2)}_${lon.toFixed(2)}`
      : 'hotspots_latest';

    if (typeof window !== 'undefined') {
      const lsHit = localStorage.getItem(`vayusync_hotspots_${key}`) || localStorage.getItem('vayusync_hotspots_latest');
      if (lsHit) {
        try {
          return JSON.parse(lsHit);
        } catch {
          // ignore
        }
      }
    }

    const db = await getDB();
    if (!db || !db.objectStoreNames.contains('hotspots')) return null;
    if (lat !== undefined && lon !== undefined) {
      const hit = await db.get('hotspots', key);
      if (hit) return hit;
    }
    return (await db.get('hotspots', 'latest_hotspots')) || null;
  } catch (err) {
    console.warn('IndexedDB getCachedHotspots failed:', err);
    return null;
  }
}
