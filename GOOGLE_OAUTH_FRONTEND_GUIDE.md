# Google OAuth - Frontend Integration Guide

## Overview

Complete frontend implementation for Google OAuth and email/password authentication.

---

## Part 1: Install Dependencies

```bash
cd frontend
npm install @react-oauth/google axios
```

**Packages:**
- `@react-oauth/google`: React component for Google login
- `axios`: HTTP client (likely already installed)

---

## Part 2: Environment Variables

Create/Update `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

For production:

```env
VITE_API_URL=https://api.yourdomain.com
VITE_GOOGLE_CLIENT_ID=your_production_client_id.apps.googleusercontent.com
```

---

## Part 3: API Service Setup

Update `frontend/src/services/api.js`:

```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Part 4: Auth Service

Create `frontend/src/services/authService.js`:

```javascript
import api from './api';

const authService = {
  // Local authentication
  async register(email, password, contact_person, company_name, phone_number) {
    const response = await api.post('/auth/register', {
      email,
      password,
      contact_person,
      company_name,
      phone_number,
    });
    return response.data;
  },

  async login(email, password) {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    
    return response.data;
  },

  // Google OAuth
  getGoogleAuthUrl() {
    return `${import.meta.env.VITE_API_URL}/api/auth/google`;
  },

  // Profile management
  async completeProfile(company_name, phone_number, contact_person) {
    const response = await api.post('/auth/complete-profile', {
      company_name,
      phone_number,
      contact_person,
    });
    
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  async refreshToken() {
    const response = await api.post('/auth/refresh');
    
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    
    return response.data;
  },

  logout() {
    localStorage.removeItem('auth_token');
    // Optional: Call server for cleanup
    api.post('/auth/logout').catch(console.error);
  },

  // Helper methods
  getToken() {
    return localStorage.getItem('auth_token');
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  setToken(token) {
    localStorage.setItem('auth_token', token);
  },
};

export default authService;
```

---

## Part 5: Login Page Component

Create `frontend/src/pages/LoginPage.jsx`:

```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

export function LoginPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    contact_person: '',
    company_name: '',
    phone_number: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLocalAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login
        await authService.login(formData.email, formData.password);
        navigate('/dashboard');
      } else {
        // Register
        await authService.register(
          formData.email,
          formData.password,
          formData.contact_person,
          formData.company_name,
          formData.phone_number
        );
        navigate('/complete-profile');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = authService.getGoogleAuthUrl();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <h1 className="text-3xl font-bold text-center mb-2">Gyani Auto</h1>
        <p className="text-center text-gray-600 mb-8">
          {isLogin ? 'Sign in to your account' : 'Create a new account'}
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLocalAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {!isLogin && (
              <p className="mt-1 text-xs text-gray-500">
                Min 8 characters, uppercase, lowercase, number
              </p>
            )}
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required={!isLogin}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  placeholder="Acme Inc"
                  required={!isLogin}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  placeholder="+1234567890"
                  required={!isLogin}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-3 text-gray-500 text-sm">OR</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleAuth}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          <img
            src="https://www.gstatic.com/firebaseapp/v8.2.10/images/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          <span>Continue with Google</span>
        </button>

        {/* Toggle */}
        <p className="mt-6 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setFormData({
                email: '',
                password: '',
                contact_person: '',
                company_name: '',
                phone_number: '',
              });
            }}
            className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
```

---

## Part 6: Complete Profile Page

Create `frontend/src/pages/CompleteProfilePage.jsx`:

```javascript
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../services/authService';

export function CompleteProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    company_name: '',
    phone_number: '',
    contact_person: '',
  });

  useEffect(() => {
    // Check if user has a valid token
    if (!authService.isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.completeProfile(
        formData.company_name,
        formData.phone_number,
        formData.contact_person
      );
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">Complete Profile</h1>
        <p className="text-center text-gray-600 mb-8">
          Just a few more details to get started
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person
            </label>
            <input
              type="text"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleInputChange}
              placeholder="Your name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              name="company_name"
              value={formData.company_name}
              onChange={handleInputChange}
              placeholder="Your company"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleInputChange}
              placeholder="+1234567890"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Complete Profile'}
          </button>
        </form>

        <button
          onClick={authService.logout}
          className="mt-4 w-full text-center text-gray-600 hover:text-gray-700 text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
```

---

## Part 7: Protected Route Component

Create `frontend/src/components/ProtectedRoute.jsx`:

```javascript
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

export function ProtectedRoute({ children }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

---

## Part 8: Update App Router

Update `frontend/src/App.jsx`:

```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { CompleteProfilePage } from './pages/CompleteProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import authService from './services/authService';

function App() {
  useEffect(() => {
    // Check URL for Google OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const success = urlParams.get('success');

    if (token && success === 'true') {
      authService.setToken(token);
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.href = '/dashboard';
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## Part 9: Handle OAuth Callback

For redirect-based OAuth flow, the backend redirects with token in URL:

```javascript
// When user comes back from Google OAuth
// URL: http://localhost:3000/?token=jwt_token&success=true

// App.jsx useEffect captures and stores it
const token = new URLSearchParams(window.location.search).get('token');
if (token) {
  localStorage.setItem('auth_token', token);
  window.location.href = '/dashboard';
}
```

---

## Part 10: Testing Checklist

- [ ] User can register with email/password
- [ ] Password validation works (min 8 chars, uppercase, lowercase, number)
- [ ] User cannot login until profile is complete
- [ ] User can click "Continue with Google"
- [ ] Redirected to Google login
- [ ] After Google approval, redirected back to app
- [ ] Token is saved in localStorage
- [ ] User can access dashboard with token
- [ ] User can complete profile
- [ ] User can logout
- [ ] Token is cleared on logout
- [ ] Cannot access protected routes without token
- [ ] Token refresh works

---

## Common Issues

### Issue: "CORS error on Google button"

**Solution:**
Make sure backend has CORS enabled:

```javascript
// backend/src/index.js
const cors = require('cors');
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
```

### Issue: "Token not being stored"

**Solution:**
Check localStorage in browser DevTools:
```javascript
// In console
localStorage.getItem('auth_token')
```

### Issue: "API calls not including token"

**Solution:**
Verify axios interceptor in `api.js`:
```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## Summary

✅ Login page with email/password and Google OAuth  
✅ Complete profile page for new users  
✅ Protected routes requiring authentication  
✅ Token management (store, refresh, delete)  
✅ API integration with axios  
✅ Error handling and user feedback  

Good luck! 🚀
