import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompanyAuth } from '../context/CompanyAuthContext';
import api from '../services/api';
import { Button, Input, ErrorAlert, Card } from '../components/UI';

const CompleteProfilePage = () => {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useCompanyAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get token from navigation state
  const token = location.state?.token;
  const email = location.state?.email;
  const defaultName = location.state?.name || '';

  React.useEffect(() => {
    setName(defaultName);
    // If no token, redirect to login
    if (!token) {
      navigate('/company-login');
    }
  }, [token, navigate, defaultName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!name || !phoneNumber) {
        setError('Name and phone number are required');
        setLoading(false);
        return;
      }

      // Set auth header with the token for profile completion
      const response = await api.post(
        '/company-auth/complete-profile',
        {
          name,
          phone_number: phoneNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Login user with the returned token
      login(response.data.company, response.data.token);

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/company/dashboard');
      }, 100);
    } catch (err) {
      console.error('Profile completion error:', err);
      setError(err.response?.data?.error || 'Failed to complete profile');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-teal-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">Complete Your Profile</h1>
        <p className="text-center text-gray-600 text-sm mb-2">
          Welcome! We just need a few details to finish setting up your account.
        </p>
        <p className="text-center text-sm text-gray-500 mb-6">
          Email: <span className="font-medium text-gray-700">{email}</span>
        </p>

        {error && <ErrorAlert message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Company Name"
            label="Company Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            type="tel"
            placeholder="Phone Number"
            label="Phone Number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />

          <p className="text-xs text-gray-500 text-center">
            We use this information to verify your company and process requests.
          </p>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Completing Profile...' : 'Complete Profile'}
          </Button>

          <p className="text-center text-xs text-gray-600">
            Once you complete your profile, you'll be able to access your dashboard and manage your assignments.
          </p>
        </form>

        <div className="mt-6 pt-6 border-t text-center text-sm text-gray-600">
          <button
            onClick={() => navigate('/company-login')}
            className="text-blue-600 hover:underline font-medium"
          >
            ← Back to Login
          </button>
        </div>
      </Card>
    </div>
  );
};

export default CompleteProfilePage;
