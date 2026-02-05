import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Users, DollarSign, ShoppingCart, RefreshCw } from 'lucide-react';

const SalesReport = () => {
  const [data, setData] = useState(null);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    staffId: ''
  });

  useEffect(() => {
    fetchStaffMembers();
    fetchSalesReport();
  }, []);

  useEffect(() => {
    fetchSalesReport();
  }, [filters]);

  const fetchStaffMembers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      // Filter only active staff members
      const staff = response.data.filter(user => user.role === 'staff' && user.isActive);
      setStaffMembers(staff);
    } catch (error) {
      console.error('Error fetching staff members:', error);
    }
  };

  const fetchSalesReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.staffId) params.append('staffId', filters.staffId);

      const response = await axios.get(`/api/admin/sales-report?${params}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching sales report:', error);
      setError('Failed to load sales report');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const groupSalesByStaff = (sales) => {
    const staffSales = {};

    sales.forEach(sale => {
      const staffId = sale.soldBy?._id || 'unknown';
      const staffName = sale.soldBy?.name || 'Unknown Staff';

      if (!staffSales[staffId]) {
        staffSales[staffId] = {
          name: staffName,
          totalSales: 0,
          totalAmount: 0,
          sales: []
        };
      }

      staffSales[staffId].sales.push(sale);
      staffSales[staffId].totalSales += 1;
      staffSales[staffId].totalAmount += sale.finalAmount;
    });

    return Object.values(staffSales);
  };

  const formatCurrency = (amount) => {
    return `₦${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchSalesReport}
            className="btn-primary mt-4"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-500">
        No data available
      </div>
    );
  }

  const staffSummary = groupSalesByStaff(data.sales);
  const activeStaffCount = staffSummary.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
        <button
          onClick={fetchSalesReport}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff Member
            </label>
            <select
              value={filters.staffId}
              onChange={(e) => handleFilterChange('staffId', e.target.value)}
              className="input-field"
            >
              <option value="">All Staff</option>
              {staffMembers.length === 0 ? (
                <option disabled>No staff members available</option>
              ) : (
                staffMembers.map(staff => (
                  <option key={staff._id} value={staff._id}>
                    {staff.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.summary.totalSales)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.summary.totalTransactions}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Staff</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeStaffCount}
              </p>
              <p className="text-xs text-gray-500">made sales</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-indigo-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Sale</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.summary.averageSale)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Performance Summary */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Staff Performance</h2>
        {staffSummary.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No sales data found for the selected period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Total Sales</th>
                  <th>Number of Transactions</th>
                  <th>Average per Sale</th>
                </tr>
              </thead>
              <tbody>
                {staffSummary.map((staff, index) => (
                  <tr key={index}>
                    <td className="font-medium">{staff.name}</td>
                    <td className="font-semibold text-green-600">
                      {formatCurrency(staff.totalAmount)}
                    </td>
                    <td>{staff.totalSales}</td>
                    <td>
                      {formatCurrency(staff.totalSales > 0 ? staff.totalAmount / staff.totalSales : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Sales Transactions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Transactions</h2>
        {data.sales.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No transactions found for the selected period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Sale #</th>
                  <th>Date</th>
                  <th>Staff Member</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {data.sales.map((sale, index) => (
                  <tr key={index}>
                    <td className="font-medium">{sale.saleNumber}</td>
                    <td>{new Date(sale.saleDate).toLocaleDateString()}</td>
                    <td>{sale.soldBy?.name || 'Unknown Staff'}</td>
                    <td>
                      <div>
                        <p className="font-medium">{sale.customerName}</p>
                        {sale.customerPhone && (
                          <p className="text-sm text-gray-500">{sale.customerPhone}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        {sale.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="text-sm">
                            <span className="font-medium">{item.productName}</span>
                            <span className="text-gray-500 ml-2">
                              ({item.quantity} {item.unit} × {formatCurrency(item.unitPrice)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="font-semibold text-green-600">
                      {formatCurrency(sale.finalAmount)}
                    </td>
                    <td className="capitalize">{sale.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesReport;