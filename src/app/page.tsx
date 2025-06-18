// app/page.tsx
'use client';

import React from 'react';
import { useFirebase } from '@/lib/FirebaseContext'; // Correct import path
import Auth from '@/components/Auth'; // Correct import path
import AdminDashboard from '@/components/AdminDashboard'; // Will create this next
import UserDashboard from '@/components/UserDashboard'; // Will create this next
import { signOut } from 'firebase/auth'; // Import signOut for the logout button

const HomePage: React.FC = () => {
  const { user, userRole, loading, isAuthReady, auth } = useFirebase();

  const handleSignOut = async () => {
    if (auth) {
      try {
        await signOut(auth);
        console.log("User signed out.");
      } catch (error) {
        console.error("Error signing out:", error);
      }
    }
  };

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-inter text-gray-900 dark:text-white">
      {user ? (
        <>
          <nav className="bg-indigo-700 dark:bg-indigo-900 p-4 shadow-lg">
            <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
              <h1 className="text-white text-3xl font-bold mb-2 md:mb-0">WhatsApp Tenant Manager</h1>
              <div className="flex items-center space-x-4">
                <span className="text-white text-lg font-medium">Hello, {user.email || 'Guest'}! ({userRole})</span>
                <button
                  onClick={handleSignOut}
                  className="px-5 py-2 bg-white text-indigo-700 font-semibold rounded-full shadow-md hover:bg-gray-100 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </nav>
          <main className="p-4">
            {userRole === 'User' && <UserDashboard />}
            {(userRole === 'Admin' || userRole === 'Super Admin') && <AdminDashboard />}
          </main>
        </>
      ) : (
        <Auth />
      )}
    </div>
  );
};

export default HomePage;