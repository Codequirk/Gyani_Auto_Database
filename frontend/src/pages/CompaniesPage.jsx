import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { companyService } from '../services/api';
import { Card, Button, Input, LoadingSpinner, ErrorAlert, Badge } from '../components/UI';
import { formatDate } from '../utils/helpers';
import Navbar from '../components/Navbar';

const ActionMenu = ({ onEdit, onDelete, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Close menu when clicking outside
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

  const handleEdit = () => {
    onEdit();
    setIsOpen(false);
  };

  const handleDelete = () => {
    onDelete();
    setIsOpen(false);
  };

  const handleMenuOpen = () => {
    if (!isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom, left: rect.left });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={handleMenuOpen}
        className="text-gray-600 hover:text-gray-900 font-bold text-lg p-1 hover:bg-gray-100 rounded"
        title="Actions"
        type="button"
      >
        ⋮
      </button>
      {isOpen && (
        <div 
          className="fixed w-40 bg-white rounded-lg shadow-xl z-[9999] border border-gray-200 overflow-hidden"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
        >
          <button
            onClick={handleEdit}
            type="button"
            className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            type="button"
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

const CompaniesPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  
  const debounceTimer = useRef(null);

  const [formState, setFormState] = useState({
    name: '',
    contact_person: '',
    emails: [''],
    phone_numbers: [''],
    password: '',
  });

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // 300ms delay

    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  const {
    data: companies,
    loading: companiesLoading,
    refetch: refetchCompanies,
  } = useFetch(() => companyService.list({ search: debouncedSearch, status: selectedStatus }), [debouncedSearch, selectedStatus]);

  const handleEdit = (company) => {
    setEditingCompanyId(company.id);
    setFormState({
      name: company.name || '',
      contact_person: company.contact_person || '',
      emails: company.emails && company.emails.length > 0 ? company.emails : [''],
      phone_numbers: company.phone_numbers && company.phone_numbers.length > 0 ? company.phone_numbers : [''],
      password: '',
    });
    setShowAddModal(true);
    setErrorMessage('');
  };

  const handleDelete = async (companyId) => {
    if (!window.confirm('Are you sure you want to delete this company?')) {
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      await companyService.delete(companyId);
      setSuccessMessage('Company deleted successfully');
      refetchCompanies();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to delete company');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value, index = null) => {
    if (index !== null) {
      // Handle array fields (emails, phone_numbers)
      setFormState(prev => {
        const updated = [...prev[field]];
        updated[index] = value;
        return { ...prev, [field]: updated };
      });
    } else {
      // Handle regular fields
      setFormState(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const addEmailField = () => {
    setFormState(prev => ({
      ...prev,
      emails: [...prev.emails, '']
    }));
  };

  const removeEmailField = (index) => {
    setFormState(prev => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index)
    }));
  };

  const addPhoneField = () => {
    setFormState(prev => ({
      ...prev,
      phone_numbers: [...prev.phone_numbers, '']
    }));
  };

  const removePhoneField = (index) => {
    setFormState(prev => ({
      ...prev,
      phone_numbers: prev.phone_numbers.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setErrorMessage('');
    setSuccessMessage('');
    
    const name = formState.name.trim();
    const contact_person = formState.contact_person.trim();
    const password = formState.password.trim();
    
    if (!name) {
      setErrorMessage('Company Name is required');
      return;
    }
    
    if (!contact_person) {
      setErrorMessage('Applicant Name is required');
      return;
    }

    // Password validation: required for create, optional for edit
    if (!editingCompanyId && !password) {
      setErrorMessage('Password is required');
      return;
    }

    if (password && password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }
    
    // Filter out empty emails
    const validEmails = formState.emails.filter(e => e.trim());
    
    if (validEmails.length === 0) {
      setErrorMessage('At least one email is required');
      return;
    }
    
    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (let email of validEmails) {
      if (!emailRegex.test(email.trim())) {
        setErrorMessage(`Invalid email format: ${email}`);
        return;
      }
    }
    
    // Filter out empty phone numbers
    const validPhones = formState.phone_numbers.filter(p => p.trim());
    
    setLoading(true);

    try {
      const submitData = {
        name: name,
        contact_person: contact_person,
        emails: validEmails,
        phone_numbers: validPhones,
      };

      if (password) {
        submitData.password = password;
      }

      if (!editingCompanyId) {
        submitData.status = 'ACTIVE';
      }

      if (editingCompanyId) {
        console.log('Updating company with data:', submitData);
        const response = await companyService.update(editingCompanyId, submitData);
        console.log('Company updated:', response);
        setSuccessMessage('Company updated successfully!');
      } else {
        console.log('Creating company with data:', submitData);
        const response = await companyService.create(submitData);
        console.log('Company created:', response);
        setSuccessMessage('Company created successfully!');
      }
      
      setFormState({
        name: '',
        contact_person: '',
        emails: [''],
        phone_numbers: [''],
        password: '',
      });
      
      setEditingCompanyId(null);
      setShowAddModal(false);
      
      refetchCompanies();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error creating company:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create company';
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (companiesLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Companies Management</h1>
          <Button onClick={() => setShowAddModal(true)}>
            + Add Company
          </Button>
        </div>

        {errorMessage && <ErrorAlert message={errorMessage} />}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {successMessage}
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search company name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>

        {/* Companies Table */}
        <div className="overflow-visible">
          <Card className="overflow-visible">
            {companies?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No companies found
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
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies?.map((company, index) => (
                      <tr key={company.id} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer" onDoubleClick={() => navigate(`/companies/${company.id}`)}>
                        <td className="px-6 py-3 text-sm text-gray-900">{company.name}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{company.email}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {formatDate(company.created_at)}
                        </td>
                        <td className="px-6 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                          <ActionMenu
                            onEdit={() => handleEdit(company)}
                            onDelete={() => handleDelete(company.id)}
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

        {/* Add/Edit Company Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">{editingCompanyId ? 'Edit Company' : 'Add New Company'}</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCompanyId(null);
                    setErrorMessage('');
                    setFormState({
                      name: '',
                      contact_person: '',
                      emails: [''],
                      phone_numbers: [''],
                      password: '',
                    });
                  }}
                  className="text-white hover:text-gray-200 font-bold text-2xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                    {errorMessage}
                  </div>
                )}

                {/* Company Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter company name"
                    required
                  />
                </div>

                {/* Contact Person Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Applicant Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formState.contact_person}
                    onChange={(e) => handleInputChange('contact_person', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter applicant name"
                    required
                  />
                </div>

                {/* Password */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {!editingCompanyId && <span className="text-red-600">*</span>}
                  </label>
                  <input
                    type="password"
                    value={formState.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={editingCompanyId ? 'Leave empty to keep current password' : 'Enter password (min 6 characters)'}
                    required={!editingCompanyId}
                  />
                </div>

                {/* Email */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Email ID <span className="text-red-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addEmailField}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      + Add Email
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formState.emails.map((email, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => handleInputChange('emails', e.target.value, index)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Email ${index + 1}`}
                        />
                        {formState.emails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEmailField(index)}
                            className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg font-medium transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Phone Number */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <button
                      type="button"
                      onClick={addPhoneField}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      + Add Phone
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formState.phone_numbers.map((phone, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => handleInputChange('phone_numbers', e.target.value, index)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Phone ${index + 1} (optional)`}
                        />
                        {formState.phone_numbers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePhoneField(index)}
                            className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg font-medium transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
                  >
                    {loading ? 'Creating...' : 'Create Company'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setErrorMessage('');
                      setFormState({
                        name: '',
                        contact_person: '',
                        emails: [''],
                        phone_numbers: [''],
                        password: '',
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompaniesPage;
