import React from 'react';

export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow ${className}`}>
    {children}
  </div>
);

export const Button = ({ children, onClick, disabled = false, className = '', variant = 'primary', ...props }) => {
  const baseClass = 'px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClass = variant === 'primary' 
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : variant === 'danger'
    ? 'bg-red-600 text-white hover:bg-red-700'
    : 'bg-gray-300 text-gray-900 hover:bg-gray-400';
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseClass} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input = ({ label, placeholder, type = 'text', value, onChange, error = '', ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
        error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
      }`}
      {...props}
    />
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
);

export const ErrorAlert = ({ message }) => (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
    {message}
  </div>
);

export const SuccessAlert = ({ message }) => (
  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
    {message}
  </div>
);

export const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);
