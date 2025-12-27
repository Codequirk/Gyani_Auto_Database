import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Navbar = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending requests count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await api.get('/company-tickets/admin/all');
        const pendingRequests = response.data.filter(r => r.ticket_status === 'PENDING');
        setPendingCount(pendingRequests.length);
      } catch (err) {
        console.error('Failed to fetch pending requests:', err);
      }
    };

    fetchPendingCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="text-2xl font-bold">
              Admin Panel
            </Link>
            <div className="hidden md:flex ml-8 space-x-4">
              <Link to="/dashboard" className="hover:bg-blue-700 px-3 py-2 rounded">
                Dashboard
              </Link>
              <Link to="/autos" className="hover:bg-blue-700 px-3 py-2 rounded">
                Autos
              </Link>
              <Link to="/companies" className="hover:bg-blue-700 px-3 py-2 rounded">
                Companies
              </Link>
              <Link to="/company-requests" className="hover:bg-blue-700 px-3 py-2 rounded">
                Requests
              </Link>
              <Link to="/admins" className="hover:bg-blue-700 px-3 py-2 rounded">
                Admins
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => navigate('/company-requests')}
              className="hover:bg-blue-700 px-3 py-2 rounded relative text-lg"
              title="Company Requests"
            >
              🔔
              {pendingCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="hover:bg-blue-700 px-3 py-2 rounded"
            >
              {admin?.name || 'User'} ▼
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded shadow-lg z-50 top-full bg-white text-gray-900">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
