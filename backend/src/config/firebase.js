import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_PROJECT_ID;

let initialized = false;
if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) {
    try {
      initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
      initialized = true;
    } catch (err) {
      console.error('Error inicializando Firebase Admin:', err);
    }
  } else if (projectId) {
    initializeApp({ projectId });
    initialized = true;
  }
}

/** null si el backend no tiene credenciales de Firebase configuradas. */
export const authAdmin = initialized ? getAuth() : null;