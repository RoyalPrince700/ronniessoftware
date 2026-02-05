import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Package, User, RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react';

const StockHistory = () => {
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    productId: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 20
  });

  useEffect(() => {
    fetchProducts();
    fetchStockHistory();
  }, []);

  useEffect(() => {
    fetchStockHistory();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/admin/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchStockHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.productId) params.append('productId', filters.productId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await axios.get(`/api/admin/stock-history?${params}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching stock history:', error);
      setError('Failed to load stock history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'added': return 'text-green-600 bg-green-100';
      case 'sold': return 'text-blue-600 bg-blue-100';
      case 'adjusted': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount) => {
    return `₦${amount.toLocaleString()}`;
  };

  if (loading && !data) {
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
            onClick={fetchStockHistory}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Stock History</h1>
        <button
          onClick={fetchStockHistory}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            <select
              value={filters.productId}
              onChange={(e) => handleFilterChange('productId', e.target.value)}
              className="input-field"
            >
              <option value="">All Products</option>
              {products.map(product => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

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
              Per Page
            </label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', e.target.value)}
              className="input-field"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Package className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm text-gray-600">
                Showing {data.stockHistory.length} of {data.pagination.totalItems} entries
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Page {data.pagination.currentPage} of {data.pagination.totalPages}
          </div>
        </div>
      </div>

      {/* Stock History Table */}
      <div className="card">
        {data.stockHistory.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No stock history found for the selected filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Action</th>
                    <th>Quantity</th>
                    <th>Stock Change</th>
                    <th>Performed By</th>
                    <th>Related Sale</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stockHistory.map((entry, index) => (
                    <tr key={index}>
                      <td>
                        <div>
                          <p className="font-medium">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(entry.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div>
                          <p className="font-medium">{entry.productName}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            {entry.product?.category || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getActionColor(entry.action)}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="font-medium">
                        {entry.quantity} {entry.unit}
                      </td>
                      <td>
                        <div className="text-sm">
                          <p className="text-gray-500">
                            Before: {entry.previousStock} {entry.unit}
                          </p>
                          <p className="font-medium">
                            After: {entry.newStock} {entry.unit}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span>{entry.performedBy?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td>
                        {entry.sale ? (
                          <div>
                            <p className="font-medium text-blue-600">
                              #{entry.sale.saleNumber}
                            </p>
                            <p className="text-xs text-gray-500">
                              {entry.sale.customerName}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td>
                        <span className="text-sm text-gray-600">
                          {entry.notes || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Showing {((data.pagination.currentPage - 1) * data.pagination.itemsPerPage) + 1} to{' '}
                  {Math.min(data.pagination.currentPage * data.pagination.itemsPerPage, data.pagination.totalItems)} of{' '}
                  {data.pagination.totalItems} entries
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(data.pagination.currentPage - 1)}
                    disabled={data.pagination.currentPage === 1}
                    className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(
                        data.pagination.totalPages - 4,
                        data.pagination.currentPage - 2
                      )) + i;

                      if (pageNum > data.pagination.totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 rounded ${
                            pageNum === data.pagination.currentPage
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(data.pagination.currentPage + 1)}
                    disabled={data.pagination.currentPage === data.pagination.totalPages}
                    className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StockHistory;