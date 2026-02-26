import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyAuthService } from '../services/api';
import { Card, Button, Input, ErrorAlert, LoadingSpinner } from '../components/UI';

export default function RegisterEmailPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email.trim()) {
        setError('Please enter your email address');
        setLoading(false);
        return;
      }

      console.log('\n========== [FRONTEND REGISTER] STARTING EMAIL REGISTRATION =========');
      console.log('[FRONTEND REGISTER] Email:', email);
      console.log('[FRONTEND REGISTER] Calling companyAuthService.registerEmail()...');

      const response = await companyAuthService.registerEmail({ email: email.trim() });

      console.log('[FRONTEND REGISTER] ✅ Response received:', response.data);
      console.log('[FRONTEND REGISTER] Message:', response.data.message);
      console.log('========== [FRONTEND REGISTER] SUCCESS =========\n');

      if (response.data && response.data.email) {
        // Store email for next step
        localStorage.setItem('registration_email', response.data.email);
        console.log('[REGISTER] Email registered, redirecting to OTP verification');
        navigate('/verify-otp', { state: { email: response.data.email } });
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('[REGISTER] Error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Registration failed';
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🚀 Company Portal</h1>
            <p className="text-gray-600">Create Your Account</p>
          </div>

          {error && (
            <div className="mb-6">
              <ErrorAlert message={error} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              placeholder="company@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full text-center text-blue-600 font-semibold hover:underline text-sm"
            >
              ← Back to Home
            </button>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">
                Already have an account? <a href="/company-login" className="text-blue-600 font-semibold hover:underline">Login here</a>
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-gray-600">
              ✓ We'll send a 6-digit OTP to your email<br/>
              ✓ OTP expires in 5 minutes<br/>
              ✓ You'll complete your profile after verification
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
