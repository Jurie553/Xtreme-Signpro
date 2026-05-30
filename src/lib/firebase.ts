import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, getFirestore } from 'firebase/firestore';

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || '',
  firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || undefined,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

if (!isFirebaseConfigured) {
  console.warn('Firebase is not fully configured. Add the VITE_FIREBASE_* values from .env.example.');
}

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with experimentalForceLongPolling for better connectivity in restricted environments
// If databaseId is provided in config, use it.
export const db = firebaseConfig.firestoreDatabaseId 
  ? initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId)
  : initializeFirestore(app, { experimentalForceLongPolling: true });

export const auth = getAuth(app);

// CRITICAL CONSTRAINT: Validate Connection to Firestore on boot
async function testConnection() {
  if (!isFirebaseConfigured) return;
  try {
    console.log("Starting Firestore connection test for database:", firebaseConfig.firestoreDatabaseId || '(default)');
    
    // Attempt to fetch a document from a known collection or the test path
    const testDoc = doc(db, '_connection_test_', 'check');
    await getDocFromServer(testDoc);
    
    console.log("Firestore connection test: Service responded.");
  } catch (error: any) {
    console.warn("Firestore connection test encountered an error (this may be expected if doc doesn't exist):", error.message);
    
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.error("CRITICAL: Firebase Connection Error - The client is offline or service is unavailable.");
    }
  }
}

testConnection();
