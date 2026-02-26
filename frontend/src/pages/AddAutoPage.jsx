import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { autoService, areaService, autoMonthlyPaymentService } from '../services/api';
import { Card, Button, Input, LoadingSpinner, ErrorAlert } from '../components/UI';
import Navbar from '../components/Navbar';

const AddAutoPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    auto_no: '',
    owner_name: '',
    driver_phone: '',
    area_id: '',
    notes: '',
  });
  const [paymentData, setPaymentData] = useState({
    monthly_cost: '',
    advance_payment: '',
    start_date: '',
    end_date: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoNoError, setAutoNoError] = useState('');
  const [editingDates, setEditingDates] = useState(false);

  const { data: areas, loading: areasLoading } = useFetch(() => areaService.list());

  /**
   * Calculate end date: start_date + 29 days = 30-day billing cycle
   */
  const calculateEndDate = (startDateString) => {
    if (!startDateString) return '';
    const start = new Date(startDateString);
    const end = new Date(start);
    end.setDate(end.getDate() + 29);
    return end.toISOString().split('T')[0];
  };

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
    } else if (name === 'driver_phone') {
      // Allow only digits (0-9), max 10 characters
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        [name]: digitsOnly,
      }));
    } else if (name === 'start_date') {
      // Auto-calculate end date when start date changes
      const calculatedEndDate = calculateEndDate(value);
      setPaymentData((prev) => ({
        ...prev,
        start_date: value,
        end_date: !editingDates ? calculatedEndDate : prev.end_date,
      }));
    } else if (['monthly_cost', 'advance_payment', 'end_date'].includes(name)) {
      setPaymentData((prev) => ({
        ...prev,
        [name]: value,
      }));
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
      if (!formData.driver_phone.trim()) {
        setError('Driver phone number is required');
        setLoading(false);
        return;
      }
      if (!/^\d{10}$/.test(formData.driver_phone)) {
        setError('Driver phone number must be 10 digits');
        setLoading(false);
        return;
      }
      if (!formData.area_id) {
        setError('Area is required');
        setLoading(false);
        return;
      }

      // Validate payment fields
      if (!paymentData.monthly_cost.trim()) {
        setError('Monthly cost is required');
        setLoading(false);
        return;
      }
      if (isNaN(paymentData.monthly_cost) || parseFloat(paymentData.monthly_cost) <= 0) {
        setError('Monthly cost must be a valid positive number');
        setLoading(false);
        return;
      }
      // Advance payment is optional - validate only if provided
      if (paymentData.advance_payment.trim()) {
        if (isNaN(paymentData.advance_payment) || parseFloat(paymentData.advance_payment) < 0) {
          setError('Advance payment must be a valid non-negative number');
          setLoading(false);
          return;
        }
        if (parseFloat(paymentData.advance_payment) > parseFloat(paymentData.monthly_cost)) {
          setError('Advance payment cannot be greater than monthly cost');
          setLoading(false);
          return;
        }
      }
      if (!paymentData.start_date) {
        setError('Start date is required');
        setLoading(false);
        return;
      }

      // Auto-calculate end_date if not already set
      let endDate = paymentData.end_date;
      if (!endDate) {
        endDate = calculateEndDate(paymentData.start_date);
      }

      // Create auto first
      const autoResponse = await autoService.create({
        auto_no: formData.auto_no.trim(),
        owner_name: formData.owner_name.trim(),
        driver_phone: formData.driver_phone,
        area_id: formData.area_id,
        notes: formData.notes.trim(),
      });

      const autoId = autoResponse.data?.id || autoResponse.id;

      // Create payment for the auto
      await autoMonthlyPaymentService.create({
        auto_id: autoId,
        monthly_cost: parseFloat(paymentData.monthly_cost),
        advance_payment: paymentData.advance_payment.trim() ? parseFloat(paymentData.advance_payment) : 0,
        start_date: paymentData.start_date,
        end_date: endDate,
      });

      setSuccess('Auto and payment added successfully!');
      setFormData({ auto_no: '', owner_name: '', driver_phone: '', area_id: '', notes: '' });
      setPaymentData({ monthly_cost: '', advance_payment: '', start_date: '', end_date: '' });

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
                Driver Phone Number *
              </label>
              <Input
                type="tel"
                name="driver_phone"
                value={formData.driver_phone}
                onChange={handleChange}
                placeholder="e.g., 9876543210"
                maxLength="10"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                10-digit mobile number
              </p>
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
                    {area.name} {area.pin_code ? `(${area.pin_code})` : ''}
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

            {/* Payment Section */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Details</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Cost (₹) *
                </label>
                <Input
                  type="number"
                  name="monthly_cost"
                  value={paymentData.monthly_cost}
                  onChange={handleChange}
                  placeholder="e.g., 5000"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Advance Payment (₹)
                </label>
                <Input
                  type="number"
                  name="advance_payment"
                  value={paymentData.advance_payment}
                  onChange={handleChange}
                  placeholder="e.g., 2500 (optional - defaults to 0)"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Maximum: {paymentData.monthly_cost ? `₹${parseFloat(paymentData.monthly_cost).toLocaleString('en-IN')}` : 'Enter monthly cost first'}
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date *
                  </label>
                </div>
                <input
                  type="date"
                  name="start_date"
                  value={paymentData.start_date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    End Date (Auto-calculated)
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditingDates(!editingDates)}
                    className="text-lg text-blue-600 hover:text-blue-800 font-bold px-2 py-1"
                    title="Edit dates manually"
                  >
                    {editingDates ? '✓' : '⋮'}
                  </button>
                </div>
                {editingDates ? (
                  <input
                    type="date"
                    name="end_date"
                    value={paymentData.end_date}
                    onChange={handleChange}
                    min={paymentData.start_date || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  />
                ) : (
                  <input
                    type="date"
                    value={paymentData.end_date}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                )}
                {paymentData.start_date && paymentData.end_date && (
                  <p className="text-xs text-gray-500 mt-2">
                    Duration: {Math.ceil((new Date(paymentData.end_date) - new Date(paymentData.start_date)) / (1000 * 60 * 60 * 24)) + 1} days
                  </p>
                )}
              </div>
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
