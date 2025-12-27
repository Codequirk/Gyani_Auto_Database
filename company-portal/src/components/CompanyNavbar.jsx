import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompanyAuth } from '../context/CompanyAuthContext';

const CompanyNavbar = () => {
  const { company, logout } = useCompanyAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-teal-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="text-2xl font-bold">
              Company Portal
            </Link>
            <div className="hidden md:flex ml-8 space-x-4">
              <Link to="/dashboard" className="hover:bg-teal-700 px-3 py-2 rounded">
                Dashboard
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="hover:bg-teal-700 px-3 py-2 rounded"
            >
              {company?.name || 'Company'} ▼
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded shadow-lg z-50 top-full bg-white text-gray-900">
                <Link
                  to="/dashboard"
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 border-t hover:bg-gray-100"
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

export default CompanyNavbar;
