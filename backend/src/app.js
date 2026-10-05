const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRouter = require('./routes/apiRouter');
const errorHandler = require('./middleware/errorHandler');
const { UPLOAD_DIR, FRONTEND_ORIGIN } = require('./config/env');
const prisma = require('./config/prisma');

const app = express();

// Strict CORS setup
const allowedOrigins = Array.isArray(FRONTEND_ORIGIN) ? FRONTEND_ORIGIN : [FRONTEND_ORIGIN];

app.use(cors({
  origin: (origin, callback) => {
    // Requests with no origin header (e.g. server-to-server or same-host requests)
    if (!origin) {
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('CORS request blocked: Origin header missing.'));
    }

    const isExplicitlyAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);
    const isDevLocalhost = process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'));

    if (isExplicitlyAllowed || isDevLocalhost) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy violation: Origin '${origin}' is not authorized.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Note: /uploads static exposure is REMOVED to protect sensitive evidence documents.
// Evidence files must be accessed exclusively via authenticated route: GET /api/evidence/:id/file

// Serve Frontend Static Files (root directory)
app.use(express.static(path.join(__dirname, '../../')));

// API Health Check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: 'UP',
      service: 'MEIL ESG & BRSR Central Enterprise API',
      database: 'PostgreSQL Connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'DOWN',
      database: 'Disconnected',
      error: err.message
    });
  }
});

// Mount Main API Router
app.use('/api', apiRouter);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
