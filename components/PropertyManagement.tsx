// components/PropertyManagement.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/lib/FirebaseContext';
import MessageBox from './MessageBox';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface Property {
  id: string;
  name: string;
  address: string;
  createdAt: any; // Firestore Timestamp
}

const PropertyManagement: React.FC = () => {
  const { db, userId, userRole } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const [properties, setProperties] = useState<Property[]>([]);
  const [newPropertyName, setNewPropertyName] = useState<string>('');
  const [newPropertyAddress, setNewPropertyAddress] = useState<string>('');
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [editingPropertyName, setEditingPropertyName] = useState<string>('');
  const [editingPropertyAddress, setEditingPropertyAddress] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');

  // Fetch properties
  useEffect(() => {
    if (!db || !userId || !['Admin', 'Super Admin'].includes(userRole || '')) return;

    const propertiesCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'properties');
    const q = query(propertiesCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const propertiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Property, 'id'>
      }));
      setProperties(propertiesData);
    }, (error) => {
      console.error("Error fetching properties:", error);
      setMessage("Error fetching properties.", "error");
    });

    return () => unsubscribe();
  }, [db, userId, userRole, appId]);

  const handleAddProperty = async () => {
    if (!newPropertyName.trim() || !newPropertyAddress.trim()) {
      setMessage("Property name and address cannot be empty.", "error");
      return;
    }
    if (!db || !userId) {
      setMessage("Firebase not initialized or user not logged in.", "error");
      return;
    }

    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'properties'), {
        name: newPropertyName.trim(),
        address: newPropertyAddress.trim(),
        createdAt: new Date(),
      });
      setNewPropertyName('');
      setNewPropertyAddress('');
      setMessage("Property added successfully!", "success");
    } catch (error: any) {
      console.error("Error adding property:", error);
      setMessage(`Failed to add property: ${error.message}`, "error");
    }
  };

  const handleEditClick = (property: Property) => {
    setEditingPropertyId(property.id);
    setEditingPropertyName(property.name);
    setEditingPropertyAddress(property.address);
  };

  const handleUpdateProperty = async (id: string) => {
    if (!editingPropertyName.trim() || !editingPropertyAddress.trim()) {
      setMessage("Property name and address cannot be empty.", "error");
      return;
    }
    if (!db || !userId) {
      setMessage("Firebase not initialized or user not logged in.", "error");
      return;
    }

    try {
      const propertyDocRef = doc(db, 'artifacts', appId, 'users', userId, 'properties', id);
      await updateDoc(propertyDocRef, {
        name: editingPropertyName.trim(),
        address: editingPropertyAddress.trim(),
      });
      setEditingPropertyId(null);
      setEditingPropertyName('');
      setEditingPropertyAddress('');
      setMessage("Property updated successfully!", "success");
    } catch (error: any) {
      console.error("Error updating property:", error);
      setMessage(`Failed to update property: ${error.message}`, "error");
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!db || !userId) {
      setMessage("Firebase not initialized or user not logged in.", "error");
      return;
    }

    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'properties', id));
      setMessage("Property deleted successfully!", "success");
    } catch (error: any) {
      console.error("Error deleting property:", error);
      setMessage(`Failed to delete property: ${error.message}`, "error");
    }
  };

  const handleCloseMessage = () => {
    setMessage(null);
    setMessageType('');
  };

  if (!['Admin', 'Super Admin'].includes(userRole || '')) {
    return <p className="text-center text-red-500 dark:text-red-400 mt-8">Access Denied: Only Admins can manage properties.</p>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <MessageBox message={message} type={messageType} onClose={handleCloseMessage} />
      <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white border-b-2 border-indigo-400 pb-2">Property Management</h3>

      {/* Add New Property Form */}
      <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-inner">
        <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Add New Property</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="newPropertyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property Name</label>
            <input
              type="text"
              id="newPropertyName"
              value={newPropertyName}
              onChange={(e) => setNewPropertyName(e.target.value)}
              placeholder="e.g., Green Valley Apartments"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="newPropertyAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
            <input
              type="text"
              id="newPropertyAddress"
              value={newPropertyAddress}
              onChange={(e) => setNewPropertyAddress(e.target.value)}
              placeholder="e.g., 123 Main St, City"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <button
          onClick={handleAddProperty}
          className="mt-6 w-full md:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:scale-105"
        >
          Add Property
        </button>
      </div>

      {/* Property List Table */}
      <div className="mb-8">
        <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Existing Properties</h4>
        {properties.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 italic">No properties added yet. Add your first property above!</p>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {properties.map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150 ease-in-out">
                    {editingPropertyId === property.id ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={editingPropertyName}
                            onChange={(e) => setEditingPropertyName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={editingPropertyAddress}
                            onChange={(e) => setEditingPropertyAddress(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleUpdateProperty(property.id)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-150 ease-in-out text-sm transform hover:scale-105"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingPropertyId(null)}
                              className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition duration-150 ease-in-out text-sm transform hover:scale-105"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                          {property.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {property.address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(property)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 ease-in-out text-sm transform hover:scale-105"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProperty(property.id)}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-150 ease-in-out text-sm transform hover:scale-105"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyManagement;