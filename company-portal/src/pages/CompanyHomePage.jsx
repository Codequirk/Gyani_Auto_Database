import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/UI';

const CompanyHomePage = () => {
  const navigate = useNavigate();

  return (
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
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
              <Button 
                variant="primary"
                className="text-sm px-3 py-1"
                onClick={() => navigate('/login')}
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
        <div className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-12 mb-16">
          <h3 className="text-3xl font-bold text-white mb-4">Ready to Start Advertising?</h3>
          <p className="text-lg text-blue-100 mb-8">
            Join hundreds of companies already using our platform to grow their business
          </p>
          <div className="space-x-4">
            <Button 
              variant="secondary"
              className="text-base px-6 py-2"
              onClick={() => navigate('/login')}
            >
              Login to Your Account
            </Button>
            <Button 
              variant="primary"
              className="text-base px-6 py-2 bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => navigate('/login')}
            >
              Create New Account
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
            <p className="text-gray-600">Active Vehicles</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">50K+</div>
            <p className="text-gray-600">Daily Impressions</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">100+</div>
            <p className="text-gray-600">Happy Clients</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">95%</div>
            <p className="text-gray-600">Satisfaction Rate</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2025 Gyani Auto Database. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default CompanyHomePage;
