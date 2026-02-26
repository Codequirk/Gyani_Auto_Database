import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { companyAuthService } from '../services/api';
import { Card, Button, ErrorAlert, SuccessAlert, LoadingSpinner } from '../components/UI';

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    // Get email from state or localStorage
    const emailFromState = location.state?.email;
    const emailFromStorage = localStorage.getItem('registration_email');
    const finalEmail = emailFromState || emailFromStorage;

    if (!finalEmail) {
      navigate('/register');
      return;
    }

    setEmail(finalEmail);

    // Timer for OTP expiry
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, location.state]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!otp.trim() || otp.length !== 6) {
        setError('Please enter a valid 6-digit OTP');
        setLoading(false);
        return;
      }

      console.log('[VERIFY-OTP] Verifying OTP for:', email);

      const response = await companyAuthService.verifyOTP({
        email,
        otp: otp.trim(),
      });

      console.log('[VERIFY-OTP] Response:', response.data);

      if (response.data && response.data.user) {
        setSuccess('✓ OTP verified successfully!');
        
        // Store user ID for next step
        localStorage.setItem('temp_user_id', response.data.user.id);
        localStorage.setItem('temp_user_email', response.data.user.email);

        // Redirect to complete profile
        setTimeout(() => {
          navigate('/complete-profile', { 
            state: { 
              userId: response.data.user.id,
              email: response.data.user.email 
            } 
          });
        }, 1500);
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('[VERIFY-OTP] Error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'OTP verification failed';
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🔐 Verify Email</h1>
            <p className="text-gray-600">Enter the OTP sent to your email</p>
            <p className="text-sm text-gray-500 mt-2">{email}</p>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                6-Digit OTP
              </label>
              <input
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading || success}
                maxLength="6"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold tracking-widest focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Enter the 6 digits you received
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || success || otp.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full text-center text-blue-600 font-semibold hover:underline text-sm"
            >
              ← Back to Home
            </button>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-gray-700">
                ⏱️ OTP expires in: <span className="font-bold text-red-600">{formatTime(timeLeft)}</span>
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Didn't receive OTP?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Try another email
                </button>
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
