import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "stable-exchange-78gvj",
  appId: "1:517312408573:web:8cf8b70a662b01e2824794",
  apiKey: "AIzaSyCDdxBrBhgcOxPrs9iiS--ckTt55c4vzKg",
  authDomain: "stable-exchange-78gvj.firebaseapp.com",
  storageBucket: "stable-exchange-78gvj.firebasestorage.app",
  messagingSenderId: "517312408573"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Scopes required for complete Google Workspace calendar integration and Gmail Agent
googleProvider.addScope('https://www.googleapis.com/auth/calendar');
googleProvider.addScope('https://www.googleapis.com/auth/tasks');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');

export const db = getFirestore(app);
export { app };
