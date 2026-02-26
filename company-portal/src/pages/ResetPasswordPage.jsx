import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { companyAuthService } from '../services/api';
import { Card, Button, ErrorAlert, SuccessAlert, LoadingSpinner } from '../components/UI';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('weak');

  useEffect(() => {
    // Get token from URL query params
    const resetToken = searchParams.get('token');
    if (!resetToken) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }
    setToken(resetToken);
  }, [searchParams]);

  const validatePasswordStrength = (password) => {
    if (password.length < 8) return 'weak';
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);

    const strength = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    if (strength < 2) return 'weak';
    if (strength < 3) return 'medium';
    return 'strong';
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setFormData({ ...formData, password: newPassword });
    setPasswordStrength(validatePasswordStrength(newPassword));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    if (!formData.password.trim()) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (!/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password)) {
      setError('Password must contain uppercase and lowercase letters');
      return false;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError('Password must contain at least one number');
      return false;
    }
    if (!/[!@#$%^&*]/.test(formData.password)) {
      setError('Password must contain a special character (!@#$%^&*)');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log('[RESET-PASSWORD] Resetting password with token');

      const response = await companyAuthService.resetPassword({
        token,
        newPassword: formData.password,
      });

      console.log('[RESET-PASSWORD] Response:', response.data);

      if (response.data && response.data.message) {
        setSuccess('✓ Password reset successful! Redirecting to login...');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/company-login');
        }, 2000);
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('[RESET-PASSWORD] Error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to reset password';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 'strong') return 'bg-green-500';
    if (passwordStrength === 'medium') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading && success) return <LoadingSpinner />;

  if (!token && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <div className="p-8 text-center">
            <LoadingSpinner />
            <p className="text-gray-600 mt-4">Loading reset page...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🔐 Create New Password</h1>
            <p className="text-gray-600">Enter a strong password to secure your account</p>
          </div>

          {error && (
            <div className="mb-6">
              {error.includes('Invalid or missing') ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 font-medium">{error}</p>
                  <button
                    onClick={() => navigate('/forgot-password')}
                    className="mt-3 w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Request New Reset Link
                  </button>
                </div>
              ) : (
                <ErrorAlert message={error} />
              )}
            </div>
          )}

          {success && (
            <div className="mb-6">
              <SuccessAlert message={success} />
            </div>
          )}

          {!error?.includes('Invalid or missing') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter a strong password"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  disabled={loading || success}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                {formData.password && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-600 mb-1">
                      Strength: <span className="font-semibold capitalize">{passwordStrength}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getPasswordStrengthColor()}`}
                        style={{
                          width:
                            passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%',
                        }}
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Must contain 8+ chars, uppercase, lowercase, number, and special char (!@#$%^&*)
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading || success}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <Button
                type="submit"
                disabled={
                  loading ||
                  success ||
                  !formData.password ||
                  !formData.confirmPassword
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
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

            <button
              onClick={() => navigate('/company-login')}
              className="w-full text-center text-blue-600 font-semibold hover:underline text-sm"
            >
              Back to Login
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
