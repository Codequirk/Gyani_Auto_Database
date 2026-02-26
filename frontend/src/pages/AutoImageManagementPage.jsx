import React from 'react';
import Navbar from '../components/Navbar';
import AutoImageManagement from '../components/AutoImageManagement';

const AutoImageManagementPage = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6">
        <AutoImageManagement />
      </div>
    </div>
  );
};

export default AutoImageManagementPage;
