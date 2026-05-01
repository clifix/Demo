const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

dotenv.config();

// Connect DB safely (prevents crash if DB fails)
connectDB().catch((err) => {
  console.error('❌ Database connection failed:', err.message);
});

const app = express();

// Middleware
app.use(cors({
  origin: '*', // for demo; later restrict this in production
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// Health check (Render uses this sometimes)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'CliFix API is running 🌱',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ SERVER ERROR:', err.stack || err.message || err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// IMPORTANT: Render requires this format
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Handle unhandled promise rejections (prevents crashes)
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  server.close(() => process.exit(1));
});