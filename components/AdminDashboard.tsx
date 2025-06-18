// components/AdminDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/lib/FirebaseContext';
import MessageBox from './MessageBox';
import PropertyManagement from './PropertyManagement';
import FlatManagement from './FlatManagement';
import TenantManagement from './TenantManagement';
import UserRoleManagement from './UserRoleManagement';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface SummaryData {
  totalProperties: number;
  totalFlats: number;
  occupiedFlats: number;
  totalTenants: number;
  unpaidBills: number;
  totalUsers: number;
}

const AdminDashboard: React.FC = () => {
  const { userId, userRole, db } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const [activeMenuItem, setActiveMenuItem] = useState<'overview' | 'properties' | 'flats' | 'tenants' | 'roles'>('overview');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');
  const [summary, setSummary] = useState<SummaryData>({
    totalProperties: 0,
    totalFlats: 0,
    occupiedFlats: 0,
    totalTenants: 0,
    unpaidBills: 0,
    totalUsers: 0,
  });

  // Fetch summary data
  useEffect(() => {
    if (!db || !userId || !['Admin', 'Super Admin'].includes(userRole || '')) return;

    const unsubscribeProperties = onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'properties'), (snapshot) => {
      setSummary(prev => ({ ...prev, totalProperties: snapshot.size }));
    });

    const unsubscribeFlats = onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'flats'), (snapshot) => {
      const flatsData = snapshot.docs.map(doc => doc.data());
      const occupied = flatsData.filter(flat => flat.isOccupied).length;
      setSummary(prev => ({ ...prev, totalFlats: snapshot.size, occupiedFlats: occupied }));
    });

    const unsubscribeTenants = onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'tenants'), (snapshot) => {
      const tenantsData = snapshot.docs.map(doc => doc.data());
      const unpaid = tenantsData.filter(tenant => !tenant.isPaid).length;
      setSummary(prev => ({ ...prev, totalTenants: snapshot.size, unpaidBills: unpaid }));
    });

    // For total users, listen to the public userProfiles collection
    const unsubscribeUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'userProfiles'), (snapshot) => {
      setSummary(prev => ({ ...prev, totalUsers: snapshot.size }));
    });

    return () => {
      unsubscribeProperties();
      unsubscribeFlats();
      unsubscribeTenants();
      unsubscribeUsers();
    };
  }, [db, userId, userRole, appId]);

  const handleCloseMessage = () => {
    setMessage(null);
    setMessageType('');
  };

  if (!['Admin', 'Super Admin'].includes(userRole || '')) {
    return <p className="text-center text-red-500 dark:text-red-400 mt-8">Access Denied: Only Admins or Super Admins can view this dashboard.</p>;
  }

  // Render content based on active menu item
  const renderContent = () => {
    switch (activeMenuItem) {
      case 'overview':
        return (
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-inner text-gray-900 dark:text-white">
            <h3 className="text-2xl font-bold mb-4">Dashboard Overview</h3>
            <p>Welcome to your property management dashboard! Here you can get a quick glance at your key metrics and navigate to manage specific areas of your properties, flats, and tenants.</p>
            <ul className="mt-4 space-y-2 text-lg">
                <li><span className="font-semibold text-blue-600 dark:text-blue-400">Properties:</span> Manage all your residential or commercial properties.</li>
                <li><span className="font-semibold text-green-600 dark:text-green-400">Flats:</span> Oversee individual units within your properties, track their occupancy status.</li>
                <li><span className="font-semibold text-yellow-600 dark:text-yellow-400">Tenants:</span> Keep track of tenant details, maintenance bills, payment statuses, and send reminders.</li>
                <li><span className="font-semibold text-purple-600 dark:text-purple-400">User Roles:</span> (Super Admin Only) Manage who has Admin access to this dashboard.</li>
            </ul>
          </div>
        );
      case 'properties':
        return <PropertyManagement />;
      case 'flats':
        return <FlatManagement />;
      case 'tenants':
        return <TenantManagement />;
      case 'roles':
        return userRole === 'Super Admin' ? <UserRoleManagement /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <MessageBox message={message} type={messageType} onClose={handleCloseMessage} />

      {/* Sidebar */}
      <aside className="w-64 bg-indigo-700 dark:bg-indigo-900 text-white shadow-xl flex flex-col pt-6">
        <div className="px-6 mb-8">
          <h1 className="text-3xl font-extrabold text-white">Admin Panel</h1>
          <p className="text-indigo-200 dark:text-indigo-400 text-sm mt-1">Hello, {userRole}!</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'overview', label: 'Dashboard Overview' },
            { id: 'properties', label: 'Properties' },
            { id: 'flats', label: 'Flats' },
            { id: 'tenants', label: 'Tenants' },
            ...(userRole === 'Super Admin' ? [{ id: 'roles', label: 'User Roles' }] : []),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenuItem(item.id as any)} // Type assertion for simplicity
              className={`
                w-full flex items-center px-4 py-2 rounded-lg font-medium text-lg
                ${activeMenuItem === item.id
                  ? 'bg-indigo-900 dark:bg-indigo-700 text-white shadow-lg'
                  : 'text-indigo-100 hover:bg-indigo-600 dark:hover:bg-indigo-800 hover:text-white'
                }
                transition duration-200 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-300
              `}
            >
              {/* Icon placeholders - You can add actual icons here (e.g., Lucide React, Font Awesome) */}
              <span className="mr-3">
                {item.id === 'overview' && '📊'}
                {item.id === 'properties' && '🏢'}
                {item.id === 'flats' && '🏡'}
                {item.id === 'tenants' && '👥'}
                {item.id === 'roles' && '🔑'}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 text-center text-sm text-indigo-200">
            <p className="break-all">UID: {userId}</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Summary Cards - these remain at the top for quick overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <div className="bg-blue-100 dark:bg-blue-900 p-5 rounded-lg shadow-md flex flex-col items-center justify-center text-center transform transition-transform duration-200 hover:scale-105">
            <p className="text-blue-800 dark:text-blue-200 text-sm font-semibold">Total Properties</p>
            <p className="text-blue-900 dark:text-blue-100 text-4xl font-bold mt-2">{summary.totalProperties}</p>
          </div>
          <div className="bg-green-100 dark:bg-green-900 p-5 rounded-lg shadow-md flex flex-col items-center justify-center text-center transform transition-transform duration-200 hover:scale-105">
            <p className="text-green-800 dark:text-green-200 text-sm font-semibold">Total Flats</p>
            <p className="text-green-900 dark:text-green-100 text-4xl font-bold mt-2">{summary.totalFlats}</p>
          </div>
          <div className="bg-purple-100 dark:bg-purple-900 p-5 rounded-lg shadow-md flex flex-col items-center justify-center text-center transform transition-transform duration-200 hover:scale-105">
            <p className="text-purple-800 dark:text-purple-200 text-sm font-semibold">Occupied Flats</p>
            <p className="text-purple-900 dark:text-purple-100 text-4xl font-bold mt-2">{summary.occupiedFlats}</p>
          </div>
          <div className="bg-yellow-100 dark:bg-yellow-900 p-5 rounded-lg shadow-md flex flex-col items-center justify-center text-center transform transition-transform duration-200 hover:scale-105">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm font-semibold">Total Tenants</p>
            <p className="text-yellow-900 dark:text-yellow-100 text-4xl font-bold mt-2">{summary.totalTenants}</p>
          </div>
          <div className="bg-red-100 dark:bg-red-900 p-5 rounded-lg shadow-md flex flex-col items-center justify-center text-center transform transition-transform duration-200 hover:scale-105">
            <p className="text-red-800 dark:text-red-200 text-sm font-semibold">Unpaid Bills</p>
            <p className="text-red-900 dark:text-red-100 text-4xl font-bold mt-2">{summary.unpaidBills}</p>
          </div>
           <div className="bg-teal-100 dark:bg-teal-900 p-5 rounded-lg shadow-md flex flex-col items-center justify-center text-center transform transition-transform duration-200 hover:scale-105">
            <p className="text-teal-800 dark:text-teal-200 text-sm font-semibold">Total Users</p>
            <p className="text-teal-900 dark:text-teal-100 text-4xl font-bold mt-2">{summary.totalUsers}</p>
          </div>
        </div>

        {/* Render Active Content */}
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;