import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompanyAuth } from '../context/CompanyAuthContext';
import { companyAuthService } from '../services/api';
import { Card, Button, ErrorAlert, SuccessAlert, LoadingSpinner } from '../components/UI';

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useCompanyAuth();
  
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    company_name: '',
    phone_number: '',
    company_person: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('weak');

  useEffect(() => {
    // Get user ID from state or localStorage
    const userIdFromState = location.state?.userId;
    const userIdFromStorage = localStorage.getItem('temp_user_id');
    const emailFromState = location.state?.email;
    const emailFromStorage = localStorage.getItem('temp_user_email');

    const finalUserId = userIdFromState || userIdFromStorage;
    const finalEmail = emailFromState || emailFromStorage;

    if (!finalUserId || !finalEmail) {
      navigate('/register');
      return;
    }

    setUserId(finalUserId);
    setEmail(finalEmail);
  }, [navigate, location.state]);

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
    if (!formData.company_name.trim()) {
      setError('Company name is required');
      return false;
    }
    if (!formData.phone_number.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!formData.company_person.trim()) {
      setError('Company person name is required');
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
      console.log('[COMPLETE-PROFILE] Completing profile for user:', userId);

      const response = await companyAuthService.completeProfile({
        user_id: userId,
        password: formData.password,
        company_name: formData.company_name,
        phone_number: formData.phone_number,
        company_person: formData.company_person,
      });

      console.log('[COMPLETE-PROFILE] Response:', response.data);

      if (response.data && response.data.token) {
        setSuccess('✓ Profile completed successfully!');
        
        console.log('[COMPLETE-PROFILE] Response from backend:', {
          user_id: response.data.user.id,
          company_id: response.data.user.company_id,
          company_status: response.data.user.company_status,
        });
        
        // Prepare company data object with all fields including company_status
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
        
        console.log('[COMPLETE-PROFILE] Company data to store:', companyData);
        
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
      console.error('[COMPLETE-PROFILE] Error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to complete profile';
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">👤 Complete Profile</h1>
            <p className="text-gray-600">Set your password and company details</p>
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
            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
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

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                name="company_name"
                placeholder="Your company name"
                value={formData.company_name}
                onChange={handleChange}
                disabled={loading || success}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone_number"
                placeholder="Your phone number"
                value={formData.phone_number}
                onChange={handleChange}
                disabled={loading || success}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Company Person */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person
              </label>
              <input
                type="text"
                name="company_person"
                placeholder="Your name or contact person"
                value={formData.company_person}
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
                !formData.confirmPassword ||
                !formData.company_name ||
                !formData.phone_number ||
                !formData.company_person
              }
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
            >
              {loading ? 'Creating Account...' : 'Complete Profile'}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full text-center text-blue-600 font-semibold hover:underline text-sm"
            >
              ← Back to Home
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Need to change email?{' '}
                <button
                  onClick={() => {
                    localStorage.removeItem('temp_user_id');
                    localStorage.removeItem('temp_user_email');
                    navigate('/register');
                  }}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Start over
                </button>
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
