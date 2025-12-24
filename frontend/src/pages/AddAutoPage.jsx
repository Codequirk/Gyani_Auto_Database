import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { autoService, areaService } from '../services/api';
import { Card, Button, Input, LoadingSpinner, ErrorAlert } from '../components/UI';
import Navbar from '../components/Navbar';

const AddAutoPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    auto_no: '',
    owner_name: '',
    area_id: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoNoError, setAutoNoError] = useState('');

  const { data: areas, loading: areasLoading } = useFetch(() => areaService.list());

  /**
   * Validate auto number format (Indian vehicle registration)
   * Valid format: 2 letters + 2 digits + 2 letters + 4 digits (e.g., KA01AA5555)
   */
  const validateAutoNumber = (autoNo) => {
    if (!autoNo) {
      setAutoNoError('');
      return true;
    }

    const cleaned = autoNo.toUpperCase().replace(/\s+/g, '');
    const regex = /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/;
    
    if (!regex.test(cleaned)) {
      setAutoNoError('Format: 2 letters + 2 digits + 2 letters + 4 digits (e.g., KA01AA5555)');
      return false;
    }
    
    setAutoNoError('');
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'auto_no') {
      // Allow only alphanumeric characters and spaces
      const cleanedValue = value.replace(/[^a-zA-Z0-9\s]/g, '');
      setFormData((prev) => ({
        ...prev,
        [name]: cleanedValue,
      }));
      validateAutoNumber(cleanedValue);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.auto_no.trim()) {
        setError('Auto number is required');
        setLoading(false);
        return;
      }
      if (!validateAutoNumber(formData.auto_no.trim())) {
        setError('Invalid auto number format');
        setLoading(false);
        return;
      }
      if (!formData.owner_name.trim()) {
        setError('Owner name is required');
        setLoading(false);
        return;
      }
      if (!formData.area_id) {
        setError('Area is required');
        setLoading(false);
        return;
      }

      const response = await autoService.create({
        auto_no: formData.auto_no.trim(),
        owner_name: formData.owner_name.trim(),
        area_id: formData.area_id,
        notes: formData.notes.trim(),
      });

      setSuccess('Auto added successfully!');
      setFormData({ auto_no: '', owner_name: '', area_id: '', notes: '' });

      // Redirect to autos list after 2 seconds
      setTimeout(() => {
        navigate('/autos');
      }, 2000);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to add auto';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (areasLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/autos')}
            className="text-blue-600 hover:text-blue-800 font-medium mb-4"
          >
            ← Back to Autos
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Add New Auto</h1>
        </div>

        {error && <ErrorAlert message={error} />}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auto Number *
              </label>
              <Input
                type="text"
                name="auto_no"
                value={formData.auto_no}
                onChange={handleChange}
                placeholder="e.g., KA01AB1234"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Format: 2 letters + 2 digits + 2 letters + 4 digits (e.g., KA01AA5555)
              </p>
              {autoNoError && (
                <p className="text-xs text-red-600 mt-1">
                  ✗ {autoNoError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Name *
              </label>
              <Input
                type="text"
                name="owner_name"
                value={formData.owner_name}
                onChange={handleChange}
                placeholder="e.g., John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area *
              </label>
              <select
                name="area_id"
                value={formData.area_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select an area</option>
                {areas?.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any additional notes (optional)"
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Auto'}
              </Button>
              <Button
                type="button"
                onClick={() => navigate('/autos')}
                className="bg-gray-500 hover:bg-gray-600"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AddAutoPage;
