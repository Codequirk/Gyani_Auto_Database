console.log('[STARTUP] Beginning backend startup...');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { startCleanupScheduler } = require('./services/cleanupService');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const areaRoutes = require('./routes/areaRoutes');
const autoRoutes = require('./routes/autoRoutes');
const companyRoutes = require('./routes/companyRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const companyAuthRoutes = require('./routes/companyAuthRoutes');
const companyPortalRoutes = require('./routes/companyPortalRoutes');
const companyTicketRoutes = require('./routes/companyTicketRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Admin Routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/autos', autoRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentRoutes);

// Company Routes
app.use('/api/company-auth', companyAuthRoutes);
app.use('/api/company-portal', companyPortalRoutes);
app.use('/api/company-tickets', companyTicketRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start cleanup scheduler
console.log('[DEBUG] About to start cleanup scheduler...');
try {
  // TEMPORARILY DISABLED FOR DEBUGGING
  // startCleanupScheduler();
  console.log('[DEBUG] Cleanup scheduler DISABLED for debugging');
} catch (err) {
  console.error('[ERROR] Failed to start cleanup scheduler:', err.message);
}

const PORT = 5001;  // Hardcoded for testing
console.log(`[DEBUG] About to start server on port ${PORT}...`);
console.log('[DEBUG] All error handlers registered');

// Handle uncaught exceptions BEFORE starting server
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

// Handle unhandled promise rejections BEFORE starting server
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on http://0.0.0.0:${PORT}`);
  console.log(`✓ Using PostgreSQL database`);
  console.log('[DEBUG] Server callback executed successfully');
});

// Keep the process alive
setImmediate(() => {
  console.log('[DEBUG] Process is alive and event loop is running');
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  console.error('Error code:', err.code);
  console.error(err.stack);
  if (err.code === 'EADDRINUSE') {
    console.error('Port 5001 is already in use!');
  }
  process.exit(1);
});

server.on('listening', () => {
  console.log('[DEBUG] ✅ Server is now actually listening on port 5001');
});

server.on('close', () => {
  console.log('[DEBUG] Server closed');
});

server.on('close', () => {
  console.log('[DEBUG] Server closed');
});

module.exports = app;
