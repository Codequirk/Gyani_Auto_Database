import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyAuthService } from '../services/api';
import { Card, Button, ErrorAlert, SuccessAlert, LoadingSpinner } from '../components/UI';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email.trim()) {
        setError('Email is required');
        setLoading(false);
        return;
      }

      console.log('[FORGOT-PASSWORD] Requesting password reset for:', email);

      const response = await companyAuthService.requestPasswordReset({
        email: email.trim(),
      });

      console.log('[FORGOT-PASSWORD] Response:', response.data);

      setSuccess(response.data.message || '✓ Password reset link sent to your email!');
      
      // Clear email input
      setEmail('');

      // Redirect to login after 5 seconds
      setTimeout(() => {
        navigate('/company-login');
      }, 5000);
    } catch (err) {
      console.error('[FORGOT-PASSWORD] Error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to request password reset';
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🔑 Reset Password</h1>
            <p className="text-gray-600">Enter your email to receive a password reset link</p>
          </div>

          {error && (
            <div className="mb-6">
              <ErrorAlert message={error} />
            </div>
          )}

          {success && (
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-700 font-medium">{success}</p>
                <p className="text-sm text-green-600 mt-2">
                  Check your email inbox for the password reset link. You will be redirected to login in 5 seconds.
                </p>
              </div>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-2">
                  We'll send a secure password reset link to this email address
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          )}

          <div className="mt-6 space-y-3 border-t pt-4">
            <button
              onClick={() => navigate('/')}
              className="w-full text-center text-blue-600 font-semibold hover:underline text-sm"
            >
              ← Back to Home
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <button
                  onClick={() => navigate('/company-login')}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Back to Login
                </button>
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
