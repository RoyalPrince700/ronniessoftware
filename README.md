# Ronnie's Fabrics Software

A comprehensive fabric inventory management system built with the MERN stack (MongoDB, Express.js, React, Node.js) for Ronnie's Fabrics business.

## Features

### Admin Dashboard
- **Stock Management**: Add new fabric products (ankara, german wool, cotton, silk, etc.) with quantities in yards/meters
- **Inventory Tracking**: Monitor current stock levels and track daily progress
- **Low Stock Alerts**: Get notifications when stock falls below minimum levels
- **Sales Reports**: View detailed sales analytics and transaction history
- **User Management**: Create and manage staff accounts
- **Stock History**: Track all stock changes and movements

### Staff Dashboard
- **Sales Processing**: Create sales transactions by selecting fabrics and quantities
- **Receipt Generation**: Automatically generate and print receipts for customers
- **Real-time Stock Updates**: Stock levels update immediately after each sale
- **Customer Management**: Record customer details for each transaction
- **Daily Sales Summary**: View today's sales performance

## Tech Stack

- **Frontend**: React 18, JSX, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Authentication**: JWT (JSON Web Tokens) with role-based access
- **UI Components**: Custom components with Tailwind CSS styling

## Project Structure

```
ronniesfabricssoftware/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Sale.js
│   │   └── StockHistory.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── admin.js
│   │   └── staff.js
│   ├── middleware/
│   │   └── auth.js
│   ├── utils/
│   │   └── jwt.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── AdminLayout.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   └── ... (other admin components)
│   │   │   ├── staff/
│   │   │   │   ├── StaffLayout.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Sales.tsx
│   │   │   │   └── Receipt.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── ... (other components)
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ronniesfabricssoftware
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

   Create a `.env` file in the backend directory:
   ```
   MONGODB_URI=mongodb://localhost:27017/ronniesfabrics
   JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
   PORT=5000
   NODE_ENV=development
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the Application**

   **Backend:**
   ```bash
   cd backend
   npm run dev
   ```

   **Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

### Default Login Credentials

After starting the application, you'll need to create an admin user. You can do this by:

1. Temporarily modifying the backend code to create an admin user, or
2. Using MongoDB directly to insert an admin user, or
3. Adding a setup script

Example admin user creation (run this in MongoDB):
```javascript
db.users.insertOne({
  username: "admin",
  email: "admin@ronniesfabrics.com",
  password: "$2a$10$...", // bcrypt hash of "admin123"
  role: "admin",
  name: "Administrator",
  isActive: true
})
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (admin only)
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/change-password` - Change password

### Admin Routes (require admin role)
- `GET /api/admin/dashboard` - Dashboard overview
- `GET /api/admin/products` - Get all products
- `POST /api/admin/products` - Add new product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/stock-history` - Stock history
- `GET /api/admin/sales-report` - Sales reports
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/status` - Update user status

### Staff Routes (require staff/admin role)
- `GET /api/staff/products` - Get available products
- `GET /api/staff/products/search` - Search products
- `POST /api/staff/sales` - Create new sale
- `GET /api/staff/sales` - Get staff sales
- `GET /api/staff/sales/:id/receipt` - Get sale receipt
- `GET /api/staff/dashboard` - Staff dashboard

## Database Models

### User
- username, email, password, role (admin/staff), name, isActive

### Product
- name, category, description, totalStock, currentStock, unit, pricePerUnit, minStockLevel

### Sale
- saleNumber, customerName, customerPhone, items, totalAmount, discount, finalAmount, paymentMethod, soldBy

### StockHistory
- product, action (added/sold/adjusted), quantity, previousStock, newStock, performedBy

## Security Features

- JWT authentication with expiration
- Role-based access control (admin vs staff)
- Password hashing with bcrypt
- Protected API routes
- Input validation and sanitization

## Future Enhancements

- [ ] Barcode scanning for products
- [ ] Email notifications for low stock
- [ ] Advanced reporting and analytics
- [ ] Mobile app version
- [ ] Multi-location support
- [ ] Supplier management
- [ ] Customer loyalty program
- [ ] Inventory forecasting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please contact the development team.