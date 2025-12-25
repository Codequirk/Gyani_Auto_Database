import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';

const CompanyAuthContext = createContext(null);

export const CompanyAuthProvider = ({ children }) => {
  const [company, setCompany] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('company_auth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify token on mount by making a test request
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('company_auth_token');
      const storedCompanyData = localStorage.getItem('company_data');
      
      if (storedToken && storedCompanyData) {
        try {
          const companyData = JSON.parse(storedCompanyData);
          
          // Set the authorization header BEFORE making the API call
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // Try to fetch company profile to verify token is valid
          await api.get(`/company-portal/${companyData.id}/profile`);
          setCompany(companyData);
          setToken(storedToken);
          setLoading(false);
        } catch (error) {
          // Token is invalid, clear it
          console.warn('Company token validation failed, clearing auth');
          localStorage.removeItem('company_auth_token');
          localStorage.removeItem('company_data');
          delete api.defaults.headers.common['Authorization'];
          setToken(null);
          setCompany(null);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = useCallback((companyData, newToken) => {
    setCompany(companyData);
    setToken(newToken);
    setLoading(false);
    localStorage.setItem('company_auth_token', newToken);
    localStorage.setItem('company_data', JSON.stringify(companyData));
    
    // Update axios header for company requests
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  }, []);

  const logout = useCallback(() => {
    setCompany(null);
    setToken(null);
    localStorage.removeItem('company_auth_token');
    localStorage.removeItem('company_data');
    delete api.defaults.headers.common['Authorization'];
  }, []);

  const refreshCompanyStatus = useCallback(async () => {
    if (!company) return false;
    
    try {
      // Fetch the latest company data from backend
      const response = await api.get(`/company-portal/${company.id}/profile`);
      const updatedCompany = response.data;
      
      // Update state and localStorage
      setCompany(updatedCompany);
      localStorage.setItem('company_data', JSON.stringify(updatedCompany));
      
      return true;
    } catch (error) {
      console.error('Failed to refresh company status:', error);
      return false;
    }
  }, [company]);

  const value = {
    company,
    token,
    login,
    logout,
    refreshCompanyStatus,
    isAuthenticated: !!token,
    loading,
  };

  return <CompanyAuthContext.Provider value={value}>{children}</CompanyAuthContext.Provider>;
};

export const useCompanyAuth = () => {
  const context = useContext(CompanyAuthContext);
  if (!context) {
    throw new Error('useCompanyAuth must be used within CompanyAuthProvider');
  }
  return context;
};
