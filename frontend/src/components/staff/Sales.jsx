import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Minus, Search, Printer } from 'lucide-react';

const Sales = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saleCompleted, setSaleCompleted] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/staff/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.productId === product._id);

    if (existingItem) {
      if (existingItem.quantity >= product.currentStock) {
        alert('Insufficient stock!');
        return;
      }
      updateCartItem(product._id, existingItem.quantity + 1);
    } else {
      const cartItem = {
        productId: product._id,
        product,
        quantity: 1,
        unitPrice: product.pricePerUnit,
        totalPrice: product.pricePerUnit
      };
      setCart([...cart, cartItem]);
    }
  };

  const updateCartItem = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.productId === productId) {
        const product = item.product;
        if (quantity > product.currentStock) {
          alert('Insufficient stock!');
          return item;
        }
        return {
          ...item,
          quantity,
          totalPrice: quantity * item.unitPrice
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const getFinalAmount = () => {
    return Math.max(0, getTotalAmount() - discount);
  };

  const handleSale = async () => {
    if (cart.length === 0) {
      alert('Please add items to cart');
      return;
    }

    if (!customerName.trim()) {
      alert('Please enter customer name');
      return;
    }

    setLoading(true);

    try {
      const saleData = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        discount,
        paymentMethod
      };

      const response = await axios.post('/api/staff/sales', saleData);
      const { sale } = response.data;

      setSaleCompleted(sale._id);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscount(0);

      // Navigate to receipt
      navigate(`/staff/receipt/${sale._id}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Sale failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products Section */}
      <div className="lg:col-span-2">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Products</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 w-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {filteredProducts.map((product) => (
              <div key={product._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{product.category}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    product.currentStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.currentStock} {product.unit}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">₦{product.pricePerUnit.toLocaleString()}</span>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.currentStock <= 0}
                    className="btn-primary text-sm px-3 py-1 disabled:opacity-50"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cart</h2>

          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No items in cart</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between border-b pb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product.name}</p>
                    <p className="text-xs text-gray-500">₦{item.unitPrice.toLocaleString()} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateCartItem(item.productId, item.quantity - 1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItem(item.productId, item.quantity + 1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="font-semibold ml-2">₦{item.totalPrice.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Details */}
        <div className="card">
          <h3 className="text-md font-semibold text-gray-900 mb-3">Customer Details</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Customer Name *"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="input-field"
              required
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        {/* Payment Details */}
        <div className="card">
          <h3 className="text-md font-semibold text-gray-900 mb-3">Payment</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₦{getTotalAmount().toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm">Discount:</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="input-field flex-1"
              />
            </div>
            <div className="flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <span>₦{getFinalAmount().toLocaleString()}</span>
            </div>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="input-field"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>

        {/* Complete Sale Button */}
        <button
          onClick={handleSale}
          disabled={cart.length === 0 || loading}
          className="btn-primary w-full flex items-center justify-center disabled:opacity-50"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <Printer className="mr-2 h-5 w-5" />
              Complete Sale & Print Receipt
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sales;