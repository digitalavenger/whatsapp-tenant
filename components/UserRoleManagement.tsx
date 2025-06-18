// components/UserRoleManagement.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/lib/FirebaseContext';
import MessageBox from './MessageBox';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';

interface UserProfile {
  id: string;
  role: string;
  email?: string; // Assuming we might store user email in public profile for display
}

const UserRoleManagement: React.FC = () => {
  const { userId, userRole, db } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [targetUserRole, setTargetUserRole] = useState<string>('User');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!db || !userId || userRole !== 'Super Admin') return;

    // Fetch all user profiles for Super Admin to manage roles
    const publicUsersCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'userProfiles');
    const unsubscribe = onSnapshot(publicUsersCollectionRef, (snapshot) => {
      const usersData: UserProfile[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as { role: string; email?: string }
      }));
      setUsers(usersData);
    }, (error) => {
      console.error("Error fetching users for role management:", error);
      setMessage("Error fetching user list for role management.", "error");
    });

    return () => unsubscribe();
  }, [db, userId, userRole, appId]);


  const handleSetUserRole = async () => {
    if (!targetUserId || !targetUserRole) {
      setMessage("User ID and Role are required.", "error");
      return;
    }
    if (!db || !userId) {
      setMessage("Firebase not initialized or user not logged in.", "error");
      return;
    }

    try {
      const userProfileDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'userProfiles', targetUserId);
      await setDoc(userProfileDocRef, { role: targetUserRole }, { merge: true });

      setMessage(`Role for user ${targetUserId} set to ${targetUserRole} successfully!`, "success");
      setTargetUserId('');
    } catch (error: any) {
      console.error("Error setting user role:", error);
      setMessage(`Failed to set role: ${error.message}`, "error");
    }
  };

  const handleCloseMessage = () => {
    setMessage(null);
    setMessageType('');
  };

  if (userRole !== 'Super Admin') {
    return <p className="text-center text-red-500 dark:text-red-400 mt-8">Access Denied: Only Super Admins can manage user roles.</p>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <MessageBox message={message} type={messageType} onClose={handleCloseMessage} />
      <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white border-b-2 border-indigo-400 pb-2">Manage User Roles</h3>

      <p className="text-base text-gray-700 dark:text-gray-300 mb-6">
        Enter the Firebase User ID (UID) of the user whose role you want to change.
        You can find user UIDs in Firebase Authentication console, or they are logged in the console when users sign in.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="targetUserId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target User ID (UID)</label>
          <input
            type="text"
            id="targetUserId"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="e.g., abcdefg12345..."
            className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition duration-150 ease-in-out"
          />
        </div>
        <div>
          <label htmlFor="targetUserRole" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Set Role</label>
          <select
            id="targetUserRole"
            value={targetUserRole}
            onChange={(e) => setTargetUserRole(e.target.value)}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition duration-150 ease-in-out"
          >
            <option value="User">User</option>
            <option value="Admin">Admin</option>
            <option value="Super Admin">Super Admin</option>
          </select>
        </div>
      </div>
      <button
        onClick={handleSetUserRole}
        className="mt-6 w-full md:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:scale-105"
      >
        Set User Role
      </button>

      {/* List of Users for Super Admin to see UIDs */}
      <div className="mt-10 pt-6 border-t border-gray-300 dark:border-gray-600">
        <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Registered Users & Roles (for debugging)</h4>
        <ul className="space-y-3 text-gray-800 dark:text-gray-200 text-base">
            {users.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No registered users found in public profile data. Sign up a few users first!</p>
            ) : (
                users.map(u => (
                    <li key={u.id} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md shadow-sm flex flex-col md:flex-row md:justify-between md:items-center break-all">
                        <div>
                            <strong className="text-indigo-700 dark:text-indigo-300">UID:</strong> <span className="font-mono">{u.id}</span>
                        </div>
                        <div className="mt-1 md:mt-0">
                            <strong className="text-indigo-700 dark:text-indigo-300">Role:</strong> <span className="font-semibold">{u.role || 'Not Set (Default User)'}</span>
                        </div>
                    </li>
                ))
            )}
        </ul>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Note: User roles are stored in `artifacts/${appId}/public/data/userProfiles/{'UID'}`.
            New sign-ups default to a 'User' role in `artifacts/${appId}/users/{'UID'}/userProfile/profile`.
        </p>
      </div>
    </div>
  );
};

export default UserRoleManagement;