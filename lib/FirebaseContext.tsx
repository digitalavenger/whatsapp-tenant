// lib/FirebaseContext.tsx
'use client'; // This directive marks the component as a Client Component

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Auth, onAuthStateChanged, signInWithCustomToken, signInAnonymously, User } from 'firebase/auth';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig'; // Import initialized Firebase services

interface FirebaseContextType {
  auth: Auth | null;
  db: Firestore | null;
  user: User | null;
  userId: string | null;
  userRole: string | null;
  isAuthReady: boolean;
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  // Move appId declaration here, before useEffect
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  useEffect(() => {
    const signInAndListen = async () => {
      try {
        // Attempt to sign in with custom token if available (for Codespaces environment)
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (initialAuthToken && auth) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else if (auth) {
          await signInAnonymously(auth); // Sign in anonymously if no custom token
        }
      } catch (error) {
        console.error("Firebase initial authentication error:", error);
      } finally {
        setIsAuthReady(true);
      }
    };

    signInAndListen();

    // Listen for Firebase Auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setCurrentUserId(user.uid);
        console.log("Logged in user ID:", user.uid); // Log user ID for multi-user apps

        // Fetch user role from Firestore
        const userProfileRef = doc(db, `artifacts/${appId}/users/${user.uid}/userProfile/profile`);
        try {
          const docSnap = await getDoc(userProfileRef);
          if (docSnap.exists()) {
            setCurrentUserRole(docSnap.data().role);
          } else {
            // If user profile doesn't exist, assign a default 'User' role
            // This happens for new sign-ups or if an admin hasn't set a role yet.
            await setDoc(userProfileRef, { role: 'User' });
            setCurrentUserRole('User');
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setCurrentUserRole('User'); // Default to 'User' on error
        }
      } else {
        setCurrentUser(null);
        setCurrentUserId(null);
        setCurrentUserRole(null);
      }
      setLoading(false); // Auth state listener has completed its initial check
    });

    return () => {
      unsubscribeAuth();
    };
  }, [appId, auth, db]); // Added auth and db as dependencies for correctness, though they are usually stable

  return (
    <FirebaseContext.Provider
      value={{
        auth,
        db,
        user: currentUser,
        userId: currentUserId,
        userRole: currentUserRole,
        isAuthReady,
        loading,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};