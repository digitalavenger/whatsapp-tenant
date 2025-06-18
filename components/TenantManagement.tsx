// components/TenantManagement.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/lib/FirebaseContext';
import MessageBox from './MessageBox';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDoc, setDoc } from 'firebase/firestore'; // Added setDoc

interface Property {
  id: string;
  name: string;
  address: string; // Added address for tenant view
}

interface Flat {
  id: string;
  flatNumber: string;
  propertyId: string;
}

interface Tenant {
  id: string;
  name: string;
  contact: string; // WhatsApp number (will also serve as email for linking to Firebase Auth user)
  propertyId: string;
  propertyName?: string; // Added for public record convenience
  propertyAddress?: string; // Added for public record convenience
  flatId: string;
  flatNumber?: string; // Added for public record convenience
  maintenanceAmount: number;
  dueDate: string; //YYYY-MM-DD
  isPaid: boolean;
  createdAt: any; // Firestore Timestamp
}

const TenantManagement: React.FC = () => {
  const { db, userId, userRole } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [newTenantName, setNewTenantName] = useState<string>('');
  const [newTenantContact, setNewTenantContact] = useState<string>('');
  const [newTenantPropertyId, setNewTenantPropertyId] = useState<string>('');
  const [newTenantFlatId, setNewTenantFlatId] = useState<string>('');
  const [newMaintenanceAmount, setNewMaintenanceAmount] = useState<number>(0);
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editingTenantName, setEditingTenantName] = useState<string>('');
  const [editingTenantContact, setEditingTenantContact] = useState<string>('');
  const [editingTenantPropertyId, setEditingTenantPropertyId] = useState<string>('');
  const [editingTenantFlatId, setEditingTenantFlatId] = useState<string>('');
  const [editingMaintenanceAmount, setEditingMaintenanceAmount] = useState<number>(0);
  const [editingDueDate, setEditingDueDate] = useState<string>('');
  const [editingIsPaid, setEditingIsPaid] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>(''); // For search
  const [filterPropertyId, setFilterPropertyId] = useState<string>(''); // For property filter
  const [filterFlatId, setFilterFlatId] = useState<string>(''); // For flat filter
  const [filterPaidStatus, setFilterPaidStatus] = useState<string>('all'); // 'all', 'paid', 'unpaid'

  // Helper to get formatted date string for today/next month
  const getFormattedDate = (date: Date) => date.toISOString().split('T')[0];

  // Initializing newDueDate to current date + 1 month
  useEffect(() => {
    const today = new Date();
    today.setMonth(today.getMonth() + 1); // Set to next month
    setNewDueDate(getFormattedDate(today));
  }, []);

  // Fetch properties, flats, and tenants
  useEffect(() => {
    if (!db || !userId || !['Admin', 'Super Admin'].includes(userRole || '')) return;

    // Fetch properties for dropdown - Using explicit path segments
    const propertiesCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'properties');
    const unsubscribeProperties = onSnapshot(propertiesCollectionRef, (snapshot) => {
      const propertiesData: Property[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        address: doc.data().address, // Include address
      }));
      setProperties(propertiesData);
      if (propertiesData.length > 0 && !newTenantPropertyId) {
        setNewTenantPropertyId(propertiesData[0].id);
      }
    }, (error) => {
      console.error("Error fetching properties for tenant management:", error);
      setMessage("Error fetching properties for tenant linking.", "error");
    });

    // Fetch flats for dropdown - Using explicit path segments
    const flatsCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'flats');
    const unsubscribeFlats = onSnapshot(flatsCollectionRef, (snapshot) => {
      const flatsData: Flat[] = snapshot.docs.map(doc => ({
        id: doc.id,
        flatNumber: doc.data().flatNumber,
        propertyId: doc.data().propertyId,
      }));
      setFlats(flatsData);
      if (flatsData.length > 0 && !newTenantFlatId) {
        setNewTenantFlatId(flatsData[0].id);
      }
    }, (error) => {
      console.error("Error fetching flats for tenant management:", error);
      setMessage("Error fetching flats for tenant linking.", "error");
    });

    // Fetch tenants from Admin's private collection - Using explicit path segments
    const tenantsCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'tenants');
    const unsubscribeTenants = onSnapshot(tenantsCollectionRef, (snapshot) => {
      const tenantsData: Tenant[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Tenant, 'id'>
      }));
      setTenants(tenantsData);
    }, (error) => {
      console.error("Error fetching tenants:", error);
      setMessage("Error fetching tenants.", "error");
    });

    return () => {
      unsubscribeProperties();
      unsubscribeFlats();
      unsubscribeTenants();
    };
  }, [db, userId, userRole, appId, newTenantPropertyId, newTenantFlatId]);

  const handleAddTenant = async () => {
    if (!newTenantName.trim() || !newTenantContact.trim() || !newTenantPropertyId || !newTenantFlatId || newMaintenanceAmount <= 0 || !newDueDate) {
      setMessage("All tenant fields are required.", "error");
      return;
    }
    if (!db || !userId) {
      setMessage("Firebase not initialized or user not logged in.", "error");
      return;
    }

    try {
      // 1. Add tenant to Admin's private collection
      const newTenantDocRef = await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'tenants'), {
        name: newTenantName.trim(),
        contact: newTenantContact.trim(),
        propertyId: newTenantPropertyId,
        flatId: newTenantFlatId,
        maintenanceAmount: newMaintenanceAmount,
        dueDate: newDueDate,
        isPaid: false, // Default to unpaid
        createdAt: new Date(),
      });

      // 2. Also create/update a public record for the tenant
      const property = properties.find(p => p.id === newTenantPropertyId);
      const flat = flats.find(f => f.id === newTenantFlatId);

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tenants', newTenantContact.trim()), {
        tenantId: newTenantDocRef.id,
        name: newTenantName.trim(),
        contact: newTenantContact.trim(),
        propertyId: newTenantPropertyId,
        propertyName: property ? property.name : 'N/A',
        propertyAddress: property ? property.address : 'N/A',
        flatId: newTenantFlatId,
        flatNumber: flat ? flat.flatNumber : 'N/A',
        maintenanceAmount: newMaintenanceAmount,
        dueDate: newDueDate,
        isPaid: false,
        lastUpdated: new Date(),
      }, { merge: true });

      setNewTenantName('');
      setNewTenantContact('');
      setNewTenantPropertyId(properties.length > 0 ? properties[0].id : '');
      setNewTenantFlatId(flats.length > 0 ? flats[0].id : '');
      setNewMaintenanceAmount(0);
      setNewDueDate(getFormattedDate(new Date())); // Reset due date to next month
      setMessage("Tenant added successfully and public record created!", "success");
    } catch (error: any) {
      console.error("Error adding tenant:", error);
      setMessage(`Failed to add tenant: ${error.message}`, "error");
    }
  };

  const handleEditClick = (tenant: Tenant) => {
    setEditingTenantId(tenant.id);
    setEditingTenantName(tenant.name);
    setEditingTenantContact(tenant.contact);
    setEditingTenantPropertyId(tenant.propertyId);
    setEditingTenantFlatId(tenant.flatId);
    setEditingMaintenanceAmount(tenant.maintenanceAmount);
    setEditingDueDate(tenant.dueDate);
    setEditingIsPaid(tenant.isPaid);
  };

  const handleUpdateTenant = async (id: string) => {
    if (!editingTenantName.trim() || !editingTenantContact.trim() || !editingTenantPropertyId || !editingTenantFlatId || editingMaintenanceAmount <= 0 || !editingDueDate) {
      setMessage("All tenant fields are required.", "error");
      return;
    }
    if (!db || !userId) {
      setMessage("Firebase not initialized or user not logged in.", "error");
      return;
    }

    try {
      // 1. Update tenant in Admin's private collection
      const tenantDocRef = doc(db, 'artifacts', appId, 'users', userId, 'tenants', id);
      await updateDoc(tenantDocRef, {
        name: editingTenantName.trim(),
        contact: editingTenantContact.trim(),
        propertyId: editingTenantPropertyId,
        flatId: editingTenantFlatId,
        maintenanceAmount: editingMaintenanceAmount,
        dueDate: editingDueDate,
        isPaid: editingIsPaid,
      });

      // 2. Also update the public record for the tenant
      const property = properties.find(p => p.id === editingTenantPropertyId);
      const flat = flats.find(f => f.id === editingTenantFlatId);

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tenants', editingTenantContact.trim()), {
        tenantId: id,
        name: editingTenantName.trim(),
        contact: editingTenantContact.trim(),
        propertyId: editingTenantPropertyId,
        propertyName: property ? property.name : 'N/A',
        propertyAddress: property ? property.address : 'N/A',
        flatId: editingTenantFlatId,
        flatNumber: flat ? flat.flatNumber : 'N/A',
        maintenanceAmount: editingMaintenanceAmount,
        dueDate: editingDueDate,
        isPaid: editingIsPaid,
        lastUpdated: new Date(),
      }, { merge: true });

      setEditingTenantId(null);
      setEditingTenantName('');
      setEditingTenantContact('');
      setEditingTenantPropertyId('');
      setEditingTenantFlatId('');
      setEditingMaintenanceAmount(0);
      setEditingDueDate('');
      setEditingIsPaid(false);
      setMessage("Tenant updated successfully and public record updated!", "success");
    } catch (error: any) {
      console.error("Error updating tenant:", error);
      setMessage(`Failed to update tenant: ${error.message}`, "error");
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!db || !userId) {
      setMessage("Firebase not initialized or user not logged in.", "error");
      return;
    }
    try {
      const tenantToDeleteSnap = await getDoc(doc(db, 'artifacts', appId, 'users', userId, 'tenants', id));
      const tenantContact = tenantToDeleteSnap.exists() ? tenantToDeleteSnap.data()?.contact : null;

      // 1. Delete tenant from Admin's private collection
      await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'tenants', id));

      // 2. Also delete the public record if contact exists
      if (tenantContact) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tenants', tenantContact));
      }

      setMessage("Tenant deleted successfully and public record removed!", "success");
    } catch (error: any) {
      console.error("Error deleting tenant:", error);
      setMessage(`Failed to delete tenant: ${error.message}`, "error");
    }
  };

  const handleSendWhatsAppMessage = (tenant: Tenant) => {
    const propertyName = getPropertyName(tenant.propertyId);
    const flatNumber = getFlatNumber(tenant.flatId);
    const paymentLink = "https://example.com/pay"; // Placeholder link
    setMessage(`Simulated WhatsApp message sent to <span class="math-inline">\{tenant\.name\} \(</span>{tenant.contact}): "Dear <span class="math-inline">\{tenant\.name\}, your monthly maintenance of ₹</span>{tenant.maintenanceAmount} for Flat ${flatNumber} in ${propertyName} is due on ${tenant.dueDate}. Please pay promptly via ${paymentLink}."`, "success");
  };

  const getPropertyName = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? property.name : 'N/A';
  };

  const getFlatNumber = (flatId: string) => {
    const flat = flats.find(f => f.id === flatId);
    return flat ? flat.flatNumber : 'N/A';
  };

  const handleCloseMessage = () => {
    setMessage(null);
    setMessageType('');
  };

  // Filtered and searched tenants
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = searchQuery.trim() === '' ||
                          tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tenant.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          getPropertyName(tenant.propertyId).toLowerCase().includes(searchQuery.toLowerCase()) ||
                          getFlatNumber(tenant.flatId).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPropertyFilter = filterPropertyId === '' || tenant.propertyId === filterPropertyId;
    const matchesFlatFilter = filterFlatId === '' || tenant.flatId === filterFlatId;
    const matchesPaidStatus = filterPaidStatus === 'all' ||
                              (filterPaidStatus === 'paid' && tenant.isPaid) ||
                              (filterPaidStatus === 'unpaid' && !tenant.isPaid);
    return matchesSearch && matchesPropertyFilter && matchesFlatFilter && matchesPaidStatus;
  });

  if (!['Admin', 'Super Admin'].includes(userRole || '')) {
    return <p className="text-center text-red-500 dark:text-red-400 mt-8">Access Denied: Only Admins can manage tenants.</p>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <MessageBox message={message} type={messageType} onClose={handleCloseMessage} />
      <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white border-b-2 border-indigo-400 pb-2">Tenant Management</h3>

      {/* Add New Tenant Form */}
      <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-inner">
        <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Add New Tenant</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="newTenantName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tenant Name</label>
            <input
              type="text"
              id="newTenantName"
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
              placeholder="e.g., Ramesh Kumar"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="newTenantContact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact (WhatsApp No.)</label>
            <input
              type="text"
              id="newTenantContact"
              value={newTenantContact}
              onChange={(e) => setNewTenantContact(e.target.value)}
              placeholder="e.g., +919876543210 (Use email for tenant login)"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="newMaintenanceAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maintenance Amount (₹)</label>
            <input
              type="number"
              id="newMaintenanceAmount"
              value={newMaintenanceAmount}
              onChange={(e) => setNewMaintenanceAmount(Number(e.target.value))}
              placeholder="e.g., 2500"
              min="0"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="newDueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
            <input
              type="date"
              id="newDueDate"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="newTenantPropertyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Property</label>
            <select
              id="newTenantPropertyId"
              value={newTenantPropertyId}
              onChange={(e) => { setNewTenantPropertyId(e.target.value); setNewTenantFlatId(''); }} // Clear flat when property changes
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
            <label htmlFor="newTenantFlatId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Flat</label>
            <select
              id="newTenantFlatId"
              value={newTenantFlatId}
              onChange={(e) => setNewTenantFlatId(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              disabled={!newTenantPropertyId} // Disable if no property selected
            >
              {flats.filter(f => f.propertyId === newTenantPropertyId).length === 0 ? (
                <option value="">Select property first</option>
              ) : (
                <>
                  <option value="">Select a flat</option>
                  {flats.filter(f => f.propertyId === newTenantPropertyId).map(flat => (
                    <option key={flat.id} value={flat.id}>
                      {flat.flatNumber}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
        <button
          onClick={handleAddTenant}
          className="mt-6 w-full md:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:scale-105"
        >
          Add Tenant
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-inner">
        <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Search & Filter Tenants</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search by Name, Contact, Property or Flat</label>
            <input
              type="text"
              id="searchQuery"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., Ramesh or A-101"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="filterPropertyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Property</label>
            <select
              id="filterPropertyId"
              value={filterPropertyId}
              onChange={(e) => { setFilterPropertyId(e.target.value); setFilterFlatId(''); }} // Clear flat filter when property changes
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
          <div>
            <label htmlFor="filterFlatId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Flat</label>
            <select
              id="filterFlatId"
              value={filterFlatId}
              onChange={(e) => setFilterFlatId(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              disabled={!filterPropertyId} // Disable if no property filtered
            >
              <option value="">All Flats</option>
              {flats.filter(f => f.propertyId === filterPropertyId).map(flat => (
                <option key={flat.id} value={flat.id}>
                  {flat.flatNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filterPaidStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Paid Status</label>
            <select
              id="filterPaidStatus"
              value={filterPaidStatus}
              onChange={(e) => setFilterPaidStatus(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tenant List Table */}
      <div className="mb-8">
        <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Existing Tenants ({filteredTenants.length} found)</h4>
        {filteredTenants.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 italic">No tenants added yet, or no tenants match your search/filter criteria.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Property/Flat
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Maintenance (₹)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Due Date
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
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150 ease-in-out">
                    {editingTenantId === tenant.id ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="text" value={editingTenantName} onChange={(e) => setNewTenantName(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="text" value={editingTenantContact} onChange={(e) => setEditingTenantContact(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select value={editingTenantPropertyId} onChange={(e) => {setEditingTenantPropertyId(e.target.value); setEditingTenantFlatId('');}} className="w-full px-3 py-2 border rounded-md">
                            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <select value={editingTenantFlatId} onChange={(e) => setEditingTenantFlatId(e.target.value)} className="w-full px-3 py-2 border rounded-md mt-1" disabled={!editingTenantPropertyId}>
                            {flats.filter(f => f.propertyId === editingTenantPropertyId).map(f => <option key={f.id} value={f.id}>{f.flatNumber}</option>)}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="number" value={editingMaintenanceAmount} onChange={(e) => setEditingMaintenanceAmount(Number(e.target.value))} className="w-full px-3 py-2 border rounded-md" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="date" value={editingDueDate} onChange={(e) => setEditingDueDate(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input type="checkbox" checked={editingIsPaid} onChange={(e) => setEditingIsPaid(e.target.checked)} className="h-4 w-4 text-indigo-600" /> Paid
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleUpdateTenant(tenant.id)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-150 ease-in-out text-sm transform hover:scale-105"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTenantId(null)}
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
                          {tenant.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-indigo-600 dark:text-indigo-300">
                          {tenant.contact}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {getPropertyName(tenant.propertyId)} / {getFlatNumber(tenant.flatId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                          ₹{tenant.maintenanceAmount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {tenant.dueDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tenant.isPaid ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-200'}`}>
                            {tenant.isPaid ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {!tenant.isPaid && (
                              <button
                                onClick={() => handleSendWhatsAppMessage(tenant)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition duration-150 ease-in-out text-sm flex items-center justify-center transform hover:scale-105"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12.047 2c-6.627 0-12 5.373-12 12s5.373 12 12 12c6.627 0 12-5.373 12-12s-5.373-12-12-12zm.547 3.518c2.148 0 4.145.864 5.602 2.399l-2.072 2.064c-1.077-.978-2.584-1.503-4.077-1.503-2.912 0-5.286 2.373-5.286 5.286s2.373 5.286 5.286 5.286c2.584 0 4.417-1.503 5.385-2.61l2.062 2.063c-1.488 1.489-3.485 2.275-5.447 2.275-6.627 0-12-5.373-12-12s5.373-12 12-12zm-3.085 4.542l-2.222 2.222c-.672.672-1.008 1.554-1.008 2.436s.336 1.764 1.008 2.436c.672.672 1.554 1.008 2.436 1.008s1.764-.336 2.436-1.008l2.222-2.222zm4.848.441l-2.222 2.222c-.672.672-1.008 1.554-1.008 2.436s.336 1.764 1.008 2.436c.672.672 1.554 1.008 2.436 1.008s1.764-.336 2.436-1.008l2.222-2.222z"/><path d="M12.518 10.085c-1.859 0-3.359 1.5-3.359 3.359s1.5 3.359 3.359 3.359 3.359-1.5 3.359-3.359-1.5-3.359-3.359-3.359z"/></svg>
                                Reminder
                              </button>
                            )}
                            <button
                              onClick={() => handleEditClick(tenant)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 ease-in-out text-sm transform hover:scale-105"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTenant(tenant.id)}
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

export default TenantManagement;