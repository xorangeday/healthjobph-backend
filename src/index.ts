import 'dotenv/config';
import { createApp } from './app';
import { validateConfig } from './config';

// Validate environment variables
try {
  validateConfig();
} catch (error) {
  console.error('Configuration error:', error);
  process.exit(1);
}

const app = createApp();
const PORT = process.env.PORT || 3001;

const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           HealthJobsPH API Server Started                   ║
╠════════════════════════════════════════════════════════════╣
║  Port:        ${String(PORT).padEnd(43)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(43)}║
║  Health:      http://localhost:${PORT}/api/health${' '.repeat(18)}║
║  API v1:      http://localhost:${PORT}/api/v1${' '.repeat(21)}║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Keep connections alive for Render
server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
