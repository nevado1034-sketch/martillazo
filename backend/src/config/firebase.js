import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_PROJECT_ID;

if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) {
    try {
      initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
    } catch (err) {
      console.error('Error inicializando Firebase Admin:', err);
      initializeApp({ projectId });
    }
  } else {
    initializeApp({ projectId });
  }
}

export const authAdmin = getAuth();