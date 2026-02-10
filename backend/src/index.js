console.log('[STARTUP] Beginning backend startup...');

const path = require('path');
const fs = require('fs');
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
const advertisementRoutes = require('./routes/advertisementRoutes');
const autoMonthlyPaymentRoutes = require('./routes/autoMonthlyPaymentRoutes');
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
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve company portal frontend (must be BEFORE API routes so /api routes take precedence)
const companyPortalPath = path.join(__dirname, '../../company-portal/dist');
console.log(`[STARTUP] Company portal path: ${companyPortalPath}`);
app.use('/company-portal', express.static(companyPortalPath));

// Serve company portal at root /company path with SPA routing
app.use('/company', express.static(companyPortalPath));
app.get('/company/*', (req, res) => {
  res.sendFile(path.join(companyPortalPath, 'index.html'));
});

// Admin Routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/autos', autoRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/auto-monthly-payments', autoMonthlyPaymentRoutes);

// Company Routes
app.use('/api/company-auth', companyAuthRoutes);
app.use('/api/company-portal', companyPortalRoutes);
app.use('/api/company-tickets', companyTicketRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Error handling middleware
app.use(errorHandler);

// SPA routing fallback - MUST be at the end after all other routes
// Serves index.html for any non-API, non-static file routes
app.get('*', (req, res) => {
  const indexPath = path.join(companyPortalPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      error: 'Company portal not found. Run: npm run build in company-portal directory' 
    });
  }
});

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
