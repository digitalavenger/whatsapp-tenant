import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
 const firebaseConfig = {
    apiKey: "AIzaSyBrb2C3CdBd-X-JlplwXRzaCyT8WqS9db4",
    authDomain: "whatsapp-tenant-94c3c.firebaseapp.com",
    projectId: "whatsapp-tenant-94c3c",
    storageBucket: "whatsapp-tenant-94c3c.firebasestorage.app",
    messagingSenderId: "450684023168",
    appId: "1:450684023168:web:06ccf808753177b36dd165",
    measurementId: "G-SP5WHZ4VHH"
  };

// Initialize Firebase
// Check if Firebase app is already initialized to prevent re-initialization in Next.js development mode
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };