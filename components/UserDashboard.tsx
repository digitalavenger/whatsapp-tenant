// components/UserDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/lib/FirebaseContext';
import MessageBox from './MessageBox';
import { collection, query, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';

interface Property {
  id: string;
  name: string;
  address: string;
}

interface Flat {
  id: string;
  flatNumber: string;
  propertyId: string;
}

interface Tenant {
  id: string;
  name: string;
  contact: string;
  propertyId: string;
  flatId: string;
  maintenanceAmount: number;
  dueDate: string; //YYYY-MM-DD
  isPaid: boolean;
}

const UserDashboard: React.FC = () => {
  const { db, user, userId, userRole, isAuthReady } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const [tenantInfo, setTenantInfo] = useState<Tenant | null>(null);
  const [propertyInfo, setPropertyInfo] = useState<Property | null>(null);
  const [flatInfo, setFlatInfo] = useState<Flat | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');
  const [loadingData, setLoadingData] = useState<boolean>(true);

  useEffect(() => {
    const fetchTenantData = async () => {
      if (!db || !user || !isAuthReady || userRole !== 'User') {
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      try {
        // The UserDashboard primarily reads from the public/data/tenants collection
        // where the tenant's email (user.email) is the document ID.
        if (user.email) {
          const tenantDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'tenants', user.email);

          const unsubscribe = onSnapshot(tenantDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as Tenant;
              setTenantInfo({ id: docSnap.id, ...data });

              // Property and Flat info are directly embedded in the public tenant record
              // or can be looked up if they exist in public collections
              setPropertyInfo({
                id: data.propertyId,
                name: data.propertyName || 'Property Name N/A',
                address: data.propertyAddress || 'Property Address N/A',
              });
              setFlatInfo({
                id: data.flatId,
                flatNumber: data.flatNumber || 'Flat Number N/A',
                propertyId: data.propertyId,
              });

            } else {
              // Mock tenant info if no linked tenant found for this user's email
              setTenantInfo({
                  id: user.uid, // Using user's UID as a mock tenant ID
                  name: user.email || "Dear Resident",
                  contact: user.email || "+91-9876543210", // Mock WhatsApp number, use email if possible
                  propertyId: "mock-property-id", // Will be mapped to mock property
                  flatId: "mock-flat-id", // Will be mapped to mock flat
                  maintenanceAmount: 2500,
                  dueDate: "2025-07-01",
                  isPaid: false,
              });
              setPropertyInfo({
                  id: "mock-property-id",
                  name: "Maple Leaf Residency (Mock)",
                  address: "123 Demo Street, Anytown (Mock)",
              });
              setFlatInfo({
                  id: "mock-flat-id",
                  flatNumber: "A-101 (Mock)",
                  propertyId: "mock-property-id",
              });
              console.log("No specific tenant document found for this user's email in public data. Showing mock info.");
            }
            setLoadingData(false);
          }, (error) => {
            console.error("Error fetching tenant info for user dashboard:", error);
            setMessage("Error loading your tenant information.", "error");
            setLoadingData(false);
          });

          return () => unsubscribe(); // Cleanup snapshot listener
        } else {
          // If user.email is not available, show generic mock data
          setTenantInfo({
            id: user.uid,
            name: "Dear Resident",
            contact: "+91-9876543210",
            propertyId: "mock-property-id",
            flatId: "mock-flat-id",
            maintenanceAmount: 2500,
            dueDate: "2025-07-01",
            isPaid: false,
          });
          setPropertyInfo({
            id: "mock-property-id",
            name: "Maple Leaf Residency (Mock)",
            address: "123 Demo Street, Anytown (Mock)",
          });
          setFlatInfo({
            id: "mock-flat-id",
            flatNumber: "A-101 (Mock)",
            propertyId: "mock-property-id",
          });
          setLoadingData(false);
        }
      } catch (error) {
        console.error("User Dashboard data fetch error:", error);
        setMessage("Failed to load your dashboard data.", "error");
        setLoadingData(false);
      }
    };

    fetchTenantData();

    // No need for separate property/flat collection listeners here if info is in tenant doc
    // and if not, they'd need to be public or accessed via cloud functions.

  }, [db, user, userId, userRole, isAuthReady, appId]);


  const handlePayMaintenance = async () => {
    if (!db || !user || !tenantInfo) { // Use user.email for consistency
      setMessage("Cannot process payment. Please ensure you are logged in and tenant info is available.", "error");
      return;
    }

    // Simulate payment link generation and WhatsApp message
    const paymentLink = `https://example.com/pay?tenantId=${tenantInfo.id}&amount=${tenantInfo.maintenanceAmount}`;
    const whatsappMessage = `Dear ${tenantInfo.name}, your monthly maintenance of ₹${tenantInfo.maintenanceAmount} for Flat ${flatInfo?.flatNumber} at ${propertyInfo?.name} is due on ${tenantInfo.dueDate}. Please pay promptly via this link: ${paymentLink}. Thank you!`;

    setMessage(`WhatsApp message simulated! "${whatsappMessage}" \n\n (In a real app, this would trigger a backend service to send a WhatsApp message and update payment status.)`, "success");

    // Simulate updating payment status in Firestore (only if it was unpaid)
    if (!tenantInfo.isPaid) {
      try {
        // Update the public tenant record - Using explicit path segments
        const tenantDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'tenants', user.email!); // Assert user.email exists
        await updateDoc(tenantDocRef, { isPaid: true });
        setMessage(prev => prev + "\n\n Payment status updated to 'Paid' in database (simulated).", "success");
        setTenantInfo(prev => prev ? { ...prev, isPaid: true } : null); // Update local state
      } catch (error: any) {
        console.error("Error simulating payment update:", error);
        setMessage(prev => prev + `\n\n Failed to update payment status: ${error.message}`, "error");
      }
    }
  };

  const handleCloseMessage = () => {
    setMessage(null);
    setMessageType('');
  };

  if (userRole !== 'User') {
    return <p className="text-center text-red-500 dark:text-red-400 mt-8">Access Denied: Only Users can view this dashboard.</p>;
  }

  if (loadingData) {
    return (
      <div className="min-h-[300px] flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-lg my-8 p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 dark:border-white"></div>
        <p className="ml-4 text-lg text-gray-700 dark:text-gray-300">Loading your tenant information...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-white dark:bg-gray-800 shadow-xl rounded-lg my-8 transform transition-all duration-300 hover:scale-[1.005]">
      <MessageBox message={message} type={messageType} onClose={handleCloseMessage} />
      <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white border-b-4 border-indigo-500 pb-2">Your Tenant Dashboard</h2>

      {tenantInfo ? (
        <div className="space-y-6 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-8 rounded-lg shadow-inner">
          <p className="text-lg"><span className="font-semibold text-indigo-600 dark:text-indigo-400">Tenant Name:</span> {tenantInfo.name}</p>
          <p className="text-lg"><span className="font-semibold text-indigo-600 dark:text-indigo-400">Contact:</span> {tenantInfo.contact}</p>
          {propertyInfo && (
            <>
              <p className="text-lg"><span className="font-semibold text-indigo-600 dark:text-indigo-400">Property:</span> {propertyInfo.name}</p>
              <p className="text-lg"><span className="font-semibold text-indigo-600 dark:text-indigo-400">Address:</span> {propertyInfo.address}</p>
            </>
          )}
          {flatInfo && (
            <p className="text-lg"><span className="font-semibold text-indigo-600 dark:text-indigo-400">Flat Number:</span> {flatInfo.flatNumber}</p>
          )}

          <div className="mt-6 p-4 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm">
            <p className="text-xl font-bold text-gray-900 dark:text-white">Monthly Maintenance Bill</p>
            <p className="text-2xl font-extrabold text-green-700 dark:text-green-400 mt-2">₹{tenantInfo.maintenanceAmount}</p>
            <p className="text-lg text-gray-700 dark:text-gray-300">Due Date: {tenantInfo.dueDate}</p>
            <p className={`text-xl font-bold mt-2 ${tenantInfo.isPaid ? 'text-green-600' : 'text-red-600'}`}>
              Status: {tenantInfo.isPaid ? 'PAID' : 'UNPAID'}
            </p>
          </div>

          {!tenantInfo.isPaid && (
            <button
              onClick={handlePayMaintenance}
              className="mt-8 w-full px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.047 2c-6.627 0-12 5.373-12 12s5.373 12 12 12c6.627 0 12-5.373 12-12s-5.373-12-12-12zm.547 3.518c2.148 0 4.145.864 5.602 2.399l-2.072 2.064c-1.077-.978-2.584-1.503-4.077-1.503-2.912 0-5.286 2.373-5.286 5.286s2.373 5.286 5.286 5.286c2.584 0 4.417-1.503 5.385-2.61l2.062 2.063c-1.488 1.489-3.485 2.275-5.447 2.275-6.627 0-12-5.373-12-12s5.373-12 12-12zm-3.085 4.542l-2.222 2.222c-.672.672-1.008 1.554-1.008 2.436s.336 1.764 1.008 2.436c.672.672 1.554 1.008 2.436 1.008s1.764-.336 2.436-1.008l2.222-2.222zm4.848.441l-2.222 2.222c-.672.672-1.008 1.554-1.008 2.436s.336 1.764 1.008 2.436c.672.672 1.554 1.008 2.436 1.008s1.764-.336 2.436-1.008l2.222-2.222z"/><path d="M12.518 10.085c-1.859 0-3.359 1.5-3.359 3.359s1.5 3.359 3.359 3.359 3.359-1.5 3.359-3.359-1.5-3.359-3.359-3.359z"/></svg>
              Pay Maintenance via WhatsApp
            </button>
          )}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400 italic text-center py-8">
          No tenant information found for your account. Please contact your property administrator.
        </p>
      )}
    </div>
  );
};

export default UserDashboard;