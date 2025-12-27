import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CompanyAuthProvider, useCompanyAuth } from './context/CompanyAuthContext';
import { DarkModeProvider, useDarkMode } from './context/DarkModeContext';
import CompanyHomePage from './pages/CompanyHomePage';
import CompanyLoginPage from './pages/CompanyLoginPage';
import CompanyDashboardPage from './pages/CompanyDashboardPage';
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
      <Route path="/login" element={<CompanyLoginPage />} />
      <Route
        path="/dashboard"
        element={
          <CompanyProtectedRoute>
            <CompanyDashboardPage />
          </CompanyProtectedRoute>
        }
      />

      {/* Default Route */}
      <Route path="/*" element={<Navigate to="/" />} />
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
      <CompanyAuthProvider>
        <DarkModeWrapper>
          <AppContent />
        </DarkModeWrapper>
      </CompanyAuthProvider>
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
