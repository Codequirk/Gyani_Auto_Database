import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanyAuthProvider, useCompanyAuth } from './context/CompanyAuthContext';
import { DarkModeProvider, useDarkMode } from './context/DarkModeContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AutosPage from './pages/AutosPage';
import AutoDetailPage from './pages/AutoDetailPage';
import AddAutoPage from './pages/AddAutoPage';
import AdminsPage from './pages/AdminsPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import CompanyRequestsPage from './pages/CompanyRequestsPage';
import CompanyHomePage from './pages/CompanyHomePage';
import CompanyLoginPage from './pages/CompanyLoginPage';
import CompanyDashboardPage from './pages/CompanyDashboardPage';
import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return isAuthenticated ? children : <Navigate to="/login" />;
}

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

  return isAuthenticated ? children : <Navigate to="/company/login" />;
}

function AppContent() {
  return (
    <Routes>
            {/* Admin Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/autos"
              element={
                <ProtectedRoute>
                  <AutosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/autos/create"
              element={
                <ProtectedRoute>
                  <AddAutoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/autos/:id"
              element={
                <ProtectedRoute>
                  <AutoDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admins"
              element={
                <ProtectedRoute>
                  <AdminsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies"
              element={
                <ProtectedRoute>
                  <CompaniesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies/:companyId"
              element={
                <ProtectedRoute>
                  <CompanyDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company-requests"
              element={
                <ProtectedRoute>
                  <CompanyRequestsPage />
                </ProtectedRoute>
              }
            />

            {/* Company Routes */}
            <Route path="/company" element={<CompanyHomePage />} />
            <Route path="/company/login" element={<CompanyLoginPage />} />
            <Route
              path="/company/dashboard"
              element={
                <CompanyProtectedRoute>
                  <CompanyDashboardPage />
                </CompanyProtectedRoute>
              }
            />

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
  );
}

function DarkModeWrapper({ children }) {
  const { darkMode } = useDarkMode();
  
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CompanyAuthProvider>
          <DarkModeWrapper>
            <AppContent />
          </DarkModeWrapper>
        </CompanyAuthProvider>
      </AuthProvider>
    </Router>
  );
}

const AppWithProviders = () => {
  return (
    <DarkModeProvider>
      <App />
    </DarkModeProvider>
  );
};

export default AppWithProviders;
