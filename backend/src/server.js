const app = require('./app');
const { PORT } = require('./config/env');
const prisma = require('./config/prisma');

async function startServer() {
  try {
    // Verify PostgreSQL connection
    console.log('[Server] Connecting to PostgreSQL database...');
    await prisma.$connect();
    console.log('✅ [Server] PostgreSQL database connected successfully.');

    app.listen(PORT, () => {
      console.log(`🚀 [Server] MEIL ESG & BRSR Centralized Backend listening on http://localhost:${PORT}`);
      console.log(`📋 [Server] Health Check available at http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ [Server] Failed to connect to database or start server:', err);
    process.exit(1);
  }
}

startServer();
