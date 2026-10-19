/**
 * Firebase, initialised lazily and defensively.
 *
 * Nothing here runs until a caller asks for it, and every failure mode returns
 * null instead of throwing: missing env vars, a blocked network, private
 * browsing without IndexedDB. The data layer treats null as "use the fallback"
 * so the public site keeps rendering no matter what Firebase is doing.
 */
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  appId: process.env.FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let instance = null;
let failed = false;

export function getFirebase() {
  if (!isFirebaseConfigured || failed || typeof window === 'undefined') return null;
  if (instance) return instance;

  try {
    const app = getApps()[0] || initializeApp(firebaseConfig);
    let db;
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch {
      // Already initialised (fast refresh) or IndexedDB unavailable.
      db = getFirestore(app);
    }
    instance = { app, db, auth: getAuth(app) };
    return instance;
  } catch (err) {
    failed = true;
    console.warn('[firebase] initialisation failed, running on fallback data:', err?.message);
    return null;
  }
}

// Who may edit is decided in lib/access.js (super admin + admins/{email} documents).
