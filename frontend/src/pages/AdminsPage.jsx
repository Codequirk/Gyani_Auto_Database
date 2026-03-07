import React, { useState, useRef, useEffect } from 'react';
import { useFetch } from '../hooks/useFetch';
import { adminService } from '../services/api';
import { Card, Button, LoadingSpinner, ErrorAlert, Badge } from '../components/UI';
import { formatDate } from '../utils/helpers';
import Navbar from '../components/Navbar';

const ActionMenu = ({ onEdit, onDelete, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleMenuOpen = () => {
    if (!isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.top + rect.height / 2, left: rect.right + 8 });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div 
      className="relative inline-block"
      ref={menuRef}
    >
      <button
        onClick={handleMenuOpen}
        className="text-gray-600 hover:text-gray-800 font-bold text-lg p-1"
        title="Actions"
      >
        ⋮
      </button>
      {isOpen && (
        <div 
          className="fixed w-40 bg-white rounded shadow-lg z-[9999] border border-gray-200"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, transform: 'translateY(-50%)' }}
        >
          <button
            onClick={() => {
              onEdit();
              setIsOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
          >
            Edit
          </button>
          <button
            onClick={() => {
              onDelete();
              setIsOpen(false);
            }}
            disabled={isLoading}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

const AdminsPage = () => {
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Add Admin Modal State
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [addAdminData, setAddAdminData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN',
  });
  const [addAdminLoading, setAddAdminLoading] = useState(false);

  // Edit Admin Modal State
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editAdminData, setEditAdminData] = useState({
    name: '',
    email: '',
    role: 'ADMIN',
  });
  const [editAdminLoading, setEditAdminLoading] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const {
    data: admins,
    loading: adminsLoading,
    refetch: refetchAdmins,
  } = useFetch(() => adminService.list());

  const filteredAdmins = admins?.filter(
    (admin) =>
      admin.name?.toLowerCase().includes(search.toLowerCase()) ||
      admin.email?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Add Admin Handler
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    
    if (!addAdminData.name || !addAdminData.email || !addAdminData.password) {
      setError('Name, email, and password are required');
      return;
    }

    setAddAdminLoading(true);
    setError('');
    try {
      await adminService.create({
        name: addAdminData.name,
        email: addAdminData.email,
        password: addAdminData.password,
        role: addAdminData.role,
      });

      setSuccess('Admin created successfully');
      setShowAddAdminModal(false);
      setAddAdminData({ name: '', email: '', password: '', role: 'ADMIN' });
      refetchAdmins();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create admin');
    } finally {
      setAddAdminLoading(false);
    }
  };

  // Open Edit Admin Modal
  const openEditAdminModal = (admin) => {
    setEditingAdmin(admin);
    setEditAdminData({
      name: admin.name,
      email: admin.email,
      role: admin.role || 'ADMIN',
    });
    setShowEditAdminModal(true);
  };

  // Edit Admin Handler
  const handleEditAdmin = async (e) => {
    e.preventDefault();

    if (!editAdminData.name || !editAdminData.email) {
      setError('Name and email are required');
      return;
    }

    setEditAdminLoading(true);
    setError('');
    try {
      await adminService.update(editingAdmin.id, {
        name: editAdminData.name,
        email: editAdminData.email,
        role: editAdminData.role,
      });

      setSuccess('Admin updated successfully');
      setShowEditAdminModal(false);
      setEditingAdmin(null);
      refetchAdmins();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update admin');
    } finally {
      setEditAdminLoading(false);
    }
  };

  // Confirm Delete Handler
  const confirmDeleteAdmin = (admin) => {
    setDeleteConfirmation(admin);
  };

  // Delete Admin Handler
  const handleDelete = async (adminId) => {
    setDeleteLoading(true);
    setError('');
    try {
      await adminService.delete(adminId);
      setSuccess('Admin deleted successfully');
      setDeleteConfirmation(null);
      refetchAdmins();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete admin');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (adminsLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admins Management</h1>
          <Button onClick={() => setShowAddAdminModal(true)}>
            + Add Admin
          </Button>
        </div>

        {error && <ErrorAlert message={error} />}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Search */}
        <Card className="mb-6">
          <input
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Card>

        {/* Admins Table */}
        <Card>
          {filteredAdmins.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No admins found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">{admin.name}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{admin.email}</td>
                      <td className="px-6 py-3 text-sm">
                        <Badge className="bg-blue-100 text-blue-800">
                          {admin.role || 'ADMIN'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {formatDate(admin.created_at)}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <ActionMenu
                          onEdit={() => openEditAdminModal(admin)}
                          onDelete={() => confirmDeleteAdmin(admin)}
                          isLoading={deleteLoading}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Admin</h2>

              <form onSubmit={handleAddAdmin}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={addAdminData.name}
                    onChange={(e) => setAddAdminData({ ...addAdminData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Admin name"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={addAdminData.email}
                    onChange={(e) => setAddAdminData({ ...addAdminData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@example.com"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={addAdminData.password}
                    onChange={(e) => setAddAdminData({ ...addAdminData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Password"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={addAdminData.role}
                    onChange={(e) => setAddAdminData({ ...addAdminData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddAdminModal(false);
                      setAddAdminData({ name: '', email: '', password: '', role: 'ADMIN' });
                      setError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addAdminLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addAdminLoading ? 'Creating...' : 'Create Admin'}
                  </button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Admin Modal */}
      {showEditAdminModal && editingAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Admin</h2>

              <form onSubmit={handleEditAdmin}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editAdminData.name}
                    onChange={(e) => setEditAdminData({ ...editAdminData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Admin name"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editAdminData.email}
                    onChange={(e) => setEditAdminData({ ...editAdminData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@example.com"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={editAdminData.role}
                    onChange={(e) => setEditAdminData({ ...editAdminData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditAdminModal(false);
                      setEditingAdmin(null);
                      setError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editAdminLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editAdminLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Delete Admin</h2>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>{deleteConfirmation.name}</strong>?<br />
                This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmation.id)}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminsPage;
