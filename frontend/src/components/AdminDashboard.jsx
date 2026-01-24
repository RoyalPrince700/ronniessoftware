import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import ProductManagement from './admin/ProductManagement';
import StockHistory from './admin/StockHistory';
import SalesReport from './admin/SalesReport';
import UserManagement from './admin/UserManagement';

const AdminDashboard = () => {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<ProductManagement />} />
        <Route path="stock-history" element={<StockHistory />} />
        <Route path="sales-report" element={<SalesReport />} />
        <Route path="users" element={<UserManagement />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminDashboard;