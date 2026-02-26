import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyAuth } from '../context/CompanyAuthContext';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { companyAuthService } from '../services/api';
import api from '../services/api';
import { Card, Button, ErrorAlert, SuccessAlert, LoadingSpinner } from '../components/UI';

export default function CompanyLoginPage() {
  const navigate = useNavigate();
  const { login } = useCompanyAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError('');
      setLoading(true);

      // Send Google credential to backend
      const response = await api.post('/company-auth/google', {
        credential: credentialResponse.credential,
      });

      console.log('[COMPANY-GOOGLE-LOGIN] Response:', response.data);

      // If profile is incomplete, redirect to complete profile page
      if (response.data.redirectTo === '/complete-profile') {
        navigate('/complete-profile', {
          state: {
            token: response.data.token,
            email: response.data.email,
            name: response.data.name,
          },
        });
      } else {
        // Profile already complete, login user
        const companyData = {
          id: response.data.company.id,
          email: response.data.company.email,
          company_name: response.data.company.company_name || response.data.company.name,
          phone_number: response.data.company.phone_number,
          company_person: response.data.company.contact_person || response.data.company.company_person,
          company_status: response.data.company.company_status,
          name: response.data.company.name || response.data.company.company_name,
          contact_person: response.data.company.contact_person,
          status: response.data.company.company_status,
          rejection_reason: response.data.company.rejection_reason,
        };
        
        login(companyData, response.data.token);
        setSuccess('✓ Login successful!');
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    } catch (err) {
      console.error('[COMPANY-GOOGLE-LOGIN] Error:', err);
      setError(err.response?.data?.error || 'Google login failed');
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        setError('Email and password are required');
        setLoading(false);
        return;
      }

      console.log('[COMPANY-LOGIN] Logging in user:', email);

      const response = await companyAuthService.login({
        email: email.trim(),
        password,
      });

      console.log('[COMPANY-LOGIN] Response:', response.data);

      if (response.data && response.data.token) {
        setSuccess('✓ Login successful!');
        
        console.log('[COMPANY-LOGIN] Response from backend:', {
          user_id: response.data.user.id,
          company_id: response.data.user.company_id,
          company_status: response.data.user.company_status,
        });
        
        // Prepare company data object from response with all fields including company_status
        const companyData = {
          id: response.data.user.company_id,
          email: response.data.user.email,
          company_name: response.data.user.company_name,
          phone_number: response.data.user.phone_number,
          company_person: response.data.user.company_person,
          company_status: response.data.user.company_status,
          name: response.data.user.company_name, // Some parts of dashboard use 'name'
          contact_person: response.data.user.company_person, // Some parts use 'contact_person'
          status: response.data.user.company_status, // Alias for backward compatibility
        };
        
        console.log('[COMPANY-LOGIN] Company data to store:', companyData);
        
        // Use context login to populate auth state
        login(companyData, response.data.token);

        // Redirect to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('[COMPANY-LOGIN] Error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Login failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && success) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🔐 Company Login</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-6">
              <ErrorAlert message={error} />
            </div>
          )}

          {success && (
            <div className="mb-6">
              <SuccessAlert message={success} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || success}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || success}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-600 hover:text-gray-900"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || success || !email || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Google Login */}
          <div className="w-full flex justify-center">
            <GoogleOAuthProvider clientId="665476970812-fl9240081dp09jvfbe84klgtnfdn8q5g.apps.googleusercontent.com">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text="signin"
                width="320"
              />
            </GoogleOAuthProvider>
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full text-center text-blue-600 font-semibold hover:underline text-sm"
            >
              ← Back to Home
            </button>

            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full text-center text-blue-600 font-semibold hover:underline text-sm"
            >
              Forgot Password?
            </button>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 text-center">
                Don't have an account?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
