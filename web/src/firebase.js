import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Config web pública de Firebase (pulgasya-55df4). El apiKey web de Firebase
// es público (viaja en el bundle). Las variables VITE_FIREBASE_* tienen prioridad
// para permitir otros entornos.
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyCWjpUjG3mTSpEXHMQO1FrVMU_Fw_KBYlY',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    'pulgasya-55df4.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pulgasya-55df4',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    'pulgasya-55df4.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '23193377752',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    '1:23193377752:web:04493fb7eb3ed6ef5e70ad',
};

const hasConfig = Object.values(firebaseConfig).every(Boolean);

let auth = null;
let googleProvider = null;
if (hasConfig) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
}

export { auth, googleProvider, signInWithPopup, hasConfig };