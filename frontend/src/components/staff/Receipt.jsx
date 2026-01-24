import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Printer, ArrowLeft } from 'lucide-react';

const Receipt = () => {
  const { saleId } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (saleId) {
      fetchReceipt();
    }
  }, [saleId]);

  const fetchReceipt = async () => {
    try {
      const response = await axios.get(`/api/staff/sales/${saleId}/receipt`);
      setReceipt(response.data);
    } catch (error) {
      console.error('Error fetching receipt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!receipt) {
    return <div className="text-center text-gray-500">Receipt not found</div>;
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Print Button */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={() => window.history.back()}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        <button
          onClick={handlePrint}
          className="btn-primary flex items-center"
        >
          <Printer className="h-5 w-5 mr-2" />
          Print Receipt
        </button>
      </div>

      {/* Receipt */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 font-mono text-sm">
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
          <h1 className="text-xl font-bold text-gray-900">RONNIE'S FABRICS</h1>
          <p className="text-xs text-gray-600 mt-1">Fabric Inventory Management</p>
          <p className="text-xs text-gray-600">Quality Fabrics for Every Need</p>
        </div>

        {/* Sale Details */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span>Sale #:</span>
            <span className="font-bold">{receipt.saleNumber}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Date:</span>
            <span>{new Date(receipt.date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Time:</span>
            <span>{new Date(receipt.date).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span>Customer:</span>
            <span>{receipt.customer.name}</span>
          </div>
          {receipt.customer.phone && (
            <div className="flex justify-between mb-1">
              <span>Phone:</span>
              <span>{receipt.customer.phone}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="border-t border-b border-dashed border-gray-400 py-2 mb-4">
          <div className="font-bold mb-2">ITEMS PURCHASED</div>
          {receipt.items.map((item, index) => (
            <div key={index} className="mb-2">
              <div className="flex justify-between">
                <span className="font-medium">{item.productName}</span>
                <span>₦{item.totalPrice.toLocaleString()}</span>
              </div>
              <div className="text-xs text-gray-600 ml-4">
                {item.quantity} {item.unit} × ₦{item.unitPrice.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span>Subtotal:</span>
            <span>₦{receipt.totals.subtotal.toLocaleString()}</span>
          </div>
          {receipt.totals.discount > 0 && (
            <div className="flex justify-between mb-1">
              <span>Discount:</span>
              <span>-₦{receipt.totals.discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-1">
            <span>TOTAL:</span>
            <span>₦{receipt.totals.finalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-4">
          <div className="flex justify-between">
            <span>Payment:</span>
            <span className="capitalize">{receipt.paymentMethod}</span>
          </div>
        </div>

        {/* Staff */}
        <div className="mb-4">
          <div className="flex justify-between">
            <span>Served by:</span>
            <span>{receipt.soldBy}</span>
          </div>
        </div>

        {/* Notes */}
        {receipt.notes && (
          <div className="mb-4">
            <div className="text-xs">
              <span className="font-medium">Notes:</span> {receipt.notes}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center border-t-2 border-dashed border-gray-400 pt-4">
          <p className="text-xs text-gray-600">Thank you for shopping with us!</p>
          <p className="text-xs text-gray-600 mt-1">Quality fabrics guaranteed</p>
          <p className="text-xs text-gray-600 mt-2 font-bold">RONNIE'S FABRICS</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .bg-white {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Receipt;