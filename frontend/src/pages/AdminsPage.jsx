import React, { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { adminService } from '../services/api';
import { Card, Button, LoadingSpinner, ErrorAlert, Badge } from '../components/UI';
import { formatDate } from '../utils/helpers';
import Navbar from '../components/Navbar';

const ActionMenu = ({ onEdit, onDelete, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className="text-gray-600 hover:text-gray-800 font-bold text-lg p-1"
        title="Actions"
      >
        ⋮
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded shadow-lg z-10 border border-gray-200">
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

  const handleDelete = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await adminService.delete(adminId);
      setSuccess('Admin deleted successfully');
      refetchAdmins();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete admin');
    } finally {
      setLoading(false);
    }
  };

  if (adminsLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admins Management</h1>
          <Button onClick={() => alert('Add admin functionality coming soon')}>
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
                          onEdit={() => alert('Edit admin functionality coming soon')}
                          onDelete={() => handleDelete(admin.id)}
                          isLoading={loading}
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
    </div>
  );
};

export default AdminsPage;
