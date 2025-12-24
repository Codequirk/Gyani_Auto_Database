import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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
              <Link to="/admins" className="hover:bg-blue-700 px-3 py-2 rounded">
                Admins
              </Link>
            </div>
          </div>

          <div className="flex items-center relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="hover:bg-blue-700 px-3 py-2 rounded"
            >
              {admin?.name || 'User'} ▼
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-gray-900 rounded shadow-lg z-50 top-full">
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
