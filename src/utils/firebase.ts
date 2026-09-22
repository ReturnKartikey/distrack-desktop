import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD4mACTCaXurvNsqOwRv38OEmUbjp8pbX8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'distrack-8638a.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'distrack-8638a',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'distrack-8638a.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '617124199982',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:617124199982:web:75dafba1be40d9dca329bf',
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
