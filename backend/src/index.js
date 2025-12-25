require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB } = require('./models/db');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const areaRoutes = require('./routes/areaRoutes');
const autoRoutes = require('./routes/autoRoutes');
const companyRoutes = require('./routes/companyRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const companyAuthRoutes = require('./routes/companyAuthRoutes');
const companyPortalRoutes = require('./routes/companyPortalRoutes');
const companyTicketRoutes = require('./routes/companyTicketRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Connect to MongoDB
connectDB();

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
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
