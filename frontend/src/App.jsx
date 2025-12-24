import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AutosPage from './pages/AutosPage';
import AutoDetailPage from './pages/AutoDetailPage';
import AddAutoPage from './pages/AddAutoPage';
import AdminsPage from './pages/AdminsPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
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
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
