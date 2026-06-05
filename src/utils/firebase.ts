import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if firebase is configured
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.authDomain
);

let app;
if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} else {
  console.warn('[Firebase] Firebase is not configured. Cloud synchronization is disabled.');
  app = {} as any;
}

export const auth = isFirebaseConfigured ? getAuth(app) : ({} as any);
export const db = isFirebaseConfigured ? getFirestore(app) : ({} as any);
