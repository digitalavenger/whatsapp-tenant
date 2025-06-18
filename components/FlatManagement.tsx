// components/FlatManagement.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/lib/FirebaseContext';
import MessageBox from './MessageBox';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface Property {
  id: string;
  name: string;
}

interface Flat {
  id: string;
  propertyId: string;
  flatNumber: string;
  areaSqFt: number;
  isOccupied: boolean;
  createdAt: any; // Firestore Timestamp
}

const FlatManagement: React.FC = () => {
  const { db, userId, userRole } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const [flats, setFlats] = useState<Flat[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const [newFlatPropertyId, setNewFlatPropertyId] = useState<string>('');
  const [newFlatNumber, setNewFlatNumber] = useState<string>('');
  const [newFlatArea, setNewFlatArea] = useState<number>(0);
  const [newFlatIsOccupied, setNewFlatIsOccupied] = useState<boolean>(false);

  const [editingFlatId, setEditingFlatId] = useState<string | null>(null);
  const [editingFlatPropertyId, setEditingFlatPropertyId] = useState<string>('');
  const [editingFlatNumber, setEditingFlatNumber] = useState<string>('');
  const [editingFlatArea, setEditingFlatArea] = useState<number>(0);
  const [editingFlatIsOccupied, setEditingFlatIsOccupied] = useState<boolean>(false);

  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>(''); // For search
  const [filterPropertyId, setFilterPropertyId] = useState<string>(''); // For filter

  // Fetch properties and flats
  useEffect(() => {
    if (!db || !userId || !['Admin', 'Super Admin'].includes(userRole || '')) return;

    // Fetch properties for dropdown - Using explicit path segments
    const propertiesCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'properties');
    const unsubscribeProperties = onSnapshot(propertiesCollectionRef, (snapshot) => {
      const propertiesData: Property[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setProperties(propertiesData);
      if (propertiesData.length > 0 && !newFlatPropertyId) {
        setNewFlatPropertyId(propertiesData[0].id); // Set default selected property for new flat
      }
    }, (error) => {
      console.error("Error fetching properties for flat management:", error);
      setMessage("Error fetching properties for flat linking.", "error");
    });

    // Fetch flats - Using explicit path segments
    const flatsCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'flats');
    const unsubscribeFlats = onSnapshot(flatsCollectionRef, (snapshot) => {
      const flatsData: Flat[] = snapshot.docs.map(doc => ({
        id: doc.id,
        flatNumber: doc.data().flatNumber,
        propertyId: doc.data().propertyId,
        areaSqFt: doc.data().areaSqFt,
        isOccupied: doc.data().isOccupied,
        createdAt: doc.data().createdAt,
      }));
      setFlats(flatsData);
    }, (error) => {
      console.error("Error fetching flats:", error);
      setMessage("Error fetching flats.", "error");
    });

    return () => {
      unsubscribeProperties();
      unsubscribeFlats();
    };
  }, [db, userId, userRole, appId, newFlatPropertyId]);

  const handleAddFlat = async () => {
    if (!newFlatPropertyId || !newFlatNumber.trim() || newFlatArea <= 0) {
      setMessage("All flat fields are required and area must be positive.", "error");
      return;
    }
    if (!db || !userId) {
      setMessage("Firebase not initialized or user not logged in.", "error");
      return;
    }

    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'flats'), {
        propertyId: newFlatPropertyId,
        flatNumber: newFlatNumber.trim(),
        areaSqFt: newFlatArea,
        isOccupied: newFlatIsOccupied,
        createdAt: new Date(),
      });
      setNewFlatNumber('');
      setNewFlatArea(0);
      setNewFlatIsOccupied(false);
      setNewFlatPropertyId(properties.length > 0 ? properties[0].id : ''); // Reset to first property or empty
      setMessage("Flat added successfully!", "success");
    } catch (error: any) {
      console.error("Error adding flat:", error);
      setMessage(`Failed to add flat: ${error.message}`, "error");
    }
  };

  const handleEditClick = (flat: Flat) => {
    setEditingFlatId(flat.id);
    setEditingFlatPropertyId(flat.propertyId);
    setEditingFlatNumber(flat.flatNumber);
    setEditingFlatArea(flat.areaSqFt);
    setEditingFlatIsOccupied(flat.isOccupied);
  };

  const handleUpdateFlat = async (id: string) => {
    if (!editingFlatPropertyId || !editingFlatNumber.trim() || editingFlatArea <= 0) {
      setMessage("All flat fields are required and area must be positive.", "error");
      return;
    }
    if (!db || !userId) {
      setMessage("Firebase not initialized or user not logged in.", "error");
      return;
    }

    try {
      const flatDocRef = doc(db, 'artifacts', appId, 'users', userId, 'flats', id);
      await updateDoc(flatDocRef, {
        propertyId: editingFlatPropertyId,
        flatNumber: editingFlatNumber.trim(),
        areaSqFt: editingFlatArea,
        isOccupied: editingFlatIsOccupied,
      });
      setEditingFlatId(null);
      setEditingFlatPropertyId('');
      setEditingFlatNumber('');
      setEditingFlatArea(0);
      setEditingFlatIsOccupied(false);
      setMessage("Flat updated successfully!", "success");
    } catch (error: any) {
      console.error("Error updating flat:", error);
      setMessage(`Failed to update flat: ${error.message}`, "error");
    }
  };

  const handleDeleteFlat = async (id: string) => {
    if (!db || !userId) {
      setMessage("Firebase not initialized or user not logged in.", "error");
      return;
    }
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'flats', id));
      setMessage("Flat deleted successfully!", "success");
    } catch (error: any) {
      console.error("Error deleting flat:", error);
      setMessage(`Failed to delete flat: ${error.message}`, "error");
    }
  };

  const getPropertyName = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? property.name : 'Unknown Property';
  };

  const handleCloseMessage = () => {
    setMessage(null);
    setMessageType('');
  };

  // Filtered and searched flats
  const filteredFlats = flats.filter(flat => {
    const matchesSearch = searchQuery.trim() === '' ||
                          flat.flatNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          getPropertyName(flat.propertyId).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterPropertyId === '' || flat.propertyId === filterPropertyId;
    return matchesSearch && matchesFilter;
  });

  if (!['Admin', 'Super Admin'].includes(userRole || '')) {
    return <p className="text-center text-red-500 dark:text-red-400 mt-8">Access Denied: Only Admins can manage flats.</p>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <MessageBox message={message} type={messageType} onClose={handleCloseMessage} />
      <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white border-b-2 border-indigo-400 pb-2">Flat Management</h3>

      {/* Add New Flat Form */}
      <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-inner">
        <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Add New Flat</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="newFlatPropertyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Property</label>
            <select
              id="newFlatPropertyId"
              value={newFlatPropertyId}
              onChange={(e) => { setNewFlatPropertyId(e.target.value); }}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {properties.length === 0 ? (
                <option value="">No properties available</option>
              ) : (
                <>
                  <option value="">Select a property</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="newFlatNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flat Number</label>
            <input
              type="text"
              id="newFlatNumber"
              value={newFlatNumber}
              onChange={(e) => setNewFlatNumber(e.target.value)}
              placeholder="e.g., A-101, F-002"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="newFlatArea" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Area (sq.ft)</label>
            <input
              type="number"
              id="newFlatArea"
              value={newFlatArea}
              onChange={(e) => setNewFlatArea(Number(e.target.value))}
              placeholder="e.g., 1200"
              min="0"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div className="flex items-center mt-4">
          <input
            id="newFlatIsOccupied"
            type="checkbox"
            checked={newFlatIsOccupied}
            onChange={(e) => setNewFlatIsOccupied(e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-indigo-600"
          />
          <label htmlFor="newFlatIsOccupied" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
            Is Occupied
          </label>
        </div>
        <button
          onClick={handleAddFlat}
          className="mt-6 w-full md:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:scale-105"
        >
          Add Flat
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-inner">
        <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Search & Filter Flats</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search by Flat No. or Property</label>
            <input
              type="text"
              id="searchQuery"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., A-101 or Green Valley"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="filterPropertyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Property</label>
            <select
              id="filterPropertyId"
              value={filterPropertyId}
              onChange={(e) => setFilterPropertyId(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">All Properties</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Flat List Table */}
      <div className="mb-8">
        <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Existing Flats ({filteredFlats.length} found)</h4>
        {filteredFlats.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 italic">No flats added yet, or no flats match your search/filter.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Flat Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Property
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Area (sq.ft)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredFlats.map((flat) => (
                  <tr key={flat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150 ease-in-out">
                    {editingFlatId === flat.id ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={editingFlatNumber}
                            onChange={(e) => setEditingFlatNumber(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={editingFlatPropertyId}
                            onChange={(e) => setEditingFlatPropertyId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            {properties.map(property => (
                              <option key={property.id} value={property.id}>
                                {property.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={editingFlatArea}
                            onChange={(e) => setEditingFlatArea(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={editingFlatIsOccupied}
                            onChange={(e) => setEditingFlatIsOccupied(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-indigo-600"
                          />
                          <label className="ml-2 text-sm text-gray-900 dark:text-gray-300">Occupied</label>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleUpdateFlat(flat.id)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-150 ease-in-out text-sm transform hover:scale-105"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingFlatId(null)}
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
                          {flat.flatNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {getPropertyName(flat.propertyId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {flat.areaSqFt}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${flat.isOccupied ? 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200'}`}>
                            {flat.isOccupied ? 'Occupied' : 'Vacant'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(flat)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 ease-in-out text-sm transform hover:scale-105"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteFlat(flat.id)}
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

export default FlatManagement;