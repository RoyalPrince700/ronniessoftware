import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/staff/dashboard');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-gray-500">Failed to load dashboard data</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
        <button
          onClick={fetchDashboardData}
          className="btn-secondary"
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Sales</p>
              <p className="text-2xl font-bold text-gray-900">₦{data.todaySummary.totalSales.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{data.todaySummary.totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Sale</p>
              <p className="text-2xl font-bold text-gray-900">₦{data.todaySummary.averageSale.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {data.lowStockAlerts.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Alerts</h2>
          <div className="space-y-2">
            {data.lowStockAlerts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-md">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-600">
                    Current: {product.currentStock} {product.unit} | Min: {product.minStockLevel} {product.unit}
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sales */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Sales</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Sale #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentSales.map((sale, index) => (
                <tr key={index}>
                  <td className="font-mono text-sm">{sale.saleNumber}</td>
                  <td>{sale.customerName}</td>
                  <td>₦{sale.finalAmount.toLocaleString()}</td>
                  <td>{new Date(sale.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;