const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Fail fast on missing critical security configurations
if (!process.env.JWT_SECRET) {
  throw new Error('[FATAL CONFIG ERROR] JWT_SECRET is missing. A strong secret must be provided via environment variables.');
}

if (!process.env.DATABASE_URL) {
  throw new Error('[FATAL CONFIG ERROR] DATABASE_URL is missing. PostgreSQL connection string must be provided via environment variables.');
}

const parsedOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'http://127.0.0.1:8080'];

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_ORIGIN: parsedOrigins,
  UPLOAD_DIR: path.resolve(__dirname, '../../uploads'),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
};
