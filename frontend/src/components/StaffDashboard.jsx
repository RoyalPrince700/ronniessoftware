import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StaffLayout from './staff/StaffLayout';
import Dashboard from './staff/Dashboard';
import Sales from './staff/Sales';
import Receipt from './staff/Receipt';

const StaffDashboard = () => {
  return (
    <StaffLayout>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="sales" element={<Sales />} />
        <Route path="receipt/:saleId" element={<Receipt />} />
      </Routes>
    </StaffLayout>
  );
};

export default StaffDashboard;