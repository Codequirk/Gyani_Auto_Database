import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCompanyAuth } from '../context/CompanyAuthContext';
import api from '../services/api';
import { Button, Input, ErrorAlert, Card } from '../components/UI';

const CompanyLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [areas, setAreas] = useState([]);
  
  // Registration fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regContactPerson, setRegContactPerson] = useState('');
  const [regPhoneNumber, setRegPhoneNumber] = useState('');
  const [regAutosRequired, setRegAutosRequired] = useState('');
  const [regDaysRequired, setRegDaysRequired] = useState('');
  const [regStartDate, setRegStartDate] = useState('');
  const [regAreaId, setRegAreaId] = useState('');
  
  const { login } = useCompanyAuth();
  const navigate = useNavigate();

  // Fetch areas when register form is shown
  useEffect(() => {
    if (showRegister && areas.length === 0) {
      const fetchAreas = async () => {
        try {
          const response = await api.get('/areas');
          setAreas(response.data || []);
        } catch (err) {
          console.error('Failed to load areas:', err);
        }
      };
      fetchAreas();
    }
  }, [showRegister]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/company-auth/login', { email, password });
      login(response.data.company, response.data.token);
      
      // Wait a moment for state to update before navigating
      setTimeout(() => {
        navigate('/company/dashboard');
      }, 100);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!regName || !regEmail || !regPassword || !regContactPerson) {
        setError('Name, email, password, and contact person are required');
        setLoading(false);
        return;
      }

      const response = await api.post('/company-auth/register', {
        name: regName,
        email: regEmail,
        password: regPassword,
        contact_person: regContactPerson,
        phone_number: regPhoneNumber,
        autos_required: regAutosRequired ? parseInt(regAutosRequired) : 0,
        days_required: regDaysRequired ? parseInt(regDaysRequired) : 0,
        start_date: regStartDate || null,
        area_id: regAreaId || null,
      });

      login(response.data.company, response.data.token);
      
      // Show success message
      setError('');
      alert(response.data.message || 'Registration successful! Your request is pending admin approval.');
      
      // Wait a moment for state to update before navigating
      setTimeout(() => {
        navigate('/company/dashboard');
      }, 100);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <>
      {!showForm ? (
        // Home Page Section
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          {/* Navbar */}
          <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-blue-600">🚗 Gyani Auto Database</h1>
                <div className="space-x-3">
                  <Button 
                    variant="secondary"
                    className="text-sm px-3 py-1"
                    onClick={() => {
                      setShowRegister(false);
                      setShowForm(true);
                      setError('');
                    }}
                  >
                    Login
                  </Button>
                  <Button 
                    variant="primary"
                    className="text-sm px-3 py-1"
                    onClick={() => {
                      setShowRegister(true);
                      setShowForm(true);
                      setError('');
                    }}
                  >
                    Register
                  </Button>
                </div>
              </div>
            </div>
          </nav>

          {/* Hero Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Advertise Your Business with Our Autos
              </h2>
              <p className="text-lg md:text-xl text-gray-600 mb-8">
                Get your message in front of thousands of people daily through vehicle advertising
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {/* Feature 1 */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-4xl mb-4">📍</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Wide Coverage</h3>
                <p className="text-gray-600">
                  Advertise across multiple areas and reach customers in different regions of the city with our extensive fleet of vehicles.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-4xl mb-4">📅</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Flexible Duration</h3>
                <p className="text-gray-600">
                  Choose the number of days you want to run your advertisement. No long-term commitment required - book exactly what you need.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time Tracking</h3>
                <p className="text-gray-600">
                  Track your advertisement campaigns in real-time and see exactly where your ads are being displayed across our vehicle network.
                </p>
              </div>
            </div>

            {/* Benefits Section */}
            <div className="bg-white rounded-lg shadow-lg p-12 mb-16">
              <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Why Choose Us?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="text-2xl">✓</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Cost-Effective</h4>
                    <p className="text-gray-600">Affordable advertising rates with high visibility and guaranteed placement on active vehicles.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-2xl">✓</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Easy Management</h4>
                    <p className="text-gray-600">Manage all your campaigns from one dashboard with instant updates and notifications.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-2xl">✓</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">24/7 Visibility</h4>
                    <p className="text-gray-600">Your advertisement runs all day and night, ensuring maximum exposure to potential customers.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-2xl">✓</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Dedicated Support</h4>
                    <p className="text-gray-600">Our support team is always ready to help you optimize your advertising campaigns.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-12">
              <h3 className="text-3xl font-bold text-white mb-4">Ready to Start Advertising?</h3>
              <p className="text-lg text-blue-100 mb-8">
                Join hundreds of companies already using our platform to grow their business
              </p>
              <div className="space-x-4">
                <Button 
                  variant="secondary"
                  className="text-base px-6 py-2"
                  onClick={() => {
                    setShowRegister(false);
                    setShowForm(true);
                    setError('');
                  }}
                >
                  Login to Your Account
                </Button>
                <Button 
                  variant="primary"
                  className="text-base px-6 py-2"
                  onClick={() => {
                    setShowRegister(true);
                    setShowForm(true);
                    setError('');
                  }}
                >
                  Create New Account
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="bg-gray-900 text-gray-400 py-8 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <p>&copy; 2025 Gyani Auto Database. All rights reserved.</p>
            </div>
          </footer>
        </div>
      ) : (
        // Login/Register Form Section
        <div className="min-h-screen bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <button
              onClick={() => setShowForm(false)}
              className="text-blue-600 hover:underline text-sm font-medium mb-4"
            >
              ← Back to Home
            </button>
            
            <h1 className="text-3xl font-bold text-center mb-2">Company Portal</h1>
            <p className="text-center text-gray-600 text-sm mb-8">Manage your auto assignments</p>
            
            {error && <ErrorAlert message={error} />}

            {!showRegister ? (
              <form onSubmit={handleLogin}>
                <Input
                  type="email"
                  placeholder="Email"
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="Password"
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
                <p className="text-center text-sm text-gray-600 mt-4">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setShowRegister(true);
                      setError('');
                    }}
                    className="text-green-600 hover:underline font-medium"
                  >
                    Register
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">Fill in your company details</p>
                
                <Input
                  type="text"
                  placeholder="Company Name"
                  label="Company Name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
                <Input
                  type="text"
                  placeholder="Contact Person"
                  label="Contact Person"
                  value={regContactPerson}
                  onChange={(e) => setRegContactPerson(e.target.value)}
                  required
                />
                <Input
                  type="email"
                  placeholder="Email"
                  label="Email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
                <Input
                  type="tel"
                  placeholder="Phone Number"
                  label="Phone Number"
                  value={regPhoneNumber}
                  onChange={(e) => setRegPhoneNumber(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  label="Password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />

                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Initial Request (Optional)</p>
                  
                  <Input
                    type="number"
                    placeholder="Autos Required"
                    label="Autos Required"
                    value={regAutosRequired}
                    onChange={(e) => setRegAutosRequired(e.target.value)}
                    min="0"
                  />
                  <Input
                    type="number"
                    placeholder="Days Required"
                    label="Days Required"
                    value={regDaysRequired}
                    onChange={(e) => setRegDaysRequired(e.target.value)}
                    min="0"
                  />
                  <Input
                    type="date"
                    label="Start Date"
                    value={regStartDate}
                    onChange={(e) => setRegStartDate(e.target.value)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Area
                    </label>
                    <select
                      value={regAreaId}
                      onChange={(e) => setRegAreaId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Any Area</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Registering...' : 'Register'}
                </Button>
                <p className="text-center text-sm text-gray-600 mt-4">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setShowRegister(false);
                      setError('');
                    }}
                    className="text-green-600 hover:underline font-medium"
                  >
                    Login
                  </button>
                </p>
              </form>
            )}

            <div className="mt-6 pt-6 border-t text-sm text-gray-600">
              <p className="text-center">
                <Link to="/login" className="text-green-600 hover:underline font-medium">
                  ← Back to Admin Panel
                </Link>
              </p>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default CompanyLoginPage;
