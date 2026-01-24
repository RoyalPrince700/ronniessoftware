const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ronniesfabrics')
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// If older deployments created a unique `username` index, drop it.
// We no longer use/store usernames, and the old index can block new signups/logins.
mongoose.connection.on('connected', async () => {
  try {
    const usersCollection = mongoose.connection.db.collection('users');
    const indexes = await usersCollection.indexes();
    const usernameIndexes = indexes.filter((idx) => idx.key && Object.prototype.hasOwnProperty.call(idx.key, 'username'));

    for (const idx of usernameIndexes) {
      await usersCollection.dropIndex(idx.name);
    }
  } catch (error) {
    // Best-effort cleanup only; ignore if collection/index doesn't exist.
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/staff', require('./routes/staff'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Ronnie\'s Fabrics API is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});