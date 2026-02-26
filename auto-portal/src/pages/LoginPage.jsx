import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { autoAuthService } from '../services/api';
import { Card, Button, Input, ErrorAlert, LoadingSpinner } from '../components/UI';

export default function LoginPage() {
  const navigate = useNavigate();
  const [autoNo, setAutoNo] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!autoNo.trim()) {
        setError('Please enter Auto Number');
        setLoading(false);
        return;
      }

      if (!driverPhone.trim()) {
        setError('Please enter Driver Phone Number');
        setLoading(false);
        return;
      }

      const response = await autoAuthService.login({
        auto_no: autoNo.trim(),
        driver_phone: driverPhone.trim(),
      });

      console.log('[LOGIN] Response:', response);

      if (response.data && response.data.token) {
        // Store the auto auth token
        localStorage.setItem('auto_auth_token', response.data.token);
        localStorage.setItem('auto_id', response.data.auto?.id);
        localStorage.setItem('auto_no', response.data.auto?.auto_no);
        localStorage.setItem('driver_name', response.data.auto?.owner_name);
        localStorage.setItem('image_url', response.data.auto?.image_url || '');
        localStorage.setItem('image_upload_date', response.data.auto?.image_upload_date || '');

        console.log('[LOGIN] Token and auto data stored, redirecting to upload page');
        navigate('/upload');
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('[LOGIN] Error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Login failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🚕 Auto Portal</h1>
            <p className="text-gray-600">Driver Login</p>
          </div>

          {error && (
            <div className="mb-6">
              <ErrorAlert message={error} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Auto Number"
              placeholder="e.g., KA0400004"
              value={autoNo}
              onChange={(e) => setAutoNo(e.target.value)}
              disabled={loading}
            />

            <Input
              label="Driver Phone Number"
              placeholder="e.g., 9876543210"
              type="tel"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              maxLength="10"
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-700 text-center">
              💡 <strong>Note:</strong> Enter your auto number and 10-digit phone number to login
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
