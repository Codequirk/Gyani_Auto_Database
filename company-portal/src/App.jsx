import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CompanyAuthProvider, useCompanyAuth } from './context/CompanyAuthContext';
import CompanyHomePage from './pages/CompanyHomePage';
import RegisterEmailPage from './pages/RegisterEmailPage';
import VerifyOTPPage from './pages/VerifyOTPPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import CompanyLoginPage from './pages/CompanyLoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CompanyDashboardPage from './pages/CompanyDashboardPage';
import AutoDetailPage from './pages/AutoDetailPage';
import './App.css';

function CompanyProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useCompanyAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppContent() {
  return (
    <Routes>
      {/* Company Portal Routes Only */}
      <Route path="/" element={<CompanyHomePage />} />
      
      {/* NEW AUTH REGISTRATION FLOW ROUTES */}
      <Route path="/register" element={<RegisterEmailPage />} />
      <Route path="/verify-otp" element={<VerifyOTPPage />} />
      <Route path="/complete-profile" element={<CompleteProfilePage />} />
      <Route path="/company-login" element={<CompanyLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* LEGACY ROUTES - For backward compatibility */}
      <Route path="/login" element={<CompanyLoginPage />} />
      
      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <CompanyProtectedRoute>
            <CompanyDashboardPage />
          </CompanyProtectedRoute>
        }
      />
      <Route
        path="/autos/:id"
        element={
          <CompanyProtectedRoute>
            <AutoDetailPage />
          </CompanyProtectedRoute>
        }
      />

      {/* Default Route */}
      <Route path="/*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <CompanyAuthProvider>
        <AppContent />
      </CompanyAuthProvider>
    </Router>
  );
}

export default App;
